// npm run desempenho [-- --rotulo=antes] [--rodadas=3]
// Celular (390×844, CPU 4× mais lenta, rede "Slow 4G" do DevTools/Lighthouse) × desktop
// (1474×830, sem limitação). Mede LCP, FCP, TBT, CLS, peso transferido (total e JS) e
// número de requisições. Mediana de N rodadas, cada uma com cache vazio.
// Alvos (CONTEXTO): LCP < 2,5s · TBT < 200ms · CLS < 0,01.
//
// TBT: soma de (duração − 50ms) das long tasks entre o FCP e 5s depois do load.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, porLargura } from './comum.mjs'

const arg = (nome, padrao) => (process.argv.find(a => a.startsWith(`--${nome}=`)) || '').split('=')[1] || padrao
const rotulo = arg('rotulo', 'atual')
const rodadas = Number(arg('rodadas', '3'))
// --bloquear=padrão,padrão: aborta as requisições cujo caminho contém o padrão (isola o
// custo de um script, ex. --bloquear=lenis). Só para diagnóstico.
const bloquear = arg('bloquear', '').split(',').filter(Boolean)

const PERFIS = {
  390: { nome: 'celular', cpu: 4, rede: { offline: false, latency: 562.5, downloadThroughput: (1474.56 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 } },
  1474: { nome: 'desktop', cpu: 1, rede: null },
}

const OBSERVADOR = () => {
  window.__perf = { longas: [], lcp: 0, cls: 0 }
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.longas.push({ inicio: e.startTime, dur: e.duration }) }).observe({ type: 'longtask', buffered: true })
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value }).observe({ type: 'layout-shift', buffered: true })
}

const larguras = Object.keys(PERFIS).flatMap(l => Array(rodadas).fill(Number(l)))

const brutos = await porLargura(larguras, async ({ page, largura }) => {
  await page.waitForTimeout(5000)
  const m = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    const fimJanela = performance.timing.loadEventEnd - performance.timing.navigationStart + 5000
    const tbt = window.__perf.longas.filter(t => t.inicio >= fcp && t.inicio <= fimJanela).reduce((s, t) => s + Math.max(0, t.dur - 50), 0)
    const recursos = performance.getEntriesByType('resource')
    const nav = performance.getEntriesByType('navigation')[0]
    const peso = recursos.reduce((s, r) => s + (r.transferSize || 0), nav?.transferSize || 0)
    const js = recursos.filter(r => r.initiatorType === 'script' || /\.js(\?|$)/.test(r.name)).reduce((s, r) => s + (r.transferSize || 0), 0)
    return { fcp, lcp: window.__perf.lcp, tbt, cls: window.__perf.cls, peso, js, requisicoes: recursos.length + 1 }
  })
  return { largura, ...m }
}, {
  movimento: true,
  antesDeCarregar: async page => {
    await page.addInitScript(OBSERVADOR)
    if (bloquear.length) await page.route(u => bloquear.some(b => u.pathname.includes(b)), r => r.abort())
    const perfil = PERFIS[page.viewportSize().width]
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    if (perfil.rede) await cdp.send('Network.emulateNetworkConditions', perfil.rede)
    if (perfil.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: perfil.cpu })
  },
})

const mediana = v => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const kb = b => `${(b / 1024).toFixed(1)} KB`
const linhas = Object.entries(PERFIS).map(([l, p]) => {
  const r = brutos.filter(b => b.largura === Number(l))
  const med = k => mediana(r.map(x => x[k]))
  const lcp = med('lcp'), tbt = med('tbt'), cls = Math.max(...r.map(x => x.cls))
  const marca = (ok, t) => (ok ? t : `**${t}**`)
  return `| ${p.nome} (${l}px${p.cpu > 1 ? ', CPU 4×, Slow 4G' : ''}) | ${marca(lcp < 2500, (lcp / 1000).toFixed(2) + 's')} | ${(med('fcp') / 1000).toFixed(2)}s | ${marca(tbt < 200, Math.round(tbt) + 'ms')} | ${marca(cls < 0.01, cls.toFixed(4))} | ${kb(med('peso'))} | ${kb(med('js'))} | ${med('requisicoes')} |`
})
const tabela = ['| perfil | LCP | FCP | TBT | CLS (pior) | peso transferido | JS | requisições |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ...linhas].join('\n')
const md = `# desempenho · ${rotulo}\n\nGerado em ${new Date().toISOString()} · mediana de ${rodadas} rodada(s), cache vazio${bloquear.length ? ' · BLOQUEADO: ' + bloquear.join(', ') : ''}\n\n${tabela}\n`
fs.mkdirSync(path.join(RAIZ, 'medidas'), { recursive: true })
fs.writeFileSync(path.join(RAIZ, 'medidas', `desempenho-${rotulo}.md`), md)
console.log(tabela)
console.log(`\nsalvo em medidas/desempenho-${rotulo}.md`)
