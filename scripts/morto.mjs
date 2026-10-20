// npm run morto
// Procura código morto: classe no CSS que nenhum HTML ou JS usa, e token definido no
// tokens.css que ninguém referencia. Serve para não deixar sobra quando uma seção sai.
//
// Olha index.html, amostra.html e js/*.js (uma classe pode ser usada só pelo script).
// Lista também o contrário: classe usada no HTML sem nenhuma regra no CSS (pode ser só
// gancho de JS ou de teste, por isso é aviso, não erro).
// Falha com código 1 se achar classe ou token morto; --so-aviso só reporta.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ } from './comum.mjs'

const ler = p => fs.readFileSync(path.join(RAIZ, p), 'utf8')
const arquivos = d => fs.readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith(d === 'css' ? '.css' : '.js')).map(f => `${d}/${f}`)

const CSS = arquivos('css')
const JS = arquivos('js')
const HTML = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'))

// classes que cada CSS define, e onde
const definidas = new Map() // classe → [arquivo]
for (const f of CSS) {
  const css = ler(f).replace(/\/\*[\s\S]*?\*\//g, '')
  // varredura de chaves: o seletor é o texto acumulado até cada "{" (zerado em "}"),
  // então regras dentro de @media contam igual; at-rules (@media, @font-face) são puladas
  let sel = ''
  for (const ch of css) {
    if (ch === '{' || ch === '}') {
      if (ch === '{' && sel.trim() && !sel.trim().startsWith('@')) {
        for (const m of sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
          if (!definidas.has(m[1])) definidas.set(m[1], [])
          if (!definidas.get(m[1]).includes(f)) definidas.get(m[1]).push(f)
        }
      }
      sel = ''
    } else sel += ch
  }
}

// classes usadas no HTML (atributo class) e citadas no JS (qualquer string)
const usadas = new Set()
const usadasHtml = new Set()
for (const f of HTML) {
  const html = ler(f)
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) { usadas.add(c); usadasHtml.add(c) }
  // seletores escritos em atributos (ex.: data-* não; mas querySelector no HTML não existe)
}
const textoJs = JS.map(ler).join('\n')
for (const c of definidas.keys()) {
  // no JS: '.classe' ou "classe" dentro de querySelector/matches/classList
  if (new RegExp(`[.'"\`]${c.replace(/[-]/g, '\\-')}['"\`.\\s,:)\\]]`).test(textoJs)) usadas.add(c)
}

// Classes e tokens que NINGUÉM na página referencia, mas têm dono conhecido. Cada um
// com o motivo: se o motivo sumir, sai daqui e vira código morto de novo.
const CLASSES_OK = {
  lenis: 'o Lenis (js/vendor) põe no <html> em tempo de execução',
  'lenis-autoToggle': 'idem',
  'lenis-stopped': 'idem',
  'lenis-smooth': 'idem',
  'is-disabled': 'estado do componente botão, a par de .is-hover/.is-active/.is-focus (amostra)',
  contato: 'div do rodapé copiado da home: não tem estilo próprio (regras são do #footer)',
  pendente: 'componente de PENDENTE (regra 4): existe para quando um texto faltar; os scripts o procuram',
}
const TOKENS_OK = {
  '--css-carregado': 'lido por scripts/comum.mjs para provar que o CSS carregou',
  '--fonte-display-alternativa': 'alternativa documentada da display (CONTEXTO): não entra em página nenhuma',
  '--esp-32': 'degrau da escala de espaço (a escala é contínua; degrau sem uso hoje)',
  '--raio-campo': 'degrau da escala de raio, para campos de formulário',
}
const mortas = [...definidas.entries()].filter(([c]) => !usadas.has(c) && !CLASSES_OK[c])
const semRegra = [...usadasHtml].filter(c => !definidas.has(c))

// tokens: definidos em tokens.css × usados em var(--x) em qualquer css/js/html
const tokensCss = ler('css/tokens.css')
const defTokens = [...new Set([...tokensCss.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]))]
const tudo = CSS.map(ler).join('\n') + JS.map(ler).join('\n') + HTML.map(ler).join('\n')
const tokensMortos = defTokens.filter(t => {
  const usos = [...tudo.matchAll(new RegExp(`var\\(\\s*${t}\\b`, 'g'))].length
  const citado = new RegExp(`['"\`]${t}['"\`]`).test(tudo) // lido por JS (getPropertyValue)
  return usos === 0 && !citado && !TOKENS_OK[t]
})

// o contrário: var(--x) sem nenhuma definição (quebra silenciosa — a propriedade cai
// para o valor inicial). Ignora os que têm reserva: var(--x, algo).
const usadosSemReserva = new Set()
for (const f of [...CSS, ...JS, ...HTML]) {
  for (const m of ler(f).matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) if (m[2] === ')') usadosSemReserva.add(m[1])
}
// definições em QUALQUER css (tokens.css ou dentro de um componente)
// definições em qualquer CSS ou em style="" no HTML (a amostra define --c inline)
const defTodos = new Set([...CSS, ...HTML].flatMap(f => [...ler(f).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1])))
const semDefinicao = [...usadosSemReserva].filter(t => !defTodos.has(t))

const lista = (titulo, itens, fmt = x => x) => {
  console.log(`\n${titulo}: ${itens.length}`)
  for (const i of itens) console.log('  ' + fmt(i))
}
lista('classes no CSS que ninguém usa', mortas, ([c, fs_]) => `.${c}  (${fs_.join(', ')})`)
lista('classes no HTML sem regra no CSS (aviso)', semRegra, c => `.${c}`)
lista('tokens definidos e nunca usados', tokensMortos)
lista('tokens usados SEM definição (var(--x) sem reserva)', semDefinicao)

if ((mortas.length || tokensMortos.length || semDefinicao.length || semRegra.filter(c => !CLASSES_OK[c]).length) && !process.argv.includes('--so-aviso')) {
  console.error('\nFALHOU: há código morto (classe ou token sem uso)')
  process.exit(1)
}
