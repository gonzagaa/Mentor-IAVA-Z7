// npm run publicar
// Monta dist/ só com o que vai para zero7.com.br/mentor-iava/:
//   - index.html (sem comentários; as 15 folhas de estilo viram UMA: css/estilo.css)
//   - só os arquivos que o index.html e o CSS referenciam de fato (JS, fontes, imagens
//     otimizadas, favicon) — PNG originais, recortes fora de uso (img/plataforma/topo-*),
//     img/nano/, amostra.*, shots/, medidas/, referencias/, scripts/, copy/,
//     node_modules/, CONTEXTO.md e package.json ficam FORA por construção
//   - as licenças que precisam acompanhar os arquivos: Lenis (MIT) e Inter (OFL). O GSAP
//     leva o aviso de licença no cabeçalho de cada arquivo (mantido intacto).
//   - dist/.htaccess: headers de segurança, CSP estrita, compressão e cache
// Toda URL de CSS, JS, fonte e imagem ganha ?v=<hash do conteúdo>: com cache de 1 ano,
// uma mudança vira URL nova (o index.html não é guardado em cache).
//
// Falha (código 1) se o index.html ou o CSS referenciar arquivo que não esteja no
// dist/. Lista o peso total do pacote (bruto e com gzip).
//
// BLOQUEIO: enquanto a licença Webfonts da NCS Radhiumz não estiver confirmada no
// CONTEXTO.md (linha "Licença NCS Radhiumz (Webfonts): CONFIRMADA"), o dist/ é montado
// mas o script termina com aviso em destaque e código 1: a fonte não pode ir para o ar.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { RAIZ } from './comum.mjs'

const DIST = path.join(RAIZ, 'dist')
const LICENCAS = ['js/vendor/lenis-1.3.26/LICENSE', 'fonts/Inter-LICENSE.txt']
const erros = []

fs.rmSync(DIST, { recursive: true, force: true })
fs.mkdirSync(DIST, { recursive: true })

const ler = rel => fs.readFileSync(path.join(RAIZ, rel))
const hash = buf => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10)
const copiados = new Map() // rel → ?v=hash

function copiar(rel) {
  if (copiados.has(rel)) return copiados.get(rel)
  const origem = path.join(RAIZ, rel)
  if (!fs.existsSync(origem)) { erros.push(`referência para arquivo que não existe: ${rel}`); return '' }
  const buf = fs.readFileSync(origem)
  fs.mkdirSync(path.dirname(path.join(DIST, rel)), { recursive: true })
  fs.writeFileSync(path.join(DIST, rel), buf)
  const v = `?v=${hash(buf)}`
  copiados.set(rel, v)
  return v
}

// tira comentários /* */ do CSS sem tocar em strings
function semComentarios(css) {
  let out = '', i = 0, aspas = null
  while (i < css.length) {
    const c = css[i]
    if (aspas) { out += c; if (c === '\\') { out += css[i + 1]; i += 2; continue } if (c === aspas) aspas = null; i++; continue }
    if (c === '"' || c === "'") { aspas = c; out += c; i++; continue }
    if (c === '/' && css[i + 1] === '*') { const fim = css.indexOf('*/', i + 2); i = fim < 0 ? css.length : fim + 2; continue }
    out += c; i++
  }
  return out.replace(/\n\s*\n+/g, '\n')
}

let html = ler('index.html').toString('utf8')

