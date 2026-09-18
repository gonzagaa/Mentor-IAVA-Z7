// Lista os pendentes que estão na página, com seção e descrição.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, lerPagina, porLargura } from './comum.mjs'

const copy = JSON.parse(fs.readFileSync(path.join(RAIZ, 'copy/copy.json'), 'utf8'))
const porIdJson = new Map(copy.map(b => [b.id, b]))
const larguras = lerLarguras()
const arquivoPagina = lerPagina()

const [pagina] = await porLargura(larguras, async ({ page }) =>
  page.evaluate(() => {
    const secao = el => {
      const s = el.closest('section[id]')
      if (s) return '#' + s.id
      if (el.closest('header')) return 'header'
      if (el.closest('footer')) return 'footer'
      return '(solto)'
    }
    return {
      pendentes: [...document.querySelectorAll('.pendente')].map(el => ({
        id: el.getAttribute('data-pendente'),
        ondeNaPagina: secao(el),
      })),
      hrefs: [...document.querySelectorAll('[data-pendente-href]')].map(el => ({
        destino: el.getAttribute('data-pendente-href'),
        quem: el.getAttribute('data-copy') || el.tagName.toLowerCase(),
        ondeNaPagina: secao(el),
      })),
    }
  }),
  { pagina: arquivoPagina }
)

// destinos de link pendentes que não têm caixa visível (só o data-pendente-href)
const soNoLink = [...new Set(pagina.hrefs.map(h => h.destino))]
  .filter(id => !pagina.pendentes.some(p => p.id === id))
  .map(id => ({ id, ondeNaPagina: pagina.hrefs.find(h => h.destino === id).ondeNaPagina, soNoLink: true }))
const todos = [...pagina.pendentes, ...soNoLink]

console.log(`\n${todos.length} pendente(s) na página (${pagina.pendentes.length} em caixa visível, ${soNoLink.length} só no link)\n`)
for (const p of todos) {
  const bloco = porIdJson.get(p.id)
  console.log(`  ${p.id}`)
  console.log(`    onde na página : ${p.ondeNaPagina}${p.soNoLink ? ' — sem caixa: só no data-pendente-href do link' : ''}`)
  console.log(`    seção no copy  : ${bloco ? bloco.secao : '⚠ id não existe no copy.json'}`)
  console.log(`    descrição      : ${bloco ? bloco.descricao : '—'}`)
  const refs = pagina.hrefs.filter(h => h.destino === p.id)
  if (refs.length) console.log(`    usado como href: ${refs.map(r => r.quem).join(', ')}`)
  console.log('')
}

const naPagina = new Set(todos.map(p => p.id))
const faltando = copy.filter(b => b.tipo === 'pendente' && !naPagina.has(b.id))
if (faltando.length) {
  console.log(`⚠ pendentes do copy.json que NÃO estão na página: ${faltando.map(b => b.id).join(', ')}`)
}
console.log(`(conferido em ${larguras.length} largura(s): ${larguras.join(', ')})`)
