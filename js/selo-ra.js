// Selo do Reclame Aqui no rodapé (cópia da home). É script de TERCEIRO: só é pedido
// depois da página pronta (evento load) e quando o rodapé chega perto da tela — não
// pesa no LCP nem no TBT, e quem não rola até o fim não baixa nada dele.
// A caixa do selo tem altura reservada no CSS (#ra-verified-seal): CLS 0 ao aparecer.
// Domínios que ele usa (liberados na CSP do .htaccess): s3.amazonaws.com
// (/raichu-beta/ra-verified/), api.reclameaqui.com.br, fonts.googleapis.com e
// fonts.gstatic.com. Sem JS, o selo não aparece (a caixa fica vazia).

(() => {
  const alvo = document.getElementById('ra-verified-seal')
  if (!alvo) return

  const carregar = () => {
    const s = document.createElement('script')
    s.id = 'ra-embed-verified-seal'
    s.src = 'https://s3.amazonaws.com/raichu-beta/ra-verified/bundle.js'
    s.async = true
    s.dataset.id = 'WDRYanlCUWlyT0xFUTFZeDp6ZXJvNy10ZXNvdXJhcmlh'
    s.dataset.target = 'ra-verified-seal'
    s.dataset.model = '2'
    alvo.append(s)
  }

  const quandoPerto = () => {
    if (!('IntersectionObserver' in window)) return carregar()
    const obs = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) {
        obs.disconnect()
        carregar()
      }
    }, { rootMargin: '800px 0px' })
    obs.observe(alvo)
  }

  if (document.readyState === 'complete') quandoPerto()
  else addEventListener('load', quandoPerto, { once: true })
})()
