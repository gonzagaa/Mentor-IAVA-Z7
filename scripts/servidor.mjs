// Servidor estático em Node puro, sem dependência.
// Serve a raiz do projeto em http://localhost:4321/mentor-iava/ — NÃO na raiz do
// domínio. Assim qualquer caminho absoluto (/css/...) quebra aqui do mesmo jeito que
// quebraria em zero7.com.br/mentor-iava/.  `/` redireciona para `/mentor-iava/`.
//
// Como em produção: texto (html, css, js, svg, json) sai com gzip quando o navegador
// aceita (o .htaccess liga o mod_deflate). Servindo a pasta dist/ (`raiz`), os headers
// "Header set/always set" do dist/.htaccess são aplicados — a CSP vale aqui também.

import http from 'node:http'
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const BASE = '/mentor-iava/'
export const PORTA_PADRAO = 4321

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

function responder(res, status, corpo, tipo = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': tipo, 'cache-control': 'no-store' })
  res.end(corpo)
}

const COMPRIMIR = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.json', '.txt', '.md'])

// headers de SEGURANÇA do .htaccess (linhas "Header [always] set Nome "valor"") — os de
// cache ficam de fora: estão dentro de <FilesMatch>, que este leitor não interpreta
const SEGURANCA = new Set(['content-security-policy', 'x-content-type-options', 'referrer-policy', 'x-frame-options', 'permissions-policy'])
function lerHeaders(raiz) {
  const arq = path.join(raiz, '.htaccess')
  if (!fs.existsSync(arq)) return {}
  const h = {}
  for (const l of fs.readFileSync(arq, 'utf8').split(/\r?\n/)) {
    const m = l.trim().match(/^Header\s+(?:always\s+)?set\s+([\w-]+)\s+"(.*)"\s*$/)
    if (m && SEGURANCA.has(m[1].toLowerCase())) h[m[1]] = m[2].replace(/\\"/g, '"')
  }
  return h
}

export function criarServidor(raiz = RAIZ) {
  const extras = raiz === RAIZ ? {} : lerHeaders(raiz)
  return http.createServer((req, res) => {
    let caminho
    try {
      caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      return responder(res, 400, '400 — URL inválida')
    }

    if (caminho === '/' || caminho === '/mentor-iava') {
      res.writeHead(302, { location: BASE })
      return res.end()
    }

    if (!caminho.startsWith(BASE)) {
      // é exatamente isto que um caminho absoluto tipo /css/base.css faz em produção
      return responder(res, 404, `404 — fora de ${BASE}: ${caminho}\n` +
        'Em zero7.com.br/mentor-iava/ este caminho também não existiria. Use caminho relativo.')
    }

    let relativo = caminho.slice(BASE.length)
    if (relativo === '' || relativo.endsWith('/')) relativo += 'index.html'

    const arquivo = path.resolve(raiz, relativo)
    if (arquivo !== raiz && !arquivo.startsWith(raiz + path.sep)) {
      return responder(res, 403, '403 — fora da raiz do projeto')
    }

    fs.readFile(arquivo, (erro, dados) => {
      if (erro) return responder(res, 404, `404 — ${relativo}`)
      const ext = path.extname(arquivo).toLowerCase()
      const tipo = TIPOS[ext] || 'application/octet-stream'
      const cab = { 'content-type': tipo, 'cache-control': 'no-store', ...(ext === '.html' ? extras : {}) }
      if (COMPRIMIR.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        cab['content-encoding'] = 'gzip'
        cab.vary = 'Accept-Encoding'
        dados = zlib.gzipSync(dados, { level: 6 })
      }
      res.writeHead(200, cab)
      res.end(dados)
    })
  })
}

// Sobe o servidor numa porta livre e devolve { url, fechar }.
// Os outros scripts usam isto para subir e derrubar sozinhos.
export async function subirServidor(porta = PORTA_PADRAO, { raiz = RAIZ } = {}) {
  const servidor = criarServidor(raiz)
  await new Promise((ok, erro) => {
    servidor.once('error', e => {
      if (e.code === 'EADDRINUSE') {
        servidor.listen(0, '127.0.0.1', ok) // cai numa porta livre qualquer
      } else erro(e)
    })
    servidor.listen(porta, '127.0.0.1', ok)
  })
  const { port } = servidor.address()
  return {
    url: `http://localhost:${port}${BASE}`,
    fechar: () => new Promise(ok => servidor.close(ok)),
  }
}

// `npm run servir` — sobe e fica de pé, mas NÃO para sempre: encerra sozinho depois
// de --minutos=N (padrão 120) e grava o PID em .pids/ para `npm run parar`.
// Só quando este arquivo é o ponto de entrada; quando é importado, não.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.find(a => a.startsWith('--minutos='))
  const minutos = arg ? Number(arg.slice('--minutos='.length)) || 120 : 120
  const pasta = path.join(RAIZ, '.pids')
  fs.mkdirSync(pasta, { recursive: true })
  const arquivoPid = path.join(pasta, `servir-${process.pid}.json`)
  fs.writeFileSync(arquivoPid, JSON.stringify({ script: 'servir', pid: process.pid, filhos: [], inicio: new Date().toISOString(), limiteMin: minutos }))
  const sair = () => { fs.rmSync(arquivoPid, { force: true }); process.exit(0) }
  process.on('SIGINT', sair)
  process.on('SIGTERM', sair)
  setTimeout(() => {
    console.log(`\nlimite de ${minutos} min: servidor encerrado sozinho`)
    sair()
  }, minutos * 60_000)

  const { url } = await subirServidor(PORTA_PADRAO)
  console.log(`servindo ${RAIZ}`)
  console.log(`→ ${url}`)
  console.log(`PID ${process.pid} · encerra sozinho em ${minutos} min · ctrl+c ou npm run parar para parar antes`)
}
