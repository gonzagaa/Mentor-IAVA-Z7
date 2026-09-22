# Aviso de cookies (LGPD) + Pixel com consentimento — implementação guardada

Removido em 2026-09-22 por decisão do Gustavo: o Meta Pixel passa a disparar SEM pedir
consentimento (como a home, pelo GTM). Esta é a versão com consentimento, como estava no
commit c3ccfbd, para voltar se for preciso (ex.: exigência jurídica da LGPD).

Como era:
- `fbq('consent','revoke')` antes de qualquer `init`; o fbevents.js só era baixado
  depois do "Aceitar" (nenhuma requisição ao Meta antes do aceite); "Aceitar" →
  `grant` e o PageView pendente saía; "Recusar" → nada saía.
- Aviso fixo na base da tela, por cima do conteúdo (CLS 0); escolha em localStorage
  (`mentor-iava:cookies`); o link "Cookie" do rodapé reabria o aviso.
- Textos aprovados pelo Gustavo (copy.json, blocos `cookies.*`):
  - cookies.texto: Usamos cookies para medir o desempenho dos nossos anúncios e melhorar
    sua experiência. Saiba mais na nossa Política de Privacidade. ("Política de
    Privacidade" = link para https://zero7.com.br/politica-de-privacidade/)
  - cookies.aceitar: Aceitar · cookies.recusar: Recusar
- Não cobria o botão da hero nas dobras exigidas (o `npm run medir` conferia).

Para voltar: reponha as partes abaixo, os 3 blocos `cookies.*` no copy.json, o link do
rodapé `<a href="#aviso-cookies" data-abre-cookies data-copy="rodape.cookie">Cookie</a>`
e rode `npm run pixel` (a versão do teste com os cenários de consentimento está no mesmo
commit, scripts/pixel.mjs).

## HTML (depois do </footer>)

```html
  <div class="aviso-cookies" id="aviso-cookies" role="region" aria-labelledby="aviso-cookies-texto" hidden>
    <p class="aviso-cookies__texto" id="aviso-cookies-texto" data-copy="cookies.texto">Usamos cookies para medir o desempenho dos nossos anúncios e melhorar sua experiência. Saiba mais na nossa <a href="https://zero7.com.br/politica-de-privacidade/">Política de Privacidade</a>.</p>
    <div class="aviso-cookies__botoes">
      <button type="button" class="botao botao--primario botao--md" data-consentimento="aceito" data-copy="cookies.aceitar">Aceitar</button>
      <button type="button" class="botao botao--secundario botao--md" data-consentimento="recusado" data-copy="cookies.recusar">Recusar</button>
    </div>
```

## <head>

```html
<link rel="stylesheet" href="css/aviso-cookies.css">   <!-- antes de css/pendente.css -->
<script src="js/cookies.js" defer></script>            <!-- antes de js/pixel.js -->
```

## Tokens (css/tokens.css) e componente (css/componentes.css)

```css
--altura-botao-md: 3rem; /* 48px: botão médio (aviso de cookies), acima do alvo de 44 */
--camada-aviso: 50; /* aviso de cookies acima de tudo */

.botao--md {
  min-block-size: var(--altura-botao-md);
  padding: var(--esp-3) var(--esp-6);
}
```

## css/aviso-cookies.css

```css
/* Aviso de cookies (LGPD) — js/cookies.js mostra/esconde; js/pixel.js só envia algo ao
   Meta depois do "Aceitar".
   Discreto, fixo na base da tela, POR CIMA do conteúdo (position: fixed: não empurra
   nada, CLS 0). Vidro escuro, --raio-z7. O texto fica na medida de leitura; os dois
   botões têm o mesmo tamanho (md, 48px) e o mesmo peso de texto — Recusar tão visível
   quanto Aceitar. Não cobre o botão da hero na primeira dobra (390×844, 430×932, 1280×720,
   1474×830 e 1920×1080 — conferido pelo npm run medir). */

.aviso-cookies {
  position: fixed;
  inset-inline: var(--gutter);
  inset-block-end: var(--esp-3);
  z-index: var(--camada-aviso);
  display: grid;
  gap: var(--esp-4);
  max-inline-size: var(--titulo-bloco-max);
  margin-inline: auto;
  padding: var(--esp-4) var(--esp-5);
  border: var(--borda);
  border-radius: var(--raio-z7);
  background: var(--vidro);
  box-shadow: var(--brilho-interno), var(--glow-sutil);
  -webkit-backdrop-filter: var(--vidro-desfoque);
  backdrop-filter: var(--vidro-desfoque);
}

.aviso-cookies[hidden] {
  display: none;
}

.aviso-cookies__texto {
  max-inline-size: var(--medida-leitura);
  font-size: var(--fs-1);
  line-height: var(--lh-2);
  color: var(--texto-2);
  text-align: start;
}

.aviso-cookies__texto a {
  color: var(--texto);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.aviso-cookies__botoes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--esp-3);
}

/* a partir de 768px: texto à esquerda, botões à direita, numa faixa mais baixa */
@media (min-width: 48rem) {
  .aviso-cookies {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: var(--esp-6);
    padding: var(--esp-3) var(--esp-6); /* baixo: em 1280×720 não pode chegar no botão da hero */
  }

  .aviso-cookies__botoes {
    grid-template-columns: auto auto;
  }
}
```

## js/cookies.js

```js
// Aviso de cookies (LGPD). Guarda a escolha da pessoa em localStorage e avisa o
// js/pixel.js pelo evento "consentimento" (detail: "aceito" ou "recusado").
//   - sem escolha guardada: o aviso aparece (fixo na base da tela, por cima do conteúdo)
//   - Aceitar / Recusar: guarda, esconde o aviso e avisa o pixel; o aviso não volta
//   - o link "Cookie" do rodapé ([data-abre-cookies]) reabre o aviso para mudar a escolha
// Sem JS, o aviso fica escondido (atributo hidden) — e sem JS o pixel também não roda.

(() => {
  const CHAVE = 'mentor-iava:cookies'
  const aviso = document.getElementById('aviso-cookies')

  const ler = () => {
    try { return localStorage.getItem(CHAVE) } catch { return null }
  }
  const gravar = valor => {
    try { localStorage.setItem(CHAVE, valor) } catch { /* sem armazenamento: vale só nesta visita */ }
  }

  // o pixel consulta a escolha por aqui (mesma chave, um lugar só)
  window.consentimentoCookies = { estado: ler }

  if (!aviso) return

  const abrir = () => {
    aviso.hidden = false
  }
  const escolher = valor => {
    gravar(valor)
    aviso.hidden = true
    document.dispatchEvent(new CustomEvent('consentimento', { detail: valor }))
  }

  for (const botao of aviso.querySelectorAll('[data-consentimento]')) {
    botao.addEventListener('click', () => escolher(botao.dataset.consentimento))
  }

  for (const link of document.querySelectorAll('[data-abre-cookies]')) {
    link.addEventListener('click', evento => {
      evento.preventDefault()
      abrir()
      aviso.querySelector('[data-consentimento]')?.focus()
    })
  }

  if (!ler()) abrir()
})()
```

## js/pixel.js (versão com consentimento)

```js
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
```
