// Lista os pendentes que estão na página, com seção e descrição.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, porLargura } from './comum.mjs'

const copy = JSON.parse(fs.readFileSync(path.join(RAIZ, 'copy/copy.json'), 'utf8'))
const porIdJson = new Map(copy.map(b => [b.id, b]))
const larguras = lerLarguras()

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
      })),
    }
  })
)

console.log(`\n${pagina.pendentes.length} pendente(s) na página\n`)
for (const p of pagina.pendentes) {
  const bloco = porIdJson.get(p.id)
  console.log(`  ${p.id}`)
  console.log(`    onde na página : ${p.ondeNaPagina}`)
  console.log(`    seção no copy  : ${bloco ? bloco.secao : '⚠ id não existe no copy.json'}`)
  console.log(`    descrição      : ${bloco ? bloco.descricao : '—'}`)
  const refs = pagina.hrefs.filter(h => h.destino === p.id)
  if (refs.length) console.log(`    usado como href: ${refs.map(r => r.quem).join(', ')}`)
  console.log('')
}

const naPagina = new Set(pagina.pendentes.map(p => p.id))
const faltando = copy.filter(b => b.tipo === 'pendente' && !naPagina.has(b.id))
if (faltando.length) {
  console.log(`⚠ pendentes do copy.json que NÃO estão na página: ${faltando.map(b => b.id).join(', ')}`)
}
console.log(`(conferido em ${larguras.length} largura(s): ${larguras.join(', ')})`)
