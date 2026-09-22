// Meta Pixel — os mesmos do site da Zero7 (instalados lá pelo GTM-KCJQPMC), só pelo
// navegador (sem API de conversões). Arquivo próprio, sem script inline: a CSP segue
// sem 'unsafe-inline'. Sem a tag <noscript> do Pixel (ela dispararia sem consentimento).
//
// Consentimento (LGPD), com o aviso do js/cookies.js:
//   - ANTES de qualquer init: fbq('consent', 'revoke') — nada vai para o Meta
//   - "Aceitar": fbq('consent', 'grant') e o PageView pendente é enviado
//   - "Recusar" (ou recusa guardada): nada é enviado
// Carregamento: a fila do fbq nasce já (revogada; os cliques não se perdem), mas o
// fbevents.js (~110 KB, a maior tarefa longa da home) SÓ é pedido depois do "Aceitar" —
// no clique, ou, para quem já aceitou antes, depois da página pronta (load + ocioso).
// Antes do aceite, NENHUMA requisição vai ao Meta (nem o arquivo: o IP da pessoa não
// chega ao Meta sem consentimento), e a primeira visita não paga o custo do fbevents.js
// (TBT no celular: ~480 ms com ele baixado antes do aceite × ~120 ms sem ele).
//
// Eventos: PageView (carregamento) · InitiateCheckout (botões de compra d1.cta1 e d6.cta)
// · ViewContent (vídeo da #demonstracao carregado pelo clique no play).

(() => {
  const IDS = ['757410515694979', '553722946901869']
  const FBEVENTS = 'https://connect.facebook.net/en_US/fbevents.js'
  const estado = () => window.consentimentoCookies?.estado() ?? null

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
    // sem PageView automático em mudança de URL (o href="#" dos CTAs, enquanto o destino
    // é pendente, dispararia um PageView a mais) — como o disablePushState da tag do GTM
    fbq.disablePushState = true
    // sem a configuração remota de cada pixel (signals/config, ~440 KB cada): é ela que liga
    // o "OpenBridge"/CAPI Gateway (cópia dos eventos para servidores da API de conversões,
    // que não queremos) e os plugins automáticos. Os eventos seguem direto para /tr/.
    fbq.disableConfigLoading = true
    w.fbq = fbq
  }

  w.fbq('consent', 'revoke')
  for (const id of IDS) {
    // sem eventos automáticos (cliques em botões, dados da página): só os 3 escolhidos
    w.fbq('set', 'autoConfig', false, id)
    w.fbq('init', id)
  }
  w.fbq('track', 'PageView')

  // o "grant" só vale depois de o fbevents.js carregar (na fila, antes dele, se perde)
  let pedido = false, carregou = false, conceder = false
  const aplicarConsentimento = () => { if (carregou && conceder) w.fbq('consent', 'grant') }
  const baixar = () => {
    if (pedido) return
    pedido = true
    const s = document.createElement('script')
    s.async = true
    s.src = FBEVENTS
    s.onload = () => { carregou = true; aplicarConsentimento() }
    document.head.append(s)
  }
  const quandoOcioso = fn => ('requestIdleCallback' in w ? w.requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500))
  const depoisDaPagina = fn => (document.readyState === 'complete' ? quandoOcioso(fn) : addEventListener('load', () => quandoOcioso(fn), { once: true }))

  // quem já aceitou: baixa depois da página pronta; sem escolha ou com recusa: não baixa
  if (estado() === 'aceito') {
    conceder = true
    depoisDaPagina(baixar)
  }

  document.addEventListener('consentimento', e => {
    if (e.detail === 'aceito') {
      conceder = true
      baixar()
      aplicarConsentimento()
    } else {
      conceder = false
      w.fbq('consent', 'revoke')
    }
  })

  // eventos de conversão (com recusa, nem entram na fila)
  const rastrear = evento => {
    if (estado() === 'recusado') return
    w.fbq('track', evento)
  }
  for (const botao of document.querySelectorAll('[data-copy="d1.cta1"], [data-copy="d6.cta"]')) {
    botao.addEventListener('click', () => rastrear('InitiateCheckout'))
  }
  for (const video of document.querySelectorAll('a[data-video]')) {
    video.addEventListener('click', () => rastrear('ViewContent'), { once: true })
  }
})()
