// npm run tokens
// 1. Falha se encontrar cor literal (hex, rgb/rgba, hsl/hsla, e também hwb, lab, lch,
//    oklab, oklch, color()) em qualquer CSS que não seja css/tokens.css — nem em
//    <style> nem em style="" dos .html da raiz. Lista arquivo e linha.
// 2. Falha se var(--fonte-display) for usada em qualquer seletor que não seja a
//    classe utilitária .display (em nenhum CSS, nem em HTML), e se a .display não
//    declarar text-transform: uppercase. NCS Radhiumz: sempre caixa alta.
// 3. Falha se houver :hover/:active ou cursor: pointer em elemento não clicável
//    (só <a href>, <button> e .botao). Lista arquivo, linha e seletor.
// 4. Falha se algum link tiver href vazio (href="", sem valor, ou "#" sem
//    data-pendente-href) em qualquer .html da raiz. Destino que não existe é
//    PENDENTE, nunca link que não leva a lugar nenhum.
// 5. Mede o contraste WCAG de --texto-2 e --texto-3 sobre --superficie-2 (os valores
//    lidos do próprio tokens.css) e falha se algum ficar abaixo de 4.5:1.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TOKENS = 'css/tokens.css'

const COR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi

// troca comentários por espaços, preservando quebras de linha (e portanto a numeração)
const semComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
const linhaDe = (texto, indice) => texto.slice(0, indice).split('\n').length

// Só olha VALORES de declaração: seletor como #dor ou #fade nunca é cor.
function coresEmCss(css, deslocamento = 0, textoInteiro = css) {
  const achados = []
  const limpo = semComentarios(css)
  for (const bloco of limpo.matchAll(/\{([^{}]*)\}/g)) {
    const corpo = bloco[1]
    const inicioCorpo = bloco.index + 1
    let pos = 0
    for (const decl of corpo.split(';')) {
      const doisPontos = decl.indexOf(':')
      if (doisPontos >= 0) {
        const valor = decl.slice(doisPontos + 1)
        for (const m of valor.matchAll(COR_LITERAL)) {
          const indice = deslocamento + inicioCorpo + pos + doisPontos + 1 + m.index
          achados.push({ linha: linhaDe(textoInteiro, indice), trecho: decl.trim().replace(/\s+/g, ' ') })
        }
      }
      pos += decl.length + 1
    }
  }
  return achados
}

function coresEmAtributo(valor, indice, textoInteiro) {
  return [...semComentarios(valor).matchAll(COR_LITERAL)].map(() => ({
    linha: linhaDe(textoInteiro, indice),
    trecho: `style="${valor.trim()}"`,
  }))
}

const ocorrencias = []

// CSS
for (const nome of fs.readdirSync(path.join(RAIZ, 'css')).filter(f => f.endsWith('.css')).sort()) {
  const rel = `css/${nome}`
  if (rel === TOKENS) continue
  const css = fs.readFileSync(path.join(RAIZ, rel), 'utf8')
  for (const o of coresEmCss(css)) ocorrencias.push({ arquivo: rel, ...o })
}

// HTML da raiz: <style> e style=""
for (const nome of fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(RAIZ, nome), 'utf8')
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const inicio = m.index + m[0].indexOf('>') + 1
    for (const o of coresEmCss(m[1], inicio, html)) ocorrencias.push({ arquivo: nome, ...o })
  }
  for (const m of html.matchAll(/\sstyle="([^"]*)"/gi)) {
    for (const o of coresEmAtributo(m[1], m.index, html)) ocorrencias.push({ arquivo: nome, ...o })
  }
}

// ── fonte display só pela .display ──
const USO_DISPLAY = /var\(\s*--fonte-display\s*[,)]/g
const CLASSE_DISPLAY = '.display'
const usosDisplay = []
let regraDisplay = null

function varrerDisplay(css, arquivo, deslocamento = 0, textoInteiro = css) {
  const limpo = semComentarios(css)
  for (const bloco of limpo.matchAll(/\{([^{}]*)\}/g)) {
    const antes = limpo.slice(0, bloco.index)
    const corte = Math.max(antes.lastIndexOf('}'), antes.lastIndexOf('{'), antes.lastIndexOf(';'))
    const seletor = antes.slice(corte + 1).trim().replace(/\s+/g, ' ')
    if (seletor === CLASSE_DISPLAY) regraDisplay = { arquivo, corpo: bloco[1] }
    for (const m of bloco[1].matchAll(USO_DISPLAY)) {
      if (seletor === CLASSE_DISPLAY) continue
      const indice = deslocamento + bloco.index + 1 + m.index
      usosDisplay.push({ arquivo, linha: linhaDe(textoInteiro, indice), seletor })
    }
  }
}

