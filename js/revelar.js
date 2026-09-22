// Animações de entrada da página, TODAS aqui, com GSAP + ScrollTrigger (js/vendor/).
// Nenhuma animação de entrada em CSS: nada disputa `transform` com o GSAP.
//
// PROGRESSIVE ENHANCEMENT: o CSS descreve só o estado FINAL. O estado escondido só é
// aplicado aqui, depois de confirmar que o GSAP carregou — sem JS, sem as bibliotecas
// ou com prefers-reduced-motion (gsap.matchMedia), tudo fica visível e parado.
// O H1 da hero não é tocado (nasce visível).
//
//   data-revelar            → opacidade + subida curta (--revelar-deslocamento), via
//                             --revelar-opacidade / --revelar-y lidas pelo CSS
//   data-revelar="acender"  → não some: acende (--acesa 0 → 1; .lista-barra da #dor)
//   data-revelar-atraso="N" → N × --revelar-passo DENTRO do lote que entra junto
//   .comparativo__iava      → + o glow do card sobe (--acesa no ::after)
//   .provas__painel         → + barras de candle subindo e contagem dos [data-contar]
//   data-inclinar           → a moldura endireita conforme sobe na tela (--inclinar)
//
// Uma vez por elemento, disparando com o elemento ~15% dentro da tela. O que já está
// na tela (ou acima dela) quando o script roda nasce pronto: nada pisca.
//
// Atraso RELATIVO ao lote: elementos que cruzam a linha juntos entram em sequência
// (os três "Talvez" lado a lado, uma linha de cards); um elemento que entra sozinho
// (uma coluna no celular) anima na hora, sem tempo morto na tela.

