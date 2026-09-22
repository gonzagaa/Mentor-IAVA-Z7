// Scroll suave com Lenis (js/vendor/), só na roda do mouse/trackpad (smoothWheel).
// No toque continua o scroll nativo (syncTouch desligado): o do iPhone é melhor que
// qualquer simulação. Teclado, Tab e âncoras seguem nativos; o Lenis acompanha.
//
// Integração oficial com o GSAP: o Lenis anda no ticker do GSAP (autoRaf desligado),
// avisa o ScrollTrigger a cada scroll e o lagSmoothing do ticker fica desligado.
// Com prefers-reduced-motion o Lenis NÃO é iniciado (gsap.matchMedia: se a preferência
// mudar com a página aberta, ele é destruído e o scroll volta a ser nativo).

(() => {
  const { Lenis, gsap, ScrollTrigger } = window
  if (!Lenis || !gsap || !ScrollTrigger) return
  gsap.registerPlugin(ScrollTrigger)

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const lenis = new Lenis({ autoRaf: false, smoothWheel: true, syncTouch: false })
    const quadro = tempo => lenis.raf(tempo * 1000)
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(quadro)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(quadro)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  })
})()
