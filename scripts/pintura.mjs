// npm run pintura [-- --larguras=1474 --segundos=7.5]
// Custo de renderização das animações da hero, medido com o trace do Chrome (o mesmo
// que o painel Performance do DevTools grava). Para cada largura, grava um ciclo
// inteiro em 3 cenários, sem prefers-reduced-motion:
//   tudo        — a página como é
//   sem-h1      — igual, mas com a varredura do H1 desligada
//   parado      — todas as animações desligadas (referência)
// A diferença "tudo − sem-h1" é o custo da animação do H1.
// Também lista quantos elementos animados existem dentro da hero.

import { chromium } from 'playwright'
import { subirServidor } from './servidor.mjs'
import { DOBRA, lerLarguras } from './comum.mjs'

const argSeg = process.argv.find(a => a.startsWith('--segundos='))
const SEGUNDOS = argSeg ? Number(argSeg.split('=')[1]) : 7.5
const larguras = process.argv.some(a => a.startsWith('--larguras=')) ? lerLarguras() : [1474]

const CENARIOS = {
  tudo: '',
  'sem-h1': '.hero__titulo { animation: none !important; }',
  parado: '*, *::before, *::after { animation: none !important; }',
}

async function gravar(navegador, url, largura, css) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: DOBRA[largura] || 900 },
    reducedMotion: 'no-preference',
  })
  const page = await contexto.newPage()
  await page.goto(url, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  if (css) await page.addStyleTag({ content: css })
  await page.waitForTimeout(500)

  const animados = await page.evaluate(() => {
    const hero = document.querySelector('#hero')
    return document.getAnimations()
      .filter(a => a.playState === 'running' && hero.contains(a.effect.target))
      .map(a => {
        const t = a.effect.target
        const nome = t.className && typeof t.className === 'string' ? '.' + t.className.trim().split(/\s+/).join('.') : t.tagName.toLowerCase()
        return `${nome}${a.effect.pseudoElement || ''} → ${a.animationName}`
      })
  })

  const cdp = await contexto.newCDPSession(page)
  const eventos = []
  cdp.on('Tracing.dataCollected', ({ value }) => eventos.push(...value))
  const fim = new Promise(r => cdp.once('Tracing.tracingComplete', r))
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] },
  })
  await page.waitForTimeout(SEGUNDOS * 1000)
  await cdp.send('Tracing.end')
  await fim
  await contexto.close()

  const soma = nome => {
    const lista = eventos.filter(e => e.name === nome && e.ph === 'X')
    return { n: lista.length, ms: lista.reduce((t, e) => t + (e.dur || 0), 0) / 1000 }
  }
  // em que segundos do ciclo houve pintura
  const t0 = Math.min(...eventos.filter(e => e.ts).map(e => e.ts))
  const segundosComPaint = [...new Set(eventos.filter(e => e.name === 'Paint').map(e => Math.floor((e.ts - t0) / 1e6)))].sort((a, b) => a - b)
  return {
    animados,
    paint: soma('Paint'),
    raster: soma('RasterTask'),
    estilo: soma('UpdateLayoutTree'),
    layout: soma('Layout'),
    segundosComPaint,
  }
}

const servidor = await subirServidor()
const navegador = await chromium.launch()
try {
  for (const largura of larguras) {
    console.log(`\n══ ${largura}×${DOBRA[largura] || 900} · ${SEGUNDOS}s de trace por cenário ══`)
    const r = {}
    for (const [nome, css] of Object.entries(CENARIOS)) r[nome] = await gravar(navegador, servidor.url, largura, css)

    console.log(`\nelementos animados na hero (${r.tudo.animados.length}):`)
    for (const a of r.tudo.animados) console.log('  · ' + a)

    const f = x => `${String(x.n).padStart(4)} × · ${x.ms.toFixed(1).padStart(7)} ms`
    console.log('\ncenário   | Paint              | RasterTask         | Recalc. estilo     | Layout')
    for (const [nome, x] of Object.entries(r)) {
      console.log(`${nome.padEnd(9)} | ${f(x.paint)} | ${f(x.raster)} | ${f(x.estilo)} | ${f(x.layout)}`)
    }
    const d = k => (r.tudo[k].ms - r['sem-h1'][k].ms).toFixed(1)
    console.log(`\ncusto da varredura do H1 por ciclo de ${SEGUNDOS}s: Paint +${d('paint')} ms · Raster +${d('raster')} ms · estilo +${d('estilo')} ms`)
    console.log(`segundos do trace com Paint — tudo: [${r.tudo.segundosComPaint.join(', ')}] · sem-h1: [${r['sem-h1'].segundosComPaint.join(', ')}]`)
  }
} finally {
  await navegador.close()
  await servidor.fechar()
}
