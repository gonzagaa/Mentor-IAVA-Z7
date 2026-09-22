// node scripts/fontes-reserva.mjs [--detalhe]
// Calibra as FONTES RESERVA (fallback com as mesmas medidas das fontes da página),
// para a troca de fonte (font-display: swap) não mexer no layout — CLS da troca.
//
// Três faces reserva:
//   Inter Reserva 100–599  ← Arial        (texto corrido)
//   Inter Reserva 600–900  ← Arial Bold   (selo e botões, semibold)
//   NCS Radhiumz Reserva   ← Arial Black  (títulos .display)
//
// 1. Medidas de linha, no próprio Chromium, com as fontes da página carregadas: ascent,
//    descent e line gap de cada fonte (a 100px; line gap = altura de uma linha com
//    line-height: normal − ascent − descent).
// 2. size-adjust de partida = largura dos TEXTOS DA PÁGINA naquele peso, na fonte web ÷
//    na fonte do sistema.
// 3. Ajuste fino, só com o que está na PRIMEIRA DOBRA (é o que conta para o CLS), nas 9
//    larguras, medindo NO LUGAR (troca a fonte do próprio elemento e desfaz — pega o
//    contexto real, como caixas que se ajustam ao conteúdo). Candidatos de size-adjust
//    em ±10% da partida, passo de 0,25%. Critérios, em ordem:
//      a) quebras de linha iguais (altura + em que linha cai cada pedaço de texto),
//         pesando cada diferença pela área que se mexeria (o bloco e o que está abaixo)
//      b) menor deslocamento horizontal do texto (texto centralizado anda para o lado se
//         a largura da linha muda; o Chrome ignora menos de 3px)
//      c) o mais perto da partida
// ascent/descent/line-gap-override = medida da fonte web ÷ size-adjust (o navegador
// multiplica os overrides pelo size-adjust). Reescreve o bloco em css/fontes.css.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, LARGURAS, porLargura } from './comum.mjs'

const PARES = [
  { web: 'Inter', peso: 400, pesos: [100, 599], reserva: 'Inter Reserva', sistema: 'Arial', pesoSistema: 400, locais: ['Arial', 'ArialMT'], display: false },
  { web: 'Inter', peso: 600, pesos: [600, 900], reserva: 'Inter Reserva', sistema: 'Arial', pesoSistema: 700, locais: ['Arial Bold', 'Arial-BoldMT'], display: false },
  { web: 'NCS Radhiumz', peso: 400, pesos: null, reserva: 'NCS Radhiumz Reserva', sistema: 'Arial Black', pesoSistema: 400, locais: ['Arial Black', 'Arial-Black', 'ArialBlack'], display: true },
]