// ─── 1. CSS: as folhas na ordem do <head> → css/estilo.css ───
const folhas = [...html.matchAll(/^[ \t]*<link rel="stylesheet" href="([^"]+)">\r?\n/gm)]
if (!folhas.length) erros.push('nenhuma folha de estilo no index.html')
let css = ''
for (const [, href] of folhas) {
  let conteudo = semComentarios(ler(href).toString('utf8'))
  // url('../x') → versionada; o arquivo final fica em css/, então os relativos continuam
  conteudo = conteudo.replace(/url\((['"]?)(\.\.\/[^'")]+)\1\)/g, (m, q, u) => {
    const rel = path.posix.normalize(path.posix.join(path.posix.dirname(href), u))
    return `url(${q}${u}${copiar(rel)}${q})`
  })
  css += `/* ${href} */\n${conteudo.trim()}\n`
}
const cssBuf = Buffer.from(css)
fs.mkdirSync(path.join(DIST, 'css'), { recursive: true })
fs.writeFileSync(path.join(DIST, 'css/estilo.css'), cssBuf)
copiados.set('css/estilo.css', `?v=${hash(cssBuf)}`)
// a folha única entra no lugar da primeira; as linhas das outras somem
html = html.replace(folhas[0][0], `  <link rel="stylesheet" href="css/estilo.css${copiados.get('css/estilo.css')}">\n`)
for (const f of folhas.slice(1)) html = html.replace(f[0], '')
if (html.includes('rel="stylesheet" href="css/fontes.css"')) erros.push('as folhas de estilo não viraram uma só (estão separadas por outra coisa no <head>?)')

// ─── 2. HTML: sem comentários; toda URL local versionada ───
html = html.replace(/<!--[\s\S]*?-->\n?/g, '')
const versionar = url => {
  if (/^(https?:|data:|#|mailto:|tel:)/.test(url) || url === '') return url
  if (url.includes('?v=')) return url
  return url + copiar(url)
}
// (?<=\s): só o atributo inteiro — "data-pendente-href" não é href
html = html.replace(/(?<=\s)(src|href)="([^"]+)"/g, (m, attr, url) => `${attr}="${versionar(url)}"`)
html = html.replace(/(?<=\s)(srcset|imagesrcset)="([^"]+)"/g, (m, attr, lista) =>
  `${attr}="${lista.split(',').map(p => { const [u, ...d] = p.trim().split(/\s+/); return [versionar(u), ...d].join(' ') }).join(', ')}"`)
// arquivos citados por URL ABSOLUTA de produção (og:image, twitter:image): vão para o
// dist/ no mesmo caminho; a URL fica como está (sem ?v=, é o que os robôs guardam)
const PRODUCAO = 'https://zero7.com.br/mentor-iava/'
const absolutos = [...html.matchAll(/content="(https:\/\/zero7\.com\.br\/mentor-iava\/[^"]+)"/g)].map(m => m[1].slice(PRODUCAO.length)).filter(r => r && !r.endsWith('/'))
for (const rel of absolutos) copiar(rel)
fs.writeFileSync(path.join(DIST, 'index.html'), html)
for (const l of LICENCAS) copiar(l)

// ─── 3. .htaccess ───
fs.writeFileSync(path.join(DIST, '.htaccess'), ler('scripts/htaccess.txt'))

// ─── 4. conferência: tudo que o dist/index.html e o dist/css referenciam existe ───
const refs = new Set()
const tirarVersao = u => u.split('?')[0]
for (const m of html.matchAll(/(?<=\s)(?:src|href)="([^"]+)"/g)) refs.add(m[1])
for (const m of html.matchAll(/(?<=\s)(?:srcset|imagesrcset)="([^"]+)"/g)) for (const p of m[1].split(',')) refs.add(p.trim().split(/\s+/)[0])
for (const m of css.matchAll(/url\((['"]?)(\.\.\/[^'")]+)\1\)/g)) refs.add(path.posix.join('css', m[2]))
for (const rel of absolutos) refs.add(rel)
for (const u of refs) {
  if (/^(https?:|data:|#|mailto:|tel:)/.test(u) || u === '') continue
  const rel = path.posix.normalize(tirarVersao(u))
  if (!fs.existsSync(path.join(DIST, rel))) erros.push(`o dist/ referencia ${rel}, que não está no dist/`)
}

// ─── 5. relatório ───
const arquivos = []
const andar = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) andar(p); else arquivos.push(p) } }
andar(DIST)
const kb = n => `${(n / 1024).toFixed(1)} KB`
let bruto = 0, gz = 0
const porPasta = {}
for (const a of arquivos) {
  const buf = fs.readFileSync(a)
  const texto = /\.(html|css|js|svg|txt|htaccess)$|LICENSE$/.test(a)
  const g = texto ? zlib.gzipSync(buf, { level: 9 }).length : buf.length
  bruto += buf.length; gz += g
  const pasta = path.relative(DIST, a).split(path.sep).slice(0, -1).join('/') || '(raiz)'
  ;(porPasta[pasta] ||= { n: 0, bruto: 0, gz: 0 }); porPasta[pasta].n++; porPasta[pasta].bruto += buf.length; porPasta[pasta].gz += g
}
console.log(`\ndist/ — ${arquivos.length} arquivos\n`)
console.log('| pasta | arquivos | bruto | com gzip (texto) |\n| --- | --- | --- | --- |')
for (const [p, v] of Object.entries(porPasta).sort()) console.log(`| ${p} | ${v.n} | ${kb(v.bruto)} | ${kb(v.gz)} |`)
console.log(`| **total** | **${arquivos.length}** | **${kb(bruto)}** | **${kb(gz)}** |`)

const deFora = ['img/banner-hero.png', 'img/plataforma/topo-1544.webp', 'img/nano', 'amostra.html', 'CONTEXTO.md', 'package.json', 'copy', 'scripts', 'shots', 'medidas', 'referencias', 'node_modules']
const vazou = deFora.filter(f => fs.existsSync(path.join(DIST, f)))
if (vazou.length) erros.push(`foram para o dist/ e não deviam: ${vazou.join(', ')}`)

if (erros.length) {
  console.error('\nFALHOU:\n  ' + erros.join('\n  '))
  process.exit(1)
}
console.log('\nreferências conferidas: tudo que o index.html e o CSS pedem está no dist/')

// ─── 6. bloqueio da NCS Radhiumz ───
const contexto = fs.readFileSync(path.join(RAIZ, 'CONTEXTO.md'), 'utf8')
// a linha tem que estar SOZINHA (sem crase, sem comentário): citar a frase como exemplo
// no CONTEXTO.md não libera o bloqueio
if (!/^Licença NCS Radhiumz \(Webfonts\): CONFIRMADA[ \t]*$/m.test(contexto) && fs.existsSync(path.join(DIST, 'fonts/NcsRadhiumz-Rp3x6.woff'))) {
  const L = 78, linha = '█'.repeat(L)
  const caixa = t => `█  ${t}${' '.repeat(L - 4 - t.length)}█`
  console.error(['', linha,
    caixa('BLOQUEADO: a licença Webfonts da NCS Radhiumz NÃO está confirmada.'),
    caixa('O dist/ foi montado, mas a fonte NÃO PODE IR PARA O AR.'),
    caixa('Confirme a licença e registre no CONTEXTO.md, sozinha numa linha:'),
    caixa('"Licença NCS Radhiumz (Webfonts): CONFIRMADA"'),
    linha, ''].join('\n'))
  process.exit(1)
}