for (const nome of fs.readdirSync(path.join(RAIZ, 'css')).filter(f => f.endsWith('.css')).sort()) {
  varrerDisplay(fs.readFileSync(path.join(RAIZ, 'css', nome), 'utf8'), `css/${nome}`)
}
for (const nome of fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(RAIZ, nome), 'utf8')
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    varrerDisplay(m[1], nome, m.index + m[0].indexOf('>') + 1, html)
  }
  for (const m of html.matchAll(/\sstyle="([^"]*)"/gi)) {
    if (USO_DISPLAY.test(m[1])) usosDisplay.push({ arquivo: nome, linha: linhaDe(html, m.index), seletor: 'style=""' })
    USO_DISPLAY.lastIndex = 0
  }
}

const displayMaiuscula = regraDisplay && /text-transform\s*:\s*uppercase/.test(regraDisplay.corpo)

// ── interação só em elemento clicável ──
// Regra (CONTEXTO.md): hover e cursor pointer só em <a href> e <button>. Falha se um
// seletor tiver :hover ou :active num elemento que não seja clicável, ou se uma regra
// com cursor: pointer não mirar um clicável. Clicável = a, button, ou a classe de
// botão do projeto (.botao e variantes, que só vão em <a href>/<button>).
const CLICAVEL = /(^|[\s>+~(])(a|button)(\[[^\]]*\])*$|\.botao(--[\w-]+)?$/
const interacoesProibidas = []

// o "sujeito" da pseudo-classe: o composto (tag/classes/atributos) logo antes dela
const sujeito = (seletor, pseudo) => {
  const i = seletor.indexOf(pseudo)
  const antes = seletor.slice(0, i)
  return antes.replace(/:[\w-]+(\([^)]*\))?/g, '').trim()
}

function varrerInteracao(css, arquivo) {
  const limpo = semComentarios(css)
  for (const bloco of limpo.matchAll(/\{([^{}]*)\}/g)) {
    const antes = limpo.slice(0, bloco.index)
    const corte = Math.max(antes.lastIndexOf('}'), antes.lastIndexOf('{'), antes.lastIndexOf(';'))
    const seletorGrupo = antes.slice(corte + 1).trim().replace(/\s+/g, ' ')
    if (seletorGrupo.startsWith('@')) continue
    const linha = linhaDe(limpo, corte + 1 + (antes.slice(corte + 1).length - antes.slice(corte + 1).trimStart().length))
    const seletores = seletorGrupo.split(',').map(x => x.trim()).filter(Boolean)
    for (const sel of seletores) {
      for (const pseudo of [':hover', ':active']) {
        if (!sel.includes(pseudo)) continue
        const alvo = sujeito(sel, pseudo)
        if (!CLICAVEL.test(alvo)) interacoesProibidas.push({ arquivo, linha, seletor: sel, motivo: `${pseudo} em não clicável` })
      }
    }
    if (/cursor\s*:\s*pointer/.test(bloco[1])) {
      for (const sel of seletores) {
        const alvo = sel.replace(/:[\w-]+(\([^)]*\))?/g, '').trim()
        if (!CLICAVEL.test(alvo)) interacoesProibidas.push({ arquivo, linha, seletor: sel, motivo: 'cursor: pointer em não clicável' })
      }
    }
  }
}

for (const nome of fs.readdirSync(path.join(RAIZ, 'css')).filter(f => f.endsWith('.css')).sort()) {
  varrerInteracao(fs.readFileSync(path.join(RAIZ, 'css', nome), 'utf8'), `css/${nome}`)
}

