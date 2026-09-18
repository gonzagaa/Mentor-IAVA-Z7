// npm run lcp [-- --larguras=390,1474]
// Mede o LCP (Largest Contentful Paint) da index na altura real de tela de cada
// largura, em dois cenários, sempre sem cache:
//   local     — sem limitação (servidor na própria máquina)
//   4g-lento  — rede e CPU limitadas como o perfil móvel do Lighthouse
//               (150ms de latência, 1,6 Mbps de download, CPU 4× mais lenta)
// Diz qual elemento é o LCP e, se for imagem, qual arquivo.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, porLargura } from './comum.mjs'

const argL = process.argv.some(a => a.startsWith('--larguras='))
const larguras = argL ? lerLarguras() : [390, 1474]

const OBSERVAR_LCP = () => {
  window.__lcp = []
  new PerformanceObserver(lista => {
    for (const e of lista.getEntries()) {
      const el = e.element
      window.__lcp.push({
        t: Math.round(e.startTime),
        tamanho: e.size,
        url: e.url || '',
        elemento: el
          ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
          : '(sem elemento)',
        copy: el?.closest?.('[data-copy]')?.getAttribute('data-copy') || '',
      })
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })
}

const CENARIOS = {
  local: null,
  '4g-lento': { rede: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, cpu: 4 },
}

const resultados = []
for (const [cenario, limite] of Object.entries(CENARIOS)) {
  const r = await porLargura(
    larguras,
    async ({ page, largura }) => {
      await page.waitForTimeout(500)
      const entradas = await page.evaluate(() => window.__lcp)
      const final = entradas[entradas.length - 1]
      return { cenario, largura, final, entradas }
    },
    {
      dobra: true,
      antesDeCarregar: async page => {
        await page.addInitScript(OBSERVAR_LCP)
        if (!limite) return
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', { offline: false, ...limite.rede })
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: limite.cpu })
      },
    }
  )
  resultados.push(...r)
}

const banner = path.join(RAIZ, 'img/banner-hero.png')
if (fs.existsSync(banner)) {
  const b = fs.readFileSync(banner)
  console.log(`\nimg/banner-hero.png: ${b.readUInt32BE(16)}×${b.readUInt32BE(20)} px · ${(b.length / 1024).toFixed(0)} KB (${b.length} bytes)`)
}
console.log('\n| cenário | largura | LCP | elemento | tamanho (px²) | url |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const r of resultados) {
  const f = r.final
  console.log(`| ${r.cenario} | ${r.largura} | ${f ? f.t + ' ms' : '—'} | ${f ? f.elemento + (f.copy ? ` (${f.copy})` : '') : '—'} | ${f ? f.tamanho : '—'} | ${f?.url ? path.basename(f.url) : '—'} |`)
}
console.log('\ncandidatos na ordem em que o Chrome os registrou:')
for (const r of resultados) {
  console.log(`  ${r.cenario} ${r.largura}: ` + r.entradas.map(e => `${e.t}ms ${e.elemento}${e.url ? ' [' + path.basename(e.url) + ']' : ''}`).join(' → '))
}
