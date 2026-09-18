// npm run larguras [-- --larguras=1280,1474,1920]
// Largura real do conteúdo de cada seção pronta (caixa que envolve o que tem texto e
// os cards) e a % da tela; e a medida de leitura: o maior número de caracteres numa
// linha de texto corrido (parágrafos em Inter; > 75 é regressão).

import { lerLarguras, porLargura } from './comum.mjs'

const larguras = process.argv.some(a => a.startsWith('--larguras=')) ? lerLarguras() : [1280, 1474, 1920]
const SECOES = ['hero', 'dor', 'analise', 'para-quem', 'o-que-e', 'provas', 'origem']

const r = await porLargura(larguras, async ({ page, largura }) =>
  page.evaluate(({ SECOES, largura }) => {
    const visivel = el => {
      const s = getComputedStyle(el)
      return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0
    }
    // maior nº de caracteres numa linha do elemento (palavra a palavra, por Range)
    const maiorLinha = el => {
      const linhas = new Map()
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        for (const m of n.nodeValue.matchAll(/\S+/g)) {
          const rg = document.createRange()
          rg.setStart(n, m.index)
          rg.setEnd(n, m.index + m[0].length)
          const q = rg.getClientRects()[0]
          if (!q) continue
          const k = Math.round(q.top / 4)
          linhas.set(k, (linhas.get(k) || 0) + m[0].length + 1)
        }
      }
      return Math.max(0, ...[...linhas.values()].map(v => v - 1))
    }
    const out = {}
    for (const id of SECOES) {
      const sec = document.getElementById(id)
      if (!sec) continue
      const itens = [...sec.querySelectorAll('*')].filter(
        el => visivel(el) && !el.closest('[aria-hidden="true"]') &&
          (el.classList.contains('card') || [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()))
      )
      let esq = Infinity, dir = -Infinity
      for (const el of itens) {
        const q = el.getBoundingClientRect()
        if (!q.width) continue
        esq = Math.min(esq, q.left)
        dir = Math.max(dir, q.right)
      }
      // texto corrido: parágrafos (e spans-bloco de parágrafo) que não são .display
      const corridos = [...sec.querySelectorAll('p, p > span')]
        .filter(el => visivel(el) && !el.closest('.display') && !el.classList.contains('display') && !el.closest('.pendente') &&
          getComputedStyle(el).display !== 'inline' && el.textContent.trim().length > 60)
      const cpl = corridos.map(el => ({ id: el.dataset.copy || el.closest('[data-copy]')?.dataset.copy, c: maiorLinha(el) }))
      const pior = cpl.sort((a, b) => b.c - a.c)[0]
      out[id] = { largura: Math.round(dir - esq), pct: ((dir - esq) / largura * 100).toFixed(1), margem: Math.round(esq), cpl: pior ? `${pior.c} (${pior.id})` : '—' }
    }
    return { largura, out }
  }, { SECOES, largura })
)

console.log('| tela | seção | largura do conteúdo | % da tela | margem esq. | maior linha de texto corrido |')
console.log('| --- | --- | --- | --- | --- | --- |')
for (const { largura, out } of r)
  for (const [id, v] of Object.entries(out))
    console.log(`| ${largura} | #${id} | ${v.largura}px | ${v.pct}% | ${v.margem}px | ${v.cpl} car. |`)