// ── contraste ──
const tokensCss = semComentarios(fs.readFileSync(path.join(RAIZ, TOKENS), 'utf8'))
const valorToken = nome => {
  const m = tokensCss.match(new RegExp(`${nome}\\s*:\\s*([^;]+);`))
  return m ? m[1].trim() : null
}
const lerCor = v => {
  if (!v) return null
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1]
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }
  }
  m = v.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+)(%?))?\s*\)$/i)
  if (m) {
    const a = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4])
    return { r: +m[1], g: +m[2], b: +m[3], a }
  }
  return null
}
const lum = ({ r, g, b }) => {
  const f = v => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const sobre = (c, f) => ({
  r: c.r * c.a + f.r * (1 - c.a),
  g: c.g * c.a + f.g * (1 - c.a),
  b: c.b * c.a + f.b * (1 - c.a),
})
const razao = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const FUNDO = '--superficie-2'
const fundo = lerCor(valorToken(FUNDO))
const contrastes = ['--texto', '--texto-2', '--texto-3'].map(nome => {
  const valor = valorToken(nome)
  const cor = lerCor(valor)
  if (!cor || !fundo) return { nome, valor, erro: 'não consegui ler o valor' }
  const composta = sobre(cor, fundo)
  const hex = '#' + [composta.r, composta.g, composta.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
  return { nome, valor, hex, razao: razao(composta, fundo) }
})

// ── relatório ──
let falhou = false

if (ocorrencias.length) {
  falhou = true
  console.error(`\nFALHOU · ${ocorrencias.length} cor(es) literal(is) fora de ${TOKENS}:`)
  for (const o of ocorrencias) console.error(`  ${o.arquivo}:${o.linha}   ${o.trecho.slice(0, 110)}`)
} else {
  console.log(`0 cores literais fora de ${TOKENS}`)
}

if (usosDisplay.length) {
  falhou = true
  console.error(`\nFALHOU · var(--fonte-display) fora da classe ${CLASSE_DISPLAY}:`)
  for (const u of usosDisplay) console.error(`  ${u.arquivo}:${u.linha}   seletor: ${u.seletor}`)
} else if (!regraDisplay) {
  falhou = true
  console.error(`\nFALHOU · a classe ${CLASSE_DISPLAY} não existe em nenhum CSS`)
} else if (!displayMaiuscula) {
  falhou = true
  console.error(`\nFALHOU · ${CLASSE_DISPLAY} (${regraDisplay.arquivo}) não declara text-transform: uppercase`)
} else {
  console.log(`--fonte-display só em ${CLASSE_DISPLAY} (${regraDisplay.arquivo}), com text-transform: uppercase`)
}

if (interacoesProibidas.length) {
  falhou = true
  console.error('\nFALHOU · interação em elemento não clicável (hover/cursor só em <a href> e <button>):')
  for (const x of interacoesProibidas) console.error(`  ${x.arquivo}:${x.linha}   ${x.seletor}   → ${x.motivo}`)
} else {
  console.log(':hover, :active e cursor: pointer só em elementos clicáveis (a, button, .botao)')
}

// ── links vazios ──
const linksVazios = []
const vaziosPermitidos = [] // cópia literal do rodapé da Zero7 (decisão do dono)
for (const nome of fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(RAIZ, nome), 'utf8')
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0]
    const href = tag.match(/\shref\s*=\s*(["'])(.*?)\1/i)
    const valor = href ? href[2].trim() : null
    const vazio = valor === null || valor === '' || (valor === '#' && !/data-pendente-href=/.test(tag))
    if (!vazio) continue
    const item = { arquivo: nome, linha: linhaDe(html, m.index), tag: tag.slice(0, 90) }
    // única exceção: href="" marcado data-href-vazio="copia-zero7" (rodapé idêntico
    // ao da home, pedido do dono). Sempre listado, nunca silencioso.
    if (/data-href-vazio="copia-zero7"/.test(tag) && valor === '') vaziosPermitidos.push(item)
    else linksVazios.push(item)
  }
}
if (linksVazios.length) {
  falhou = true
  console.error('\nFALHOU · link com href vazio (destino inexistente deve ser PENDENTE):')
  for (const l of linksVazios) console.error(`  ${l.arquivo}:${l.linha}   ${l.tag}`)
} else {
  console.log('nenhum link com href vazio (e "#" só com data-pendente-href)')
}
if (vaziosPermitidos.length) {
  console.log(`  aviso: ${vaziosPermitidos.length} link(s) com href vazio por cópia do rodapé da Zero7 (data-href-vazio="copia-zero7"):`)
  for (const l of vaziosPermitidos) console.log(`    ${l.arquivo}:${l.linha}   ${l.tag}`)
}

console.log(`\ncontraste sobre ${FUNDO} (${valorToken(FUNDO)}):`)
for (const c of contrastes) {
  if (c.erro) {
    falhou = true
    console.error(`  ${c.nome}: ${c.erro} (${c.valor})`)
    continue
  }
  const ok = c.razao >= 4.5
  if (!ok) falhou = true
  console.log(`  ${c.nome.padEnd(10)} ${c.valor.padEnd(26)} → ${c.hex}  ${c.razao.toFixed(2)}:1  ${ok ? '✓' : '✗ abaixo de 4.5'}`)
}

process.exit(falhou ? 1 : 0)
