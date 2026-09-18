// Ano do © no rodapé. O HTML já traz o ano como fallback (se o JS falhar, o © nunca
// fica sem ano); aqui ele só é atualizado para o ano corrente do visitante.
(() => {
  const ano = String(new Date().getFullYear())
  for (const el of document.querySelectorAll('[data-ano]')) el.textContent = ano
})()
