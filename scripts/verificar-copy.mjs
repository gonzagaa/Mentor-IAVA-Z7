// Compara a página com copy/copy.json, bloco a bloco, nas 9 larguras.
// Falha com código 1 se houver qualquer divergência, ausência, duplicata ou órfão.
//
// A comparação colapsa espaços e apara as pontas dos DOIS lados: o HTML colapsa
// espaços na renderização, então é a única comparação que pode passar. O texto no
// index.html continua literal, byte a byte igual ao do json.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, porLargura, colapsar } from './comum.mjs'

const copy = JSON.parse(fs.readFileSync(path.join(RAIZ, 'copy/copy.json'), 'utf8'))
const blocosCopy = copy.filter(b => b.tipo === 'copy')
const blocosPendentes = copy.filter(b => b.tipo === 'pendente')
const larguras = lerLarguras()

// Colhe tudo da página numa passada só.
async function colher(page) {
  return page.evaluate(() => {
    const visivel = el => {
      if (!el || !el.isConnected) return false
      const e = el.nodeType === 3 ? el.parentElement : el
      if (!e) return false
      const s = getComputedStyle(e)
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
      return !!(e.getClientRects().length)
    }

    // elementos com data-copy
    const porId = {}
    for (const el of document.querySelectorAll('[data-copy]')) {
      const id = el.getAttribute('data-copy')
      ;(porId[id] ||= []).push({ texto: el.textContent, tag: el.tagName.toLowerCase(), visivel: visivel(el) })
    }

    // elementos .pendente
    const pendentes = [...document.querySelectorAll('.pendente')].map(el => ({
      id: el.getAttribute('data-pendente'),
      texto: el.textContent,
      visivel: visivel(el),
    }))

    // varredura de nós de texto visíveis, procurando órfãos
    const orfaos = []
    const andarilho = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = andarilho.nextNode(); n; n = andarilho.nextNode()) {
      if (!n.nodeValue.trim()) continue
      const pai = n.parentElement
      if (!pai) continue
      if (pai.closest('[data-copy]') || pai.closest('.pendente')) continue
      if (!visivel(pai)) continue
      const caminho = []
      for (let e = pai; e && e !== document.body; e = e.parentElement) {
        caminho.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''))
      }
      orfaos.push({ texto: n.nodeValue.trim(), onde: caminho.join(' > ') })
    }

    // hrefs pendentes dos botões de compra
    const hrefsPendentes = [...document.querySelectorAll('[data-pendente-href]')].map(el => ({
      id: el.getAttribute('data-copy') || el.tagName.toLowerCase(),
      destino: el.getAttribute('data-pendente-href'),
      href: el.getAttribute('href'),
    }))

    return { porId, pendentes, orfaos, hrefsPendentes }
  })
}

const problemas = []
const reg = (largura, msg) => problemas.push(`  [${largura}px] ${msg}`)
let ultimo = null

await porLargura(larguras, async ({ page, largura }) => {
  const d = await colher(page)
  ultimo = d

  // 1 · cada bloco copy: existe exatamente um elemento, e o texto é idêntico
  for (const bloco of blocosCopy) {
    const achados = d.porId[bloco.id]
    if (!achados) { reg(largura, `FALTA    ${bloco.id} — nenhum elemento com data-copy="${bloco.id}"`); continue }
    if (achados.length > 1) { reg(largura, `DUPLICADO ${bloco.id} — ${achados.length} elementos`); continue }
    const [el] = achados
    if (!el.visivel) reg(largura, `INVISÍVEL ${bloco.id} — está no DOM mas não aparece`)
    const naPagina = colapsar(el.texto)
    const noJson = colapsar(bloco.texto)
    if (naPagina !== noJson) {
      reg(largura, `DIVERGE  ${bloco.id}\n` +
        `            json : ${JSON.stringify(noJson)}\n` +
        `            página: ${JSON.stringify(naPagina)}`)
    }
  }

  // 2 · todo data-copy da página existe no json
  const idsJson = new Set(blocosCopy.map(b => b.id))
  for (const id of Object.keys(d.porId)) {
    if (!idsJson.has(id)) reg(largura, `INVENTADO data-copy="${id}" não existe no copy.json`)
  }

  // 3 · todo pendente do json existe na página
  const idsNaPagina = new Set(d.pendentes.map(p => p.id))
  for (const bloco of blocosPendentes) {
    if (!idsNaPagina.has(bloco.id)) reg(largura, `FALTA PENDENTE ${bloco.id} — nenhum .pendente com data-pendente="${bloco.id}"`)
  }
  for (const p of d.pendentes) {
    if (!p.id) reg(largura, '.pendente sem atributo data-pendente')
    else if (!blocosPendentes.some(b => b.id === p.id)) reg(largura, `PENDENTE INVENTADO data-pendente="${p.id}" não existe no copy.json`)
    else if (!p.visivel) reg(largura, `PENDENTE INVISÍVEL ${p.id} — pendente tem que saltar aos olhos`)
  }

  // 4 · destino dos botões de compra
  for (const h of d.hrefsPendentes) {
    if (!blocosPendentes.some(b => b.id === h.destino)) {
      reg(largura, `data-pendente-href="${h.destino}" em ${h.id} não é um pendente do copy.json`)
    }
  }

  // 5 · órfãos
  for (const o of d.orfaos) {
    reg(largura, `ÓRFÃO    ${JSON.stringify(o.texto.slice(0, 80))} em ${o.onde}`)
  }
})

const orfaos = ultimo ? ultimo.orfaos.length : 0
const pendentes = ultimo ? ultimo.pendentes.length : 0

if (problemas.length) {
  const comDefeito = new Set(
    blocosCopy.map(b => b.id).filter(id => problemas.some(p => p.includes(id)))
  )
  console.error(`\nFALHOU · larguras: ${larguras.join(', ')}`)
  console.error(problemas.join('\n'))
  console.error(`\n${blocosCopy.length - comDefeito.size}/${blocosCopy.length} idênticos · ` +
    `${orfaos} órfãos · ${pendentes} pendentes · ${problemas.length} problema(s)`)
  process.exit(1)
}

console.log(`${blocosCopy.length}/${blocosCopy.length} idênticos · ${orfaos} órfãos · ${pendentes} pendentes`)
console.log(`(conferido em ${larguras.length} largura(s): ${larguras.join(', ')})`)
