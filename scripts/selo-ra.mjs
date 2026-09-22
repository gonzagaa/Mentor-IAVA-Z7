// node scripts/selo-ra.mjs [--url=https://zero7.com.br/]
// Levantamento do selo do Reclame Aqui EM PRODUÇÃO (a API dele recusa localhost):
// abre a página que já tem o selo e registra, a partir do bundle.js do selo:
//   - toda requisição: domínio, tipo, peso transferido  → diretivas da CSP
//   - cookies gravados por domínios do selo              → consentimento de cookies
//   - o que ele injeta na página: <style>, style="", iframes, scripts, eval
//   - a caixa final do selo (largura × altura)           → altura reservada (CLS 0)

import { vigiar, abrirNavegador } from './comum.mjs'

const url = (process.argv.find(a => a.startsWith('--url=')) || '--url=https://zero7.com.br/').split('=').slice(1).join('=')
const vigia = vigiar('selo-ra', 3)
const { navegador, fechar } = await abrirNavegador(vigia)
try {
  const contexto = await navegador.newContext({ viewport: { width: 1474, height: 900 } })
  const page = await contexto.newPage()
  const reqs = []
  const cdp = await contexto.newCDPSession(page)
  await cdp.send('Network.enable')
  const porId = new Map()
  cdp.on('Network.requestWillBeSent', e => porId.set(e.requestId, { url: e.request.url, tipo: e.type, iniciador: e.initiator?.stack?.callFrames?.[0]?.url || e.initiator?.url || e.initiator?.type }))
  cdp.on('Network.loadingFinished', e => { const r = porId.get(e.requestId); if (r) reqs.push({ ...r, bytes: e.encodedDataLength }) })
  cdp.on('Network.loadingFailed', e => { const r = porId.get(e.requestId); if (r) reqs.push({ ...r, bytes: 0, falhou: e.errorText }) })
  // CSP de "só relatório" para descobrir o que o selo usa de inline/eval
  const violacoes = []
  page.on('console', m => { if (/Content Security Policy|Refused/.test(m.text())) violacoes.push(m.text().slice(0, 200)) })
  await page.addInitScript(() => {
    window.__injecoes = { estilos: 0, styleAttr: 0, iframes: [], scripts: [] }
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'attributes' && m.attributeName === 'style' && m.target.closest?.('#ra-verified-seal')) window.__injecoes.styleAttr++
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue
          if (n.tagName === 'STYLE') window.__injecoes.estilos++
          if (n.tagName === 'IFRAME') window.__injecoes.iframes.push(n.src)
          if (n.tagName === 'SCRIPT') window.__injecoes.scripts.push(n.src || '(inline)')
          if (n.closest?.('#ra-verified-seal') && n.hasAttribute?.('style')) window.__injecoes.styleAttr++
        }
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] })
  })
  await page.goto(url, { waitUntil: 'load', timeout: 45000 })
  await page.evaluate(() => document.querySelector('#ra-verified-seal')?.scrollIntoView())
  await page.waitForTimeout(6000)
  const caixa = await page.evaluate(() => {
    const s = document.querySelector('#ra-verified-seal')
    if (!s) return null
    const r = s.getBoundingClientRect()
    return { largura: Math.round(r.width), altura: Math.round(r.height), html: s.innerHTML.replace(/\s+/g, ' ').slice(0, 600), injecoes: window.__injecoes }
  })
  const cookies = await contexto.cookies()

  // só o que veio do selo: a partir do bundle.js, seguindo a cadeia de iniciadores
  const doSelo = new Set(['https://s3.amazonaws.com/raichu-beta/ra-verified/bundle.js'])
  let mudou = true
  while (mudou) { mudou = false; for (const r of reqs) if (!doSelo.has(r.url) && [...doSelo].some(u => r.iniciador && r.iniciador.startsWith(u.split('?')[0]))) { doSelo.add(r.url); mudou = true } }
  const selo = reqs.filter(r => doSelo.has(r.url) || /reclameaqui|raichu|ra-verified/.test(r.url))
  const dominios = {}
  for (const r of selo) { const d = new URL(r.url).origin; (dominios[d] ||= { tipos: new Set(), n: 0, bytes: 0 }); dominios[d].tipos.add(r.tipo); dominios[d].n++; dominios[d].bytes += r.bytes }

  console.log(`\nSelo do Reclame Aqui em ${url}\n`)
  console.log('| origem | tipos | requisições | transferido |\n| --- | --- | --- | --- |')
  for (const [d, v] of Object.entries(dominios)) console.log(`| ${d} | ${[...v.tipos].join(', ')} | ${v.n} | ${(v.bytes / 1024).toFixed(1)} KB |`)
  console.log(`\ntotal: ${selo.length} requisições · ${(selo.reduce((s, r) => s + r.bytes, 0) / 1024).toFixed(1)} KB`)
  console.log('\nrequisições:')
  for (const r of selo) console.log(`  ${r.tipo.padEnd(10)} ${(r.bytes / 1024).toFixed(1).padStart(6)} KB  ${r.url.slice(0, 140)}${r.falhou ? '  FALHOU ' + r.falhou : ''}`)
  const cookiesSelo = cookies.filter(c => /reclameaqui|raichu|amazonaws/.test(c.domain))
  console.log(`\ncookies de domínios do selo: ${cookiesSelo.length ? cookiesSelo.map(c => `${c.name} (${c.domain}, expira ${c.expires > 0 ? new Date(c.expires * 1000).toISOString().slice(0, 10) : 'na sessão'})`).join(' · ') : 'nenhum'}`)
  console.log(`todos os cookies da página (qualquer domínio): ${cookies.map(c => `${c.name}@${c.domain}`).join(', ') || 'nenhum'}`)
  console.log(`localStorage do selo: ${await page.evaluate(() => Object.keys(localStorage).filter(k => /ra|reclame/i.test(k)).join(', ') || 'nenhum')}`)
  console.log(`\ncaixa do selo: ${caixa ? `${caixa.largura}×${caixa.altura}px` : 'não encontrada'}`)
  if (caixa) console.log(`injeções: ${JSON.stringify(caixa.injecoes)}\nhtml: ${caixa.html}`)
  if (violacoes.length) console.log('\nviolações de CSP já existentes na página:\n  ' + violacoes.join('\n  '))
} finally {
  await fechar()
}
