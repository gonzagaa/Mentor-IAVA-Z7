// A tela da #demonstracao entra levemente inclinada (como um notebook abrindo) e se
// endireita conforme a seção sobe na tela. Só mexe em --inclinar, usado num
// transform: nada muda de layout. Sem JS ou com reduced-motion: reta, sem animação.

(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const telas = [...document.querySelectorAll('[data-inclinar]')]
  if (!telas.length) return

  const max = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--inclinar-max')) || 14
  let pendente = false

  const atualizar = () => {
    pendente = false
    for (const el of telas) {
      const r = el.getBoundingClientRect()
      // 0 quando o topo da tela está na base da janela; 1 quando está a 30% do topo
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.7)))
      el.style.setProperty('--inclinar', `${(max * (1 - p)).toFixed(2)}deg`)
    }
  }
  const pedir = () => {
    if (!pendente) {
      pendente = true
      requestAnimationFrame(atualizar)
    }
  }
  addEventListener('scroll', pedir, { passive: true })
  addEventListener('resize', pedir)
  atualizar()
})()
