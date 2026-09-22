// node scripts/diagnostico-movimento.mjs [--larguras=390,1474] [--rotulo=antes]
// Diagnóstico das animações de entrada: rola a página como uma pessoa (roda do mouse,
// em passos) e amostra A CADA QUADRO a opacidade e o transform de todo elemento
// animado, junto com a posição dele na tela. Grava os quadros da rolagem (screencast)
// em shots/diagnostico-<rótulo>/<largura>/.
//
// Dois cenários por largura:
//   rolagem → carrega no topo e desce até o fim
//   recarga → rola até o meio e recarrega (o navegador restaura a posição)
//
// Aponta: pisca (visível → some → anima), pulo (transform andando para trás no meio da
// animação), nunca aparece, repete (anima de novo) e tempo morto (tempo na tela ainda
// invisível antes de começar a animar).

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, porLargura } from './comum.mjs'

const arg = (nome, padrao) => (process.argv.find(a => a.startsWith(`--${nome}=`)) || '').split('=')[1] || padrao
const larguras = arg('larguras', '390,1474').split(',').map(Number)
const rotulo = arg('rotulo', 'antes')
const pastaQuadros = path.join(RAIZ, 'shots', `diagnostico-${rotulo}`)

// roda na página antes de tudo: amostra os alvos a cada quadro, só quando algo muda
const AMOSTRADOR = () => {
  const SEL = '[data-revelar], [data-inclinar], .vela, [data-contar]'
  window.__diag = { amostras: {}, inicio: performance.now(), cls: 0, usados: new Set() }
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__diag.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
  const nome = el => {
    if (!el.__id) {
      const base = el.getAttribute('data-copy') || el.querySelector('[data-copy]')?.getAttribute('data-copy') || el.className.baseVal || el.className || el.tagName
      const irmaos = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0
      let id = `${String(base).split(' ')[0]}#${irmaos}`
      for (let k = 2; window.__diag.usados.has(id); k++) id = id.replace(/(·\d+)?$/, `·${k}`) // nomes únicos (3 SVGs de velas iguais)
      window.__diag.usados.add(id)
      el.__id = id
    }
    return el.__id
  }
  const quadro = () => {
    const t = Math.round(performance.now() - window.__diag.inicio)
    for (const el of document.querySelectorAll(SEL)) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      const naTela = r.top < innerHeight && r.bottom > 0
      const reg = { t, y: Math.round(r.top), h: Math.round(r.height), o: Math.round(Number(cs.opacity) * 100) / 100, tf: cs.translate && cs.translate !== 'none' ? `matrix(1, 0, 0, 1, 0, ${parseFloat(cs.translate.split(' ')[1] || 0)})` : cs.transform, na: naTela, vh: innerHeight, cor: cs.color }
      const lista = (window.__diag.amostras[nome(el)] ||= [])
      const ult = lista[lista.length - 1]
      if (!ult || ult.o !== reg.o || ult.tf !== reg.tf || ult.na !== reg.na || ult.cor !== reg.cor) lista.push(reg)
    }
    requestAnimationFrame(quadro)
  }
  addEventListener('DOMContentLoaded', () => requestAnimationFrame(quadro))
}

// translateY / rotateX de uma matriz computada
const ty = tf => {
  if (!tf || tf === 'none') return 0
  const v = tf.match(/matrix(3d)?\(([^)]+)\)/)
  if (!v) return 0
  const n = v[2].split(',').map(Number)
  return v[1] ? n[13] : n[5]
}
const rot = tf => {
  const v = tf && tf.match(/matrix3d\(([^)]+)\)/)
  if (!v) return 0
  const n = v[1].split(',').map(Number)
  return Math.round(Math.atan2(n[6], n[5]) * 180 / Math.PI * 10) / 10 // rotateX em graus
}

