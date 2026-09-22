// npm run imagens
// Inventário das imagens da página: para cada arquivo usado (src, srcset, <source>,
// imagem de fundo do CSS), as dimensões e o peso em disco e o tamanho REAL de exibição
// (px CSS) em cada uma das 9 larguras. Soma o peso das imagens que a página referencia.
// Serve para decidir o tamanho das versões responsivas (no máximo 2× a maior exibição).

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { RAIZ, LARGURAS, porLargura } from './comum.mjs'

const medidas = await porLargura(LARGURAS, async ({ page, largura }) => {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)) }
    scrollTo(0, 0)
  })
  await page.waitForTimeout(500)
  return page.evaluate(() => {
    const itens = []
    for (const img of document.querySelectorAll('img')) {
      const r = img.getBoundingClientRect()
      const chave = img.closest('picture')?.querySelector('img')?.getAttribute('src') || img.getAttribute('src')
      itens.push({ chave, exibicao: Math.round(r.width), altura: Math.round(r.height), carregada: img.currentSrc.split('/mentor-iava/')[1] || img.currentSrc, lazy: img.loading === 'lazy', dobra: r.top < innerHeight, wh: img.hasAttribute('width') && img.hasAttribute('height') })
    }
    // fundos em CSS (url() em background-image), inclusive ::before/::after
    for (const el of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const bg = getComputedStyle(el, pseudo).backgroundImage
        const m = bg && bg.match(/url\("?([^")]+)"?\)/)
        if (!m || m[1].startsWith('data:')) continue
        const r = el.getBoundingClientRect()
        itens.push({ chave: m[1].split('/mentor-iava/')[1] || m[1], exibicao: Math.round(r.width), altura: Math.round(r.height), carregada: '(fundo CSS)', fundo: true })
      }
    }
    return itens
  }).then(itens => ({ largura, itens }))
})

// todos os arquivos referenciados no HTML/CSS (src, srcset, url())
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')
const css = fs.readdirSync(path.join(RAIZ, 'css')).map(f => fs.readFileSync(path.join(RAIZ, 'css', f), 'utf8')).join('\n')
const refs = new Set()
for (const m of html.matchAll(/(?:src|href)="(img\/[^"]+)"/g)) refs.add(m[1])
for (const m of html.matchAll(/srcset="([^"]+)"/g)) for (const p of m[1].split(',')) refs.add(p.trim().split(' ')[0])
for (const m of html.matchAll(/imagesrcset="([^"]+)"/g)) for (const p of m[1].split(',')) refs.add(p.trim().split(' ')[0])
for (const m of css.matchAll(/url\('\.\.\/(img\/[^']+)'\)/g)) refs.add(m[1])

const kb = b => `${(b / 1024).toFixed(1)} KB`
let total = 0
const linhas = []
for (const ref of [...refs].filter(r => r.startsWith('img/')).sort()) {
  const arq = path.join(RAIZ, ref)
  if (!fs.existsSync(arq)) { linhas.push(`| ${ref} | **FALTA** | | |`); continue }
  const peso = fs.statSync(arq).size
  total += peso
  let dim = '—'
  try { const m = await sharp(arq).metadata(); dim = `${m.width}×${m.height}` } catch {}
  linhas.push(`| ${ref} | ${dim} | ${kb(peso)} |`)
}

// maior exibição de cada imagem (chave = src do <img> ou url do fundo)
const porChave = {}
for (const { largura, itens } of medidas) for (const i of itens) {
  const k = i.chave
  ;(porChave[k] ||= { exib: {}, carregada: {}, lazy: i.lazy, dobra: {}, wh: i.wh, fundo: i.fundo })
  porChave[k].exib[largura] = Math.max(porChave[k].exib[largura] || 0, i.exibicao)
  porChave[k].carregada[largura] = i.carregada
  if (i.dobra) porChave[k].dobra[largura] = true
}

console.log('## Arquivos referenciados\n')
console.log('| arquivo | dimensões | peso |\n| --- | --- | --- |')
console.log(linhas.join('\n'))
console.log(`\n**Total referenciado: ${kb(total)}** (${refs.size} arquivos)\n`)
console.log('## Largura de exibição (px CSS) por largura de tela\n')
console.log(`| imagem | ${LARGURAS.join(' | ')} | maior | 2× | lazy | na 1ª dobra | width/height |`)
console.log(`| --- | ${LARGURAS.map(() => '---').join(' | ')} | --- | --- | --- | --- | --- |`)
for (const [k, v] of Object.entries(porChave).sort()) {
  const maior = Math.max(...Object.values(v.exib))
  console.log(`| ${k}${v.fundo ? ' (fundo)' : ''} | ${LARGURAS.map(l => v.exib[l] ?? '—').join(' | ')} | ${maior} | ${maior * 2} | ${v.fundo ? '—' : v.lazy ? 'sim' : 'não'} | ${Object.keys(v.dobra).join(', ') || '—'} | ${v.fundo ? '—' : v.wh ? 'sim' : '**não**'} |`)
}