// ─── 1 e 2 · medidas e size-adjust de partida ───
const [medidas] = await porLargura([1474], async ({ page }) => page.evaluate(async pares => {
  await document.fonts.ready
  const ctx = document.createElement('canvas').getContext('2d')
  const metricas = (familia, peso) => {
    ctx.font = `${peso} 100px "${familia}"`
    const m = ctx.measureText('Hxgjpq')
    const div = document.createElement('div')
    div.style.cssText = `position:absolute;visibility:hidden;font:${peso} 100px "${familia}";line-height:normal;white-space:nowrap`
    div.textContent = 'H'
    document.body.append(div)
    const altura = div.getBoundingClientRect().height
    div.remove()
    return { asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent, gap: Math.max(0, altura - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) }
  }
  const largura = (familia, peso, textos) => { ctx.font = `${peso} 100px "${familia}"`; return textos.reduce((s, t) => s + ctx.measureText(t).width, 0) }
  const dessePar = (el, p) => {
    const s = getComputedStyle(el)
    if (!s.fontFamily.replace(/["']/g, '').startsWith(p.web)) return false
    return !p.pesos || (Number(s.fontWeight) >= p.pesos[0] && Number(s.fontWeight) <= p.pesos[1])
  }
  return pares.map(p => {
    const textos = []
    for (const el of document.querySelectorAll('body *')) {
      if (!dessePar(el, p)) continue
      const caixaAlta = getComputedStyle(el).textTransform === 'uppercase'
      for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) textos.push(caixaAlta ? n.nodeValue.trim().toUpperCase() : n.nodeValue.trim())
    }
    return { ...p, textos: textos.length, carregada: document.fonts.check(`${p.peso} 100px "${p.web}"`), mWeb: metricas(p.web, p.peso), wWeb: largura(p.web, p.peso, textos), wSis: largura(p.sistema, p.pesoSistema, textos) }
  })
}, PARES))
for (const m of medidas) if (!m.carregada) throw new Error(`a fonte ${m.web} não carregou: medida inválida`)

// ─── 3 · ajuste fino na primeira dobra, nas 9 larguras ───
const PASSO = 0.0025, FAIXA = 0.1
const candidatos = medidas.map(m => {
  const base = m.textos ? m.wWeb / m.wSis : 1, lista = []
  for (let s = base * (1 - FAIXA); s <= base * (1 + FAIXA) + 1e-9; s += base * PASSO) lista.push(+s.toFixed(5))
  return { web: m.web, pesos: m.pesos, base, lista, local: m.locais[0], mWeb: m.mWeb }
})
const porLarg = await porLargura(LARGURAS, async ({ page }) => page.evaluate(async cands => {
  await document.fonts.ready
  const estilo = document.createElement('style')
  const regras = []
  cands.forEach((c, i) => c.lista.forEach((s, j) => regras.push(`@font-face{font-family:'cand-${i}-${j}';src:local('${c.local}');size-adjust:${s * 100}%;ascent-override:${c.mWeb.asc / s}%;descent-override:${c.mWeb.desc / s}%;line-gap-override:${c.mWeb.gap / s}%}`)))
  estilo.textContent = regras.join('\n')
  document.head.append(estilo)
  await Promise.all(cands.flatMap((c, i) => c.lista.map((s, j) => document.fonts.load(`16px 'cand-${i}-${j}'`))))
  const dobra = innerHeight
  const bloco = el => !['inline', 'contents', 'none'].includes(getComputedStyle(el).display)
  const dessePar = (el, c) => {
    const s = getComputedStyle(el)
    if (!s.fontFamily.replace(/["']/g, '').startsWith(c.web)) return false
    return !c.pesos || (Number(s.fontWeight) >= c.pesos[0] && Number(s.fontWeight) <= c.pesos[1])
  }
  // medida no lugar: estrutura das linhas + posição horizontal de cada pedaço de texto
  const medir = (el, familia) => {
    const trocados = familia ? [el, ...el.querySelectorAll('*')] : []
    const antes = trocados.map(d => d.style.getPropertyValue('font-family'))
    for (const d of trocados) d.style.setProperty('font-family', familia, 'important')
    const caixa = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const linha = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
    const faixa = document.createRange()
    const partes = [Math.round(caixa.height / (linha / 2))]
    const pedacos = []
    const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = andar.nextNode(); n; n = andar.nextNode()) {
      if (!n.nodeValue.trim()) continue
      faixa.selectNodeContents(n)
      const rs = [...faixa.getClientRects()]
      partes.push(rs.map(x => Math.floor((x.top + x.height / 2 - caixa.top) / linha)).join(','))
      for (const x of rs) pedacos.push([x.left, x.right, x.width * x.height])
    }
    trocados.forEach((d, k) => (antes[k] ? d.style.setProperty('font-family', antes[k]) : d.style.removeProperty('font-family')))
    return { sig: partes.join('|'), pedacos }
  }
  const pesoArea = el => { const r = el.getBoundingClientRect(); return (r.width * (dobra - Math.max(0, r.top))) / (innerWidth * dobra) }
  return cands.map((c, i) => {
    const alvos = [...document.querySelectorAll('body *')].filter(el => {
      if (!el.getClientRects().length || !bloco(el) || !el.textContent.trim()) return false
      const r = el.getBoundingClientRect()
      if (r.top >= dobra || r.bottom <= 0 || !dessePar(el, c)) return false
      return ![...el.querySelectorAll('*')].some(d => bloco(d) && d.textContent.trim())
    })
    const refs = alvos.map(el => medir(el, null))
    const nomes = alvos.map(el => el.getAttribute('data-copy') || el.closest('[data-copy]')?.getAttribute('data-copy') || `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`)
    const erros = c.lista.map((s, j) => {
      let n = 0, p = 0, desl = 0
      const quais = []
      alvos.forEach((el, k) => {
        const m = medir(el, `'cand-${i}-${j}'`)
        if (m.sig !== refs[k].sig) { n++; p += pesoArea(el); quais.push(nomes[k]); return }
        // mesmas linhas: quanto o texto andou para o lado (acima dos 3px que o Chrome ignora)
        m.pedacos.forEach((x, q) => {
          const r = refs[k].pedacos[q]
          if (!r) return
          const d = Math.max(Math.abs(x[0] - r[0]), Math.abs(x[1] - r[1]))
          if (d > 3) desl += (d - 3) * r[2]
        })
      })
      return { n, p, desl, quais }
    })
    return { alvos: alvos.length, erros }
  })
}, candidatos))

const pct = v => `${(v * 100).toFixed(2)}%`
const blocos = []
medidas.forEach((m, i) => {
  const c = candidatos[i]
  const soma = campo => c.lista.map((_, j) => porLarg.reduce((s, l) => s + l[i].erros[j][campo], 0))
  const peso = soma('p'), total = soma('n'), desl = soma('desl')
  const alvos = porLarg.reduce((s, l) => s + l[i].alvos, 0)
  const ordem = c.lista.map((s, k) => k).sort((a, b) => (peso[a] - peso[b]) || (desl[a] - desl[b]) || (Math.abs(c.lista[a] - c.base) - Math.abs(c.lista[b] - c.base)))
  const j = ordem[0]
  const jBase = c.lista.reduce((best, s, k) => (Math.abs(s - c.base) < Math.abs(c.lista[best] - c.base) ? k : best), 0)
  const ajuste = c.lista[j]
  const asc = m.mWeb.asc / 100 / ajuste, desc = m.mWeb.desc / 100 / ajuste, gap = m.mWeb.gap / 100 / ajuste
  const rotulo = `${m.web}${m.pesos ? ` ${m.pesos.join('–')}` : ''}`
  console.log(`${rotulo} ← ${m.locais[0]}: partida ${pct(c.base)} (${total[jBase]} de ${alvos} textos da dobra quebrando diferente) → escolhido ${pct(ajuste)} (${total[j]} de ${alvos}; deslocamento lateral ${Math.round(desl[j])} contra ${Math.round(desl[jBase])} na partida)`)
  const resto = porLarg.map((l, k) => l[i].erros[j].quais.length ? `${LARGURAS[k]}: ${l[i].erros[j].quais.join(', ')}` : '').filter(Boolean)
  if (resto.length) console.log(`  ainda quebram diferente → ${resto.join(' · ')}`)
  if (process.argv.includes('--detalhe')) c.lista.forEach((s, k) => console.log(`    ${pct(s)} peso ${peso[k].toFixed(3)} desl ${Math.round(desl[k])} · ${porLarg.map((l, w) => l[i].erros[k].quais.length ? `${LARGURAS[w]}: ${l[i].erros[k].quais.join(',')}` : '').filter(Boolean).join(' · ') || '—'}`))
  blocos.push(`/* ${rotulo} ← ${m.locais[0]}: textos da primeira dobra com as mesmas quebras de linha
   nas 9 larguras (${total[j]} de ${alvos} diferentes). Gerado por scripts/fontes-reserva.mjs. */
@font-face {
  font-family: '${m.reserva}';
  src: ${m.locais.map(l => `local('${l}')`).join(', ')};${m.pesos ? `\n  font-weight: ${m.pesos.join(' ')};` : ''}
  size-adjust: ${pct(ajuste)};
  ascent-override: ${pct(asc)};
  descent-override: ${pct(desc)};
  line-gap-override: ${pct(gap)};
}`)
})

const arq = path.join(RAIZ, 'css/fontes.css')
const INI = '/* ═══ fontes reserva (início) ═══ */', FIM = '/* ═══ fontes reserva (fim) ═══ */'
let css = fs.readFileSync(arq, 'utf8')
const bloco = `${INI}\n${blocos.join('\n\n')}\n${FIM}`
css = css.includes(INI) ? css.slice(0, css.indexOf(INI)) + bloco + css.slice(css.indexOf(FIM) + FIM.length) : `${css.trimEnd()}\n\n${bloco}\n`
fs.writeFileSync(arq, css)
console.log('\ncss/fontes.css atualizado')
