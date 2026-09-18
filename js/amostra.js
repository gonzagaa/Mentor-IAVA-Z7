// Só para amostra.html (não vai para produção).
// Preenche os rótulos técnicos com valores lidos do CSS de verdade — assim a amostra
// nunca mostra um número que não é o que está aplicado.

(() => {
  const raiz = getComputedStyle(document.documentElement)

  // valor de cada token de cor
  const preencherTokens = () => {
    for (const el of document.querySelectorAll('[data-valor]')) {
      el.textContent = raiz.getPropertyValue(el.dataset.valor).trim().replace(/\s+/g, ' ')
    }
  }

  // font-size efetivo de cada degrau, na largura atual
  const preencherPx = () => {
    for (const el of document.querySelectorAll('[data-px]')) {
      const alvo = el.closest('.amostra-degrau')?.querySelector('.amostra-display')
      if (!alvo) continue
      const px = parseFloat(getComputedStyle(alvo).fontSize)
      el.textContent = `${Math.round(px * 10) / 10}px nesta largura (${innerWidth}px)`
    }
  }

  // contraste WCAG do texto sobre o fundo composto de verdade
  const canais = cor => {
    const m = cor.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }
  }
  const lum = ({ r, g, b }) => {
    const f = v => {
      v /= 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const sobre = (frente, fundo) => ({
    r: frente.r * frente.a + fundo.r * (1 - frente.a),
    g: frente.g * frente.a + fundo.g * (1 - frente.a),
    b: frente.b * frente.a + fundo.b * (1 - frente.a),
  })
  const preencherContraste = () => {
    for (const el of document.querySelectorAll('[data-contraste]')) {
      const linha = el.closest('.amostra-contraste__linha')
      const texto = linha?.querySelector('[data-copy]')
      const caixa = el.closest('.amostra-contraste')
      if (!texto || !caixa) continue
      const fundo = canais(getComputedStyle(caixa).backgroundColor)
      const frente = sobre(canais(getComputedStyle(texto).color), fundo)
      const [a, b] = [lum(frente), lum(fundo)].sort((x, y) => y - x)
      const razao = (a + 0.05) / (b + 0.05)
      el.textContent = `${razao.toFixed(2)}:1 ${razao >= 4.5 ? '✓ AA' : '✗ abaixo de 4.5'}`
    }
  }

  const tudo = () => {
    preencherTokens()
    preencherPx()
    preencherContraste()
  }

  tudo()
  document.fonts?.ready.then(preencherPx)
  addEventListener('resize', preencherPx)
})()