function analisar(amostras) {
  const achados = { pisca: [], pulo: [], nunca: [], repete: [], morto: [], espera: [] }
  for (const [id, lista] of Object.entries(amostras)) {
    const ehVela = id.startsWith('vela')
    // pisca: visível e na tela, depois some (opacidade < 0.5), depois volta
    let visto = false, sumiu = false, voltas = 0
    for (const a of lista) {
      if (a.na && a.o >= 0.99) { if (sumiu) voltas++; visto = true; sumiu = false }
      else if (visto && a.o < 0.5) sumiu = true
    }
    if (voltas) achados.pisca.push(`${id} (${voltas}×)`)
    // repete: a opacidade sobe de ~0 a 1 mais de uma vez
    let subidas = 0, baixo = false
    for (const a of lista) { if (a.o < 0.1) baixo = true; else if (baixo && a.o >= 0.99) { subidas++; baixo = false } }
    if (subidas > 1) achados.repete.push(`${id} (${subidas}×)`)
    // pulo: durante uma animação de subida o translateY tem que só diminuir
    const ys = lista.map(a => ty(a.tf))
    for (let i = 2; i < ys.length; i++) {
      if (ys[i - 2] > ys[i - 1] && ys[i] > ys[i - 1] + 0.5 && ys[i - 1] > 0.1) { achados.pulo.push(`${id} (translateY ${ys[i - 2].toFixed(1)} → ${ys[i - 1].toFixed(1)} → ${ys[i].toFixed(1)}px em ${lista[i].t}ms)`); break }
    }
    // pulo de rotação: rotateX deveria só diminuir enquanto a página desce
    const rs = lista.map(a => rot(a.tf)).filter((v, i) => lista[i].na)
    if (rs.length > 3 && !ehVela) {
      let inversoes = 0
      for (let i = 2; i < rs.length; i++) if ((rs[i] - rs[i - 1]) * (rs[i - 1] - rs[i - 2]) < 0 && Math.abs(rs[i] - rs[i - 1]) > 0.5) inversoes++
      if (inversoes) achados.pulo.push(`${id} (rotateX muda de sentido ${inversoes}× descendo a página)`)
    }
    // nunca: está NA TELA no fim e terminou com opacidade < 1 ou transform ainda deslocado
    const fim = lista[lista.length - 1]
    if (fim && fim.na && (fim.o < 0.99 || Math.abs(ty(fim.tf)) > 0.5) && !ehVela) achados.nunca.push(`${id} (fim: opacidade ${fim.o}, translateY ${ty(fim.tf).toFixed(1)}px, altura ${fim.h}px vs tela ${fim.vh}px)`)
    // tempo morto: primeira vez com ≥ 30% do elemento (ou 30% da tela) à mostra × primeira opacidade > 0.05
    const entra = lista.find(a => a.na && a.y < a.vh * 0.7)
    const comeca = lista.find(a => a.o > 0.05 && a.o < 0.99) || lista.find(a => a.o >= 0.99)
    if (entra && comeca && lista.some(a => a.o < 0.05) && comeca.t - entra.t > 350) achados.morto.push(`${id} (${comeca.t - entra.t}ms na tela invisível)`)
    // espera: do elemento cruzar a linha de disparo (88% da tela) até começar a mudar
    const cruza = lista.find(a => a.na && a.y < a.vh * 0.88)
    const muda = lista.find((a, i) => i > 0 && (a.o !== lista[i - 1].o || a.tf !== lista[i - 1].tf || a.cor !== lista[i - 1].cor) && lista[i - 1].na)
    if (cruza && muda && muda.t - cruza.t > 250 && !ehVela) achados.espera.push(`${id} ${muda.t - cruza.t}ms`)
  }
  return achados
}

const relatorio = await porLargura(larguras, async ({ page, largura }) => {
  const pasta = path.join(pastaQuadros, String(largura))
  fs.rmSync(pasta, { recursive: true, force: true })
  fs.mkdirSync(pasta, { recursive: true })
  const cdp = await page.context().newCDPSession(page)
  let n = 0
  // console: tudo que a PÁGINA escreve (logs e erros), fora o selo externo do Reclame Aqui
  const consoleMsgs = []
  page.on('console', m => { if (!/reclameaqui|RA-Verified|ERR_FAILED/.test(m.text())) consoleMsgs.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`))
  cdp.on('Page.screencastFrame', async f => {
    n++
    if (n % 3 === 0) fs.writeFileSync(path.join(pasta, `${String(n).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64'))
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })

  // cenário 1 · rolagem: recarrega no topo com o amostrador desde o primeiro quadro
  await page.evaluate(() => { history.scrollRestoration = 'manual'; scrollTo(0, 0) })
  await page.reload({ waitUntil: 'load' })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 45, maxWidth: largura, everyNthFrame: 1 })
  const altura = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.mouse.move(largura / 2, 300)
  for (let y = 0; y < altura; y += 120) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60) }
  await page.waitForTimeout(2500)
  await cdp.send('Page.stopScreencast')
  const rolagem = analisar(await page.evaluate(() => window.__diag.amostras))
  const extra = await page.evaluate(() => ({
    cls: window.__diag.cls,
    scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    lenis: document.documentElement.classList.contains('lenis'),
  }))

  // cenário 2 · recarga no meio da página (restauração de scroll do navegador)
  await page.evaluate(() => { history.scrollRestoration = 'auto'; scrollTo(0, document.documentElement.scrollHeight * 0.45) })
  await page.waitForTimeout(300)
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(2500)
  const recarga = analisar(await page.evaluate(() => window.__diag.amostras))
  const posRecarga = await page.evaluate(() => Math.round(scrollY))

  return { largura, rolagem, recarga, posRecarga, quadros: Math.floor(n / 3), ...extra, console: consoleMsgs }
}, { antesDeCarregar: p => p.addInitScript(AMOSTRADOR), movimento: true })

for (const r of relatorio) {
  console.log(`\n══ ${r.largura}px · ${r.quadros} quadros em shots/diagnostico-${rotulo}/${r.largura}/ · Lenis ${r.lenis ? 'ligado' : 'desligado'} · CLS ${r.cls.toFixed(4)} · scroll lateral ${r.scrollX ? 'SIM' : 'não'} · console ${r.console.length ? r.console.join(' | ') : 'limpo'}`)
  for (const [nomeCenario, a] of [['rolagem do topo ao fim', r.rolagem], [`recarga no meio (scrollY ${r.posRecarga})`, r.recarga]]) {
    console.log(`  · ${nomeCenario}`)
    for (const [tipo, lista] of Object.entries(a)) console.log(`      ${tipo.padEnd(7)}: ${lista.length ? lista.join(' · ') : '—'}`)
  }
}