(() => {
  const { gsap, ScrollTrigger } = window
  if (!gsap || !ScrollTrigger) return
  gsap.registerPlugin(ScrollTrigger)

  const raiz = document.documentElement
  const token = nome => getComputedStyle(raiz).getPropertyValue(nome).trim()
  const segundos = nome => parseFloat(token(nome)) / 1000 // "400ms" e "1200" → s
  const px = nome => {
    const v = token(nome)
    return v.endsWith('rem') ? parseFloat(v) * parseFloat(getComputedStyle(raiz).fontSize) : parseFloat(v)
  }
  // --saida (cubic-bezier .22,1,.36,1) e --saida-suave (.33,1,.68,1) em eases do GSAP
  const SAIDA = 'power4.out'
  const SAIDA_SUAVE = 'power2.out'
  const INICIO = 'top 85%'

  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const DUR = segundos('--dur-lenta')
    const PASSO = segundos('--revelar-passo')
    const VELA = segundos('--vela-passo')
    const CONTAGEM = segundos('--dur-contagem')
    const DESLOCAMENTO = px('--revelar-deslocamento')

    const abaixoDaTela = el => el.getBoundingClientRect().top >= innerHeight
    const atraso = el => Number(el.dataset.revelarAtraso) || 0

    // ─── estados escondidos (só do que ainda vai entrar) ───
    // Custo no celular (CPU 4× mais lenta) medido com o TBT: primeiro TODAS as leituras
    // (posições e o limite de inclinação), depois só ESCRITAS de variáveis CSS, direto
    // no style — sem ler estilo computado entre uma escrita e outra (cada leitura
    // forçaria um recálculo de estilo da página).
    const alvos = [...document.querySelectorAll('[data-revelar]')].filter(abaixoDaTela)
    const molduras = [...document.querySelectorAll('[data-inclinar]')]
      .map(el => ({ el, max: parseFloat(getComputedStyle(el).getPropertyValue('--inclinar-max')) || 0, abaixo: abaixoDaTela(el) }))
      .filter(m => m.max)
    // o que foi escrito à mão é desfeito à mão se a preferência de movimento mudar
    const escritos = []
    const escrever = (els, props) => {
      for (const el of els) for (const [k, v] of Object.entries(props)) { el.style.setProperty(k, v); escritos.push([el, k]) }
    }
    escrever(alvos.filter(el => el.dataset.revelar !== 'acender'), { '--revelar-opacidade': '0', '--revelar-y': `${DESLOCAMENTO}px` })
    escrever(alvos.filter(el => el.dataset.revelar === 'acender' || el.matches('.comparativo__iava')), { '--acesa': '0' })
    escrever(alvos.filter(el => el.matches('.provas__painel')).flatMap(el => [...el.querySelectorAll('.vela')]), { '--subir': '0' })
    // moldura já na tela ao carregar: quem define a inclinação é o gatilho (pela posição)
    for (const { el, max, abaixo } of molduras) if (abaixo) escrever([el], { '--inclinar': `${max}deg` })

    // contagem: só a parte numérica anima; "+", " mil" e o ponto de milhar ficam em
    // todos os quadros. A caixa é travada no tamanho do valor final enquanto conta
    // (a NCS Radhiumz não tem algarismos tabulares): CLS 0. Termina no texto da copy.
    const milhar = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const contar = el => {
      const final = el.textContent
      const m = final.match(/\d[\d.]*/)
      if (!m) return null
      const antes = final.slice(0, m.index)
      const depois = final.slice(m.index + m[0].length)
      const pontuado = m[0].includes('.')
      const valor = { v: 0 }
      return gsap.to(valor, {
        v: Number(m[0].replace(/\./g, '')),
        duration: CONTAGEM,
        ease: 'power3.out',
        onStart() {
          const r = el.getBoundingClientRect()
          gsap.set(el, { inlineSize: r.width, blockSize: r.height })
        },
        onUpdate() {
          const n = Math.round(valor.v)
          el.textContent = antes + (pontuado ? milhar(n) : String(n)) + depois
        },
        onComplete() {
          el.textContent = final
          gsap.set(el, { clearProps: 'inlineSize,blockSize' })
        },
      })
    }

    const entrar = (el, espera) => {
      const tl = gsap.timeline({ delay: espera })
      if (el.dataset.revelar === 'acender') {
        tl.to(el, { '--acesa': 1, duration: DUR, ease: SAIDA })
      } else {
        tl.to(el, { '--revelar-opacidade': 1, '--revelar-y': '0px', duration: DUR, ease: SAIDA, clearProps: '--revelar-opacidade,--revelar-y' })
      }
      if (el.matches('.comparativo__iava')) {
        tl.to(el, { '--acesa': 1, duration: DUR, ease: SAIDA_SUAVE }, 2 * PASSO)
      }
      if (el.matches('.provas__painel')) {
        tl.to(el.querySelectorAll('.vela'), { '--subir': 1, duration: DUR, ease: SAIDA, stagger: VELA }, 2 * PASSO)
        for (const n of el.querySelectorAll('[data-contar]')) {
          const t = contar(n)
          if (t) tl.add(t, 0)
        }
      }
    }

    // os gatilhos (a parte mais cara: ~1 ScrollTrigger por elemento) nascem numa tarefa
    // SEPARADA, para nenhuma tarefa longa travar a página; o estado escondido já está
    // aplicado e, se a página rolou nesse meio-tempo, o que já passou da linha entra
    // assim que o gatilho nasce.
    const depois = fn => setTimeout(fn, 0)

    if (alvos.length) depois(() => {
      ScrollTrigger.batch(alvos, {
        start: INICIO,
        once: true,
        onEnter: lote => {
          const base = Math.min(...lote.map(atraso))
          for (const el of lote) entrar(el, (atraso(el) - base) * PASSO)
        },
      })
    })

    // ─── molduras inclinadas: endireitam conforme sobem na tela ───
    // Ligadas à rolagem (scrub com leve suavização); retas ao chegar a 30% do topo e
    // ficam retas (uma vez só). Só mexe em --inclinar, lido num transform do CSS.
    if (molduras.length) depois(() => { for (const { el, max } of molduras) {
      gsap.fromTo(el, { '--inclinar': `${max}deg` }, {
        '--inclinar': '0deg',
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'top 30%',
          scrub: 0.5,
          onLeave: self => {
            const animacao = self.animation
            self.kill(false, true)
            gsap.to(animacao, { progress: 1, duration: 0.3, ease: SAIDA_SUAVE })
          },
        },
      })
    } })

    return () => { for (const [el, k] of escritos) el.style.removeProperty(k) }
  })
})()
