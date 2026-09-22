// Meta Pixel — os mesmos do site da Zero7 (instalados lá pelo GTM-KCJQPMC), só pelo
// navegador (sem API de conversões). Arquivo próprio, sem script inline: a CSP segue
// sem 'unsafe-inline'. Sem a tag <noscript> do Pixel.
//
// SEM pedido de consentimento (decisão do Gustavo, 2026-09-22 — como a home). A versão
// com aviso de cookies e consentimento está guardada em docs/aviso-cookies.md.
//
// Carregamento: a fila do fbq nasce já (os cliques não se perdem); o fbevents.js (~110 KB,
// a maior tarefa longa da home) só é pedido depois da página pronta (evento load + tempo
// ocioso) — não pesa no LCP.
//
// Eventos: PageView (carregamento) · InitiateCheckout (botões de compra d1.cta1 e d6.cta,
// antes de ir para o checkout) · ViewContent (vídeo da #demonstracao carregado pelo play).

(() => {
  const IDS = ['757410515694979', '553722946901869']
  const FBEVENTS = 'https://connect.facebook.net/en_US/fbevents.js'

  // fila do fbq (o trecho padrão do Meta, sem o <script> inline e sem baixar nada ainda)
  const w = window
  if (!w.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments)
    }
    if (!w._fbq) w._fbq = fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    // sem PageView automático em mudança de URL (hash/pushState) — como o disablePushState
    // da tag do GTM na home
    fbq.disablePushState = true
    // sem a configuração remota de cada pixel (signals/config, ~440 KB cada): é ela que liga
    // o "OpenBridge"/CAPI Gateway (cópia dos eventos para servidores da API de conversões,
    // que não queremos) e os plugins automáticos. Os eventos seguem direto para /tr/.
    fbq.disableConfigLoading = true
    w.fbq = fbq
  }

  for (const id of IDS) {
    // sem eventos automáticos (cliques em botões, dados da página): só os 3 escolhidos
    w.fbq('set', 'autoConfig', false, id)
    w.fbq('init', id)
  }
  w.fbq('track', 'PageView')

  const baixar = () => {
    const s = document.createElement('script')
    s.async = true
    s.src = FBEVENTS
    document.head.append(s)
  }
  const quandoOcioso = fn => ('requestIdleCallback' in w ? w.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500))
  if (document.readyState === 'complete') quandoOcioso(baixar)
  else addEventListener('load', () => quandoOcioso(baixar), { once: true })

  // eventos de conversão
  for (const botao of document.querySelectorAll('[data-copy="d1.cta1"], [data-copy="d6.cta"]')) {
    botao.addEventListener('click', () => w.fbq('track', 'InitiateCheckout'))
  }
  for (const video of document.querySelectorAll('a[data-video]')) {
    video.addEventListener('click', () => w.fbq('track', 'ViewContent'), { once: true })
  }
})()
