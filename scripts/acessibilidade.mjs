// npm run acessibilidade [-- --larguras=...] [--dist]
// Acessibilidade nas 9 larguras:
//   1. axe-core (regras WCAG 2.x A/AA + boas práticas): 0 violações sérias ou críticas
//   2. títulos: um único h1 e nenhum nível pulado (h1 → h2 → h3 → h4)
//   3. landmarks: <main> envolvendo as seções, <footer> fora dele
//   4. teclado (1474 e 390): percorre a página inteira com Tab e lista a ordem dos
//      elementos focáveis; cada um tem que ter foco VISÍVEL (contorno ou sombra que
//      aparece só com o foco)
//   5. texto com gradiente (background-clip: text): contraste medido na cor MAIS ESCURA
//      do gradiente contra o fundo real atrás do texto
// Falha (código 1) se qualquer item não passar.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, porLargura } from './comum.mjs'

const AXE = fs.readFileSync(path.join(RAIZ, 'node_modules/axe-core/axe.min.js'), 'utf8')
const larguras = lerLarguras()
const TECLADO = [1474, 390]
const problemas = []

const resultados = await porLargura(larguras, async ({ page, largura }) => {
  // rola até o fim para o que depende de rolagem estar no estado final
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)) } scrollTo(0, 0) })
  await page.waitForTimeout(300)
  await page.evaluate(AXE)
  const axe = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations', 'incomplete'] })
    const resumo = v => ({ id: v.id, impacto: v.impact, ajuda: v.help, nos: v.nodes.slice(0, 4).map(n => n.target.join(' ')) })
    return { violacoes: r.violations.map(resumo), incompletos: r.incomplete.map(resumo) }
  })

  const estrutura = await page.evaluate(() => {
    const titulos = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({ n: Number(h.tagName[1]), texto: h.textContent.trim().slice(0, 50), id: h.getAttribute('data-copy') }))
    const pulos = []
    for (let i = 1; i < titulos.length; i++) if (titulos[i].n > titulos[i - 1].n + 1) pulos.push(`${titulos[i - 1].id || 'h' + titulos[i - 1].n} (h${titulos[i - 1].n}) → ${titulos[i].id || titulos[i].texto} (h${titulos[i].n})`)
    const main = document.querySelectorAll('main')
    const secoesFora = [...document.querySelectorAll('section')].filter(s => !s.closest('main')).map(s => s.id)
    const footer = document.querySelector('footer')
    return {
      h1: titulos.filter(t => t.n === 1).length, pulos,
      sequencia: titulos.map(t => 'h' + t.n).join(' '),
      landmarks: { main: main.length, secoesFora, footerForaDoMain: !!footer && !footer.closest('main'), header: !!document.querySelector('header'), nav: document.querySelectorAll('nav').length },
    }
  })

  // gradiente: cor mais escura do background-image × fundo efetivo atrás do texto
  const gradientes = await page.evaluate(() => {
    const lum = ([r, g, b]) => { const c = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b) }
    const rgb = s => { const m = s.match(/[\d.]+/g).map(Number); return { c: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 } }
    const fundo = el => {
      for (let e = el.parentElement; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const x = rgb(b); if (x.a > 0.9) return x.c }
      return [0, 0, 0]
    }
    const out = []
    for (const el of document.querySelectorAll('*')) {
      const s = getComputedStyle(el)
      if (s.webkitBackgroundClip !== 'text' && s.backgroundClip !== 'text') continue
      if (!el.textContent.trim() || !el.getClientRects().length) continue
      // resolve as cores do gradiente pelo navegador (pode vir com var() já resolvido)
      const cores = (s.backgroundImage.match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/gi) || []).map(rgb).filter(x => x.a > 0)
      if (!cores.length) continue
      const bg = fundo(el)
      // cor efetiva de cada parada sobre o fundo (alfa composto)
      const efetivas = cores.map(x => x.c.map((v, i) => v * x.a + bg[i] * (1 - x.a)))
      const escura = efetivas.reduce((a, b) => (lum(a) <= lum(b) ? a : b))
      const L1 = lum(escura), L2 = lum(bg)
      const razao = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
      const tam = parseFloat(s.fontSize), peso = Number(s.fontWeight)
      const grande = tam >= 24 || (tam >= 18.66 && peso >= 700)
      out.push({ id: el.getAttribute('data-copy') || el.className, cor: `rgb(${escura.map(Math.round).join(', ')})`, fundo: `rgb(${bg.join(', ')})`, razao: +razao.toFixed(2), minimo: grande ? 3 : 4.5, tam: Math.round(tam) })
    }
    return out
  })

  let teclado = null
  if (TECLADO.includes(largura)) {
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0) })
    await page.mouse.click(2, 2) // foco no documento, sem clicar em nada focável
    const ordem = []
    const vistos = new Set()
    for (let i = 0; i < 120; i++) {
      await page.keyboard.press('Tab')
      const f = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const s = getComputedStyle(el)
        const comFoco = { o: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, sombra: s.boxShadow }
        // mesmo elemento sem foco, para comparar a sombra
        const clone = el.cloneNode(true); clone.style.position = 'absolute'; clone.style.left = '-9999px'
        el.parentElement.append(clone)
        const semFoco = getComputedStyle(clone).boxShadow
        clone.remove()
        const r = el.getBoundingClientRect()
        return {
          chave: el.outerHTML.slice(0, 120),
          nome: (el.getAttribute('data-copy') || el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('href') || el.tagName).slice(0, 60),
          tag: el.tagName.toLowerCase(),
          visivel: comFoco.o || comFoco.sombra !== semFoco,
          naTela: r.bottom > 0 && r.top < innerHeight,
          matches: el.matches(':focus-visible'),
        }
      })
      if (!f) break
      if (vistos.has(f.chave)) break
      vistos.add(f.chave)
      ordem.push(f)
    }
    teclado = ordem
  }
  return { largura, axe, estrutura, gradientes, teclado }
})

