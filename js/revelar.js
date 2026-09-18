// Revelação no scroll, sem biblioteca. Estilos em css/componentes.css.
//
// PROGRESSIVE ENHANCEMENT: o estado "escondido" só existe depois que este script põe
// .revelar-ativo no <html>. Sem JS, sem IntersectionObserver ou com
// prefers-reduced-motion, ele não faz nada — e tudo aparece no estado final.
//
//   data-revelar            → entra com opacidade + subida curta
//   data-revelar="acender"  → fica apagado e acende ao entrar
//   data-revelar-atraso="N" → espera N × --revelar-passo (sequência)

(() => {
  if (!('IntersectionObserver' in window)) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const alvos = [...document.querySelectorAll('[data-revelar]')]
  if (!alvos.length) return

  const revelar = el => el.classList.add('revelado')

  for (const el of alvos) {
    const passos = Number(el.dataset.revelarAtraso)
    if (passos > 0) el.style.setProperty('--revelar-atraso', passos)
  }

  // o que já está na tela ao carregar aparece direto, antes de o estado escondido
  // existir — nada pisca
  for (const el of alvos) {
    const r = el.getBoundingClientRect()
    if (r.top < innerHeight && r.bottom > 0) revelar(el)
  }

  document.documentElement.classList.add('revelar-ativo')

  const observador = new IntersectionObserver(
    entradas => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue
        revelar(entrada.target)
        observador.unobserve(entrada.target)
      }
    },
    // revela quando o elemento passa da faixa de baixo da tela (lendo, não na borda)
    { rootMargin: '0px 0px -12% 0px' }
  )

  for (const el of alvos) if (!el.classList.contains('revelado')) observador.observe(el)
})()
