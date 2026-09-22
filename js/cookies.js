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