// ─── relatório ───
const md = ['# acessibilidade', '', `Gerado em ${new Date().toISOString()}`, '']
md.push('## axe-core', '', '| largura | sérias/críticas | outras violações | incompletos (revisar à mão) |', '| --- | --- | --- | --- |')
for (const r of resultados) {
  const graves = r.axe.violacoes.filter(v => ['serious', 'critical'].includes(v.impacto))
  const outras = r.axe.violacoes.filter(v => !['serious', 'critical'].includes(v.impacto))
  if (graves.length) problemas.push(...graves.map(v => `[${r.largura}] axe ${v.impacto}: ${v.id} — ${v.ajuda} · ${v.nos.join(' | ')}`))
  md.push(`| ${r.largura} | ${graves.length ? `**${graves.map(v => v.id).join(', ')}**` : '0'} | ${outras.map(v => `${v.id} (${v.impacto})`).join(', ') || '0'} | ${[...new Set(r.axe.incompletos.map(v => v.id))].join(', ') || '—'} |`)
}
const r0 = resultados[0]
md.push('', '## Títulos e landmarks', '', `- h1: ${r0.estrutura.h1} · sequência: ${r0.estrutura.sequencia}`, `- níveis pulados: ${r0.estrutura.pulos.join('; ') || 'nenhum'}`,
  `- <main>: ${r0.estrutura.landmarks.main} · seções fora do main: ${r0.estrutura.landmarks.secoesFora.join(', ') || 'nenhuma'} · <footer> fora do main: ${r0.estrutura.landmarks.footerForaDoMain ? 'sim' : 'NÃO'} · <header>: ${r0.estrutura.landmarks.header ? 'sim' : 'não (a página não tem cabeçalho, por decisão do dono)'} · <nav>: ${r0.estrutura.landmarks.nav}`)
for (const r of resultados) {
  if (r.estrutura.h1 !== 1) problemas.push(`[${r.largura}] ${r.estrutura.h1} h1 (tem que ser 1)`)
  if (r.estrutura.pulos.length) problemas.push(`[${r.largura}] nível de título pulado: ${r.estrutura.pulos.join('; ')}`)
  if (r.estrutura.landmarks.main !== 1 || r.estrutura.landmarks.secoesFora.length || !r.estrutura.landmarks.footerForaDoMain) problemas.push(`[${r.largura}] landmarks: ${JSON.stringify(r.estrutura.landmarks)}`)
}
md.push('', '## Texto com gradiente (contraste na cor mais escura)', '', '| elemento | tamanho | cor mais escura | fundo | contraste | mínimo |', '| --- | --- | --- | --- | --- | --- |')
const vistosG = new Set()
for (const r of resultados) for (const g of r.gradientes) {
  const k = `${g.id}|${g.tam}`
  if (g.razao < g.minimo) problemas.push(`[${r.largura}] contraste do gradiente ${g.id}: ${g.razao}:1 < ${g.minimo}:1`)
  if (vistosG.has(k)) continue
  vistosG.add(k)
  md.push(`| ${g.id} | ${g.tam}px (${r.largura}) | ${g.cor} | ${g.fundo} | ${g.razao < g.minimo ? `**${g.razao}:1**` : `${g.razao}:1`} | ${g.minimo}:1 |`)
}
for (const r of resultados.filter(x => x.teclado)) {
  md.push('', `## Ordem do Tab em ${r.largura}px (${r.teclado.length} paradas)`, '', '| # | elemento | foco visível |', '| --- | --- | --- |')
  r.teclado.forEach((f, i) => {
    md.push(`| ${i + 1} | ${f.tag} · ${f.nome.replace(/\|/g, '/')} | ${f.visivel ? 'sim' : '**não**'} |`)
    if (!f.visivel) problemas.push(`[${r.largura}] Tab ${i + 1} (${f.tag} ${f.nome}): sem foco visível`)
  })
}
fs.mkdirSync(path.join(RAIZ, 'medidas'), { recursive: true })
fs.writeFileSync(path.join(RAIZ, 'medidas/acessibilidade.md'), md.join('\n') + '\n')
console.log(md.join('\n'))
if (problemas.length) {
  console.error('\nFALHOU:\n  ' + problemas.join('\n  '))
  process.exit(1)
}
console.log('\nOK: 0 violações sérias/críticas, títulos, landmarks, foco visível e contraste dos gradientes')
