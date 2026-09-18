// Vídeo da #demonstracao com capa clicável. NADA do YouTube carrega antes do clique:
// a capa é local. Sem JS, o link abre o vídeo no YouTube.
// Com JS, o clique (ou Enter) troca o link, no mesmo espaço (.demo__quadro, com
// aspect-ratio reservado — CLS 0), por um iframe do youtube-nocookie tocando; o
// title do iframe é lido do título da seção, não escrito à mão; o foco vai para ele.

(() => {
  for (const link of document.querySelectorAll('a[data-video]')) {
    link.addEventListener('click', evento => {
      evento.preventDefault()
      const id = link.dataset.video
      const titulo = document.getElementById(link.getAttribute('aria-labelledby'))
      const quadro = document.createElement('iframe')
      quadro.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`
      quadro.title = titulo ? titulo.textContent.trim() : ''
      quadro.allow = 'autoplay; encrypted-media; picture-in-picture'
      quadro.allowFullscreen = true
      quadro.loading = 'lazy'
      quadro.referrerPolicy = 'strict-origin-when-cross-origin'
      link.replaceWith(quadro)
      quadro.focus()
    })
  }
})()
