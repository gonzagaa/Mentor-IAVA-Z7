// node scripts/pixel.mjs [--dist] [--largura=1474]
// Confere o Meta Pixel (sem pedido de consentimento — decisão do Gustavo), registrando
// TODA requisição a domínios de fora (tipo, URL, evento ev= e id do pixel):
//   carregamento → fbevents.js depois da página pronta + PageView nos 2 pixels
//   cliques      → InitiateCheckout nos 2 botões de compra, ANTES de ir ao checkout
//                  (o checkout real não é aberto: uma página de teste responde no lugar)
//   vídeo        → ViewContent no clique do play
// O navegador do teste se apresenta como um Chrome comum (sem navigator.webdriver e sem
// "HeadlessChrome" no user agent): o fbevents.js não envia NADA para navegador automatizado
// (conferido), e o teste não provaria coisa alguma.
// Com --dist, a CSP do dist/.htaccess está ativa: lista as violações.

import { porLargura } from './comum.mjs'

const largura = Number((process.argv.find(a => a.startsWith('--largura=')) || '--largura=1474').split('=')[1])
const CHECKOUT = 'https://app.zero7.com.br/checkout/cad61e'
// tudo que não é o próprio site, o YouTube (vídeo) nem o checkout (interceptado)
const EXTERNO = /^https?:\/\/(?!localhost|127\.0\.0\.1|app\.zero7\.com\.br|[^/]*youtube|[^/]*ytimg|[^/]*ggpht|[^/]*googlevideo|[^/]*doubleclick|[^/]*google|[^/]*gstatic)/

const [res] = await porLargura([largura], async ({ page }) => {
  const registro = []
  let fase = 'carregamento'
  page.on('request', r => {
    if (!EXTERNO.test(r.url())) return
    const u = new URL(r.url())
    registro.push({ fase, tipo: r.resourceType(), metodo: r.method(), url: `${u.origin}${u.pathname}`, ev: u.searchParams.get('ev') || '', id: u.searchParams.get('id') || '' })
  })
  const csp = [], erros = []
  page.on('console', m => {
    if (/Content Security Policy|Refused/.test(m.text())) csp.push(m.text().slice(0, 240))
    else if (m.type() === 'error') erros.push(`[${fase}] ${m.text().slice(0, 200)}`)
  })
  page.on('pageerror', e => erros.push('pageerror: ' + e.message))
  let checkout = 0
  await page.route('https://app.zero7.com.br/**', r => { checkout++; r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>checkout (teste)</title>' }) })
  const pixelPronto = () => page.waitForFunction(() => window.fbq && window.fbq.instance, null, { timeout: 20000 })

  await page.reload({ waitUntil: 'load' })
  await pixelPronto()
  await page.waitForTimeout(1500)
  const carregamento = registro.splice(0)

  fase = 'cliques'
  for (const sel of ['[data-copy="d1.cta1"]', '[data-copy="d6.cta"]']) {
    await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel)
    await page.waitForTimeout(300)
    await Promise.all([page.waitForURL(CHECKOUT, { timeout: 10000 }), page.click(sel)])
    await page.waitForTimeout(800)
    fase = 'volta'
    await page.goBack({ waitUntil: 'load' })
    await pixelPronto()
    await page.waitForTimeout(1500)
    fase = 'cliques'
  }
  const cliques = registro.splice(0)

  fase = 'video'
  await page.evaluate(() => document.querySelector('a[data-video]').scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(300)
  await page.click('a[data-video]')
  await page.waitForTimeout(2500)
  const video = registro.splice(0)
  return { carregamento, cliques, video, checkout, csp: [...new Set(csp)], erros: [...new Set(erros)] }
}, {
  movimento: true,
  antesDeCarregar: p => p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })),
  contexto: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
})

const mostra = r => r.length ? r.map(x => `      ${x.fase.padEnd(12)} ${x.tipo.padEnd(8)} ${x.metodo} ${x.url}${x.ev ? `  ev=${x.ev}` : ''}${x.id ? `  id=${x.id}` : ''}`).join('\n') : '      (nenhuma requisição externa)'
const eventos = r => r.filter(x => x.ev).map(x => `${x.ev}@${x.id}`)
for (const [nome, r] of [['carregamento', res.carregamento], ['cliques nos botões de compra', res.cliques], ['play do vídeo', res.video]]) {
  console.log(`\n${nome} — eventos: ${eventos(r).join(', ') || 'nenhum'}\n${mostra(r)}`)
}
console.log(`\ncliques que abriram o checkout: ${res.checkout} de 2`)
console.log(`violações de CSP: ${res.csp.length ? '\n  ' + res.csp.join('\n  ') : 'nenhuma'}`)
console.log(`erros no console: ${res.erros.length ? '\n  ' + res.erros.join('\n  ') : 'nenhum'}`)

const falhas = []
const conta = (r, ev) => r.filter(x => x.ev === ev).length
if (conta(res.carregamento, 'PageView') !== 2) falhas.push('PageView não saiu nos 2 pixels')
if (conta(res.cliques.filter(x => x.fase === 'cliques'), 'InitiateCheckout') !== 4) falhas.push('InitiateCheckout não saiu 2× nos 2 pixels antes do checkout')
if (conta(res.video, 'ViewContent') !== 2) falhas.push('ViewContent não saiu nos 2 pixels')
if (res.checkout !== 2) falhas.push('os botões não abriram o checkout')
const outros = [...res.carregamento, ...res.cliques, ...res.video].filter(x => !/^https:\/\/(connect\.facebook\.net\/en_US\/fbevents\.js|www\.facebook\.com\/tr\/?)$/.test(x.url))
if (outros.length) falhas.push(`requisição externa inesperada: ${[...new Set(outros.map(x => x.url))].join(', ')}`)
if (res.csp.length) falhas.push('violação de CSP')
if (falhas.length) { console.error('\nFALHOU: ' + falhas.join(' · ')); process.exit(1) }
console.log('\nOK')
