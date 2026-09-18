// Contagem dos números da #provas ([data-contar]).
//
// O HTML traz sempre o número FINAL. Sem JS, sem IntersectionObserver ou com
// prefers-reduced-motion, nada muda: o texto final é o que aparece (e o que o
// verificador de copy lê).
//
// Sem CLS: antes de contar, a caixa de cada número é travada na largura e altura do
// valor FINAL. A NCS Radhiumz não tem algarismos tabulares — os dígitos mudam de
// largura durante a contagem, mas dentro de uma caixa que não muda de tamanho.
// Só a parte numérica anima; "+", " mil" e o ponto de milhar ficam em todos os quadros.
// Começa quando o card entra na tela, uma vez só, com easing de saída.

(() => {
  if (!('IntersectionObserver' in window)) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const alvos = [...document.querySelectorAll('[data-contar]')]
  if (!alvos.length) return

  const duracao = Number(getComputedStyle(document.documentElement).getPropertyValue('--dur-contagem')) || 1200
  const saida = t => 1 - Math.pow(1 - t, 3)
  const milhar = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const preparar = el => {
    const final = el.textContent
    const m = final.match(/\d[\d.]*/)
    if (!m) return null
    const antes = final.slice(0, m.index)
    const depois = final.slice(m.index + m[0].length)
    const alvo = Number(m[0].replace(/\./g, ''))
    const pontuado = m[0].includes('.')
    // trava a caixa no tamanho do valor final
    const r = el.getBoundingClientRect()
    el.style.inlineSize = `${r.width}px`
    el.style.blockSize = `${r.height}px`
    return { el, final, antes, depois, alvo, pontuado }
  }

  const contar = c => {
    const inicio = performance.now()
    const quadro = agora => {
      const t = Math.min(1, (agora - inicio) / duracao)
      const v = Math.round(c.alvo * saida(t))
      c.el.textContent = c.antes + (c.pontuado ? milhar(v) : String(v)) + c.depois
      if (t < 1) requestAnimationFrame(quadro)
      else c.el.textContent = c.final // termina exatamente no texto da copy
    }
    requestAnimationFrame(quadro)
  }

  const contas = new Map()
  const observador = new IntersectionObserver(
    entradas => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue
        observador.unobserve(e.target)
        const c = contas.get(e.target)
        if (c) contar(c)
      }
    },
    { rootMargin: '0px 0px -12% 0px' }
  )

  // mede e trava tudo depois das fontes (a largura final depende da NCS Radhiumz)
  const iniciar = () => {
    for (const el of alvos) {
      const c = preparar(el)
      if (!c) continue
      contas.set(el, c)
      observador.observe(el)
    }
  }
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(iniciar)
  else iniciar()
})()
