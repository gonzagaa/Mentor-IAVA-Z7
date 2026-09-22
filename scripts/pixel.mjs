// node scripts/pixel.mjs [--dist] [--largura=1474]
// Confere o Meta Pixel com consentimento, registrando TODA requisição a domínios do
// Facebook/Meta (tipo, URL, evento ev= e id do pixel):
//   A · sem clicar em nada (aviso aberto)          → nenhum evento pode sair
//   B · Aceitar → cliques nos 2 CTAs e no play     → PageView, InitiateCheckout ×2, ViewContent
//   C · Recusar → cliques                          → nada sai
//   D · recarrega depois de aceitar                → PageView direto, sem aviso
// O navegador do teste se apresenta como um Chrome comum (sem navigator.webdriver e sem
// "HeadlessChrome" no user agent): o fbevents.js não envia NADA para navegador automatizado
// (conferido), e o teste não provaria coisa alguma.
// Com --dist, a CSP do dist/.htaccess está ativa: lista as violações (para ajustar a CSP
// só ao que o Pixel usa de fato).

import { porLargura } from './comum.mjs'

const largura = Number((process.argv.find(a => a.startsWith('--largura=')) || '--largura=1474').split('=')[1])
// toda requisição a outro domínio que não o do próprio site (o Pixel pode falar com
// outros hosts — ex.: gateways da API de conversões); fora o YouTube, que é do vídeo
const META = /^https?:\/\/(?!localhost|127\.0\.0\.1|[^/]*youtube|[^/]*ytimg|[^/]*ggpht|[^/]*googlevideo|[^/]*doubleclick|[^/]*google)/

const cenarios = await porLargura([largura], async ({ page }) => {
  const registro = []
  let fase = 'carregamento'
  page.on('request', r => {
    if (!META.test(r.url())) return
    const u = new URL(r.url())
    registro.push({ fase, tipo: r.resourceType(), metodo: r.method(), url: `${u.origin}${u.pathname}`, ev: u.searchParams.get('ev') || (r.postData() || '').match(/ev=([A-Za-z]+)/)?.[1] || '', id: u.searchParams.get('id') || u.pathname.match(/config\/(\d+)/)?.[1] || '' })
  })
  const csp = []
  page.on('console', m => { if (/Content Security Policy|Refused/.test(m.text())) csp.push(m.text().slice(0, 240)) })
  const erros = []
  page.on('console', m => { if (m.type() === 'error' && !/Content Security Policy|Refused/.test(m.text())) erros.push(`[${fase}] ${m.text().slice(0, 200)}`) })
  page.on('pageerror', e => erros.push('pageerror: ' + e.message))
  const avisoVisivel = () => page.evaluate(() => !document.getElementById('aviso-cookies').hidden)
  const clicarCompras = async () => {
    for (const sel of ['[data-copy="d1.cta1"]', '[data-copy="d6.cta"]']) {
      await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel)
      await page.waitForTimeout(300)
      await page.click(sel)
      await page.waitForTimeout(800)
    }
    await page.evaluate(() => document.querySelector('a[data-video]').scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)
    const antes = fase
    fase = 'video'
    await page.click('a[data-video]')
    await page.waitForTimeout(2500)
    fase = antes
  }
  const out = {}

  // A · sem escolha
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(6000)
  out.A = { aviso: await avisoVisivel(), req: registro.splice(0) }

  // B · aceitar + cliques
  fase = 'aceite'
  await page.click('[data-consentimento="aceito"]')
  await page.waitForTimeout(4000)
  fase = 'cliques'
  await clicarCompras()
  out.B = { aviso: await avisoVisivel(), req: registro.splice(0) }

  // D · recarregar depois de aceitar
  fase = 'recarga'
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(6000)
  out.D = { aviso: await avisoVisivel(), req: registro.splice(0) }

  // C · recusar (do zero)
  fase = 'carregamento'
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(1000)
  fase = 'recusa'
  await page.click('[data-consentimento="recusado"]')
  await page.waitForTimeout(3000)
  fase = 'cliques'
  await clicarCompras()
  const reqC = registro.splice(0)
  fase = 'recarga'
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(6000)
  out.C = { aviso: await avisoVisivel(), req: [...reqC, ...registro.splice(0)] }

  // reabrir pelo rodapé
  await page.click('[data-abre-cookies]')
  out.reabre = await avisoVisivel()
  return { out, csp: [...new Set(csp)], erros: [...new Set(erros)] }
}, {
  movimento: true,
  // o fbevents.js não envia nada em navegador automatizado (navigator.webdriver): aqui o
  // navegador se apresenta como um visitante comum, para o teste ver o que sairia de fato
  antesDeCarregar: p => p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })),
  contexto: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' },
})

const { out, csp, erros } = cenarios[0]
const mostra = r => r.length ? r.map(x => `      ${x.fase.padEnd(12)} ${x.tipo.padEnd(10)} ${x.metodo} ${x.url}${x.ev ? `  ev=${x.ev}` : ''}${x.id ? `  id=${x.id}` : ''}`).join('\n') : '      (nenhuma requisição ao Meta)'
const eventos = r => r.filter(x => x.ev)
console.log(`\nA · sem escolha (aviso ${out.A.aviso ? 'aberto' : 'FECHADO'}) — eventos enviados: ${eventos(out.A.req).length}\n${mostra(out.A.req)}`)
console.log(`\nB · Aceitar + cliques (aviso ${out.B.aviso ? 'ABERTO' : 'fechado'}) — eventos: ${eventos(out.B.req).map(x => `${x.ev}@${x.id}`).join(', ') || 'nenhum'}\n${mostra(out.B.req)}`)
console.log(`\nD · recarga depois de aceitar (aviso ${out.D.aviso ? 'ABERTO' : 'fechado'}) — eventos: ${eventos(out.D.req).map(x => `${x.ev}@${x.id}`).join(', ') || 'nenhum'}\n${mostra(out.D.req)}`)
console.log(`\nC · Recusar + cliques + recarga (aviso ${out.C.aviso ? 'ABERTO' : 'fechado'}) — eventos: ${eventos(out.C.req).length}\n${mostra(out.C.req)}`)
console.log(`\nlink "Cookie" do rodapé reabre o aviso: ${out.reabre ? 'sim' : 'NÃO'}`)
console.log(`\nviolações de CSP: ${csp.length ? '\n  ' + csp.join('\n  ') : 'nenhuma'}`)
console.log(`erros no console: ${erros.length ? '\n  ' + erros.join('\n  ') : 'nenhum'}`)
const falhas = []
if (eventos(out.A.req).length) falhas.push('evento enviado SEM consentimento (A)')
if (eventos(out.C.req).length) falhas.push('evento enviado depois de RECUSAR (C)')
for (const ev of ['PageView', 'InitiateCheckout', 'ViewContent']) if (!eventos(out.B.req).some(x => x.ev === ev)) falhas.push(`B sem ${ev}`)
if (!eventos(out.D.req).some(x => x.ev === 'PageView')) falhas.push('D sem PageView')
if (out.D.aviso || out.C.aviso) falhas.push('o aviso voltou depois da escolha')
if (!out.reabre) falhas.push('o link Cookie não reabre o aviso')
if (falhas.length) { console.error('\nFALHOU: ' + falhas.join(' · ')); process.exit(1) }
console.log('\nOK')
