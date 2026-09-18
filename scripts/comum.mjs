// Peças compartilhadas pelos scripts de verificação.
// Regra de ouro: NUNCA gravar captura ou medida de uma página carregada pela metade.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { subirServidor } from './servidor.mjs'

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// CONTEXTO.md, regra 8 — toda verificação cobre estas 9 larguras
export const LARGURAS = [320, 375, 390, 430, 768, 1024, 1280, 1474, 1920]
export const ALTURA = 900

// Altura de tela por largura, para medir e capturar "a primeira dobra" (o que se vê
// sem rolar). 390×844, 430×932, 1280×720, 1474×830 e 1920×1080 são exigência do
// dono; 320×568 e 375×667 são reportados; 768×1024 e 1024×768 são tablets comuns.
export const DOBRA = { 320: 568, 375: 667, 390: 844, 430: 932, 768: 1024, 1024: 768, 1280: 720, 1474: 830, 1920: 1080 }
export const DOBRA_OBRIGATORIA = [390, 430, 1280, 1474, 1920]

// Fontes que precisam estar carregadas, e de QUAL arquivo, antes de medir ou capturar.
// A NCS Radhiumz é o WOFF original do cdnfonts, sem conversão (a licença proíbe).
const FONTES_BASE = [
  { familia: 'Inter', arquivo: 'fonts/InterVariable.woff2' },
  { familia: 'NCS Radhiumz', arquivo: 'fonts/NcsRadhiumz-Rp3x6.woff' },
]
// fontes extras exigidas por página (a Unbounded saiu: é reserva, não carrega em lugar nenhum)
const FONTES_POR_PAGINA = {}
export const fontesDaPagina = pagina => [...FONTES_BASE, ...(FONTES_POR_PAGINA[pagina] || [])]

export function lerLarguras(argv = process.argv.slice(2)) {
  const arg = argv.find(a => a.startsWith('--larguras='))
  if (!arg) return LARGURAS
  const pedidas = arg
    .slice('--larguras='.length)
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isFinite(n) && n > 0)
  if (!pedidas.length) {
    throw new Error('--larguras= não tem nenhum número válido')
  }
  const fora = pedidas.filter(n => !LARGURAS.includes(n))
  if (fora.length) {
    console.warn(`aviso: ${fora.join(', ')} não está entre as 9 larguras oficiais (${LARGURAS.join(', ')})`)
  }
  return pedidas
}

// --pagina=amostra.html  (padrão: index.html)
export function lerPagina(argv = process.argv.slice(2)) {
  const arg = argv.find(a => a.startsWith('--pagina='))
  const pagina = arg ? arg.slice('--pagina='.length) : 'index.html'
  if (!/^[\w.-]+\.html$/.test(pagina) || !fs.existsSync(path.join(RAIZ, pagina))) {
    console.error(`erro: --pagina=${pagina} não existe na raiz do projeto`)
    process.exit(1)
  }
  return pagina
}

// --movimento desliga a emulação de prefers-reduced-motion (padrão: reduce)
export const lerMovimento = (argv = process.argv.slice(2)) => argv.includes('--movimento')

// --sem-js carrega a página com JavaScript desligado (progressive enhancement)
export const lerSemJs = (argv = process.argv.slice(2)) => argv.includes('--sem-js')

export function lerRotulo(argv = process.argv.slice(2)) {
  const rotulo = argv.find(a => !a.startsWith('--'))
  if (!rotulo) {
    console.error('erro: falta o <rótulo>.  ex: npm run shots -- fase0')
    process.exit(1)
  }
  if (!/^[\w.-]+$/.test(rotulo)) {
    console.error(`erro: rótulo inválido "${rotulo}" — use só letras, números, ponto, hífen e _`)
    process.exit(1)
  }
  return rotulo
}

// Checagem de sanidade da página. Devolve { ok, motivos }.
async function conferirCarregamento(page, fontes) {
  // Pede a carga de cada família antes de conferir: uma página pode não usar alguma
  // delas (ex.: uma seção sem .display). Se o arquivo faltar, a face vai para "error"
  // e a checagem abaixo falha do mesmo jeito.
  await page.evaluate(async fontes => {
    await Promise.allSettled(fontes.map(f => document.fonts.load(`16px "${f.familia}"`)))
    await document.fonts.ready
  }, fontes)
  return page.evaluate(fontes => {
    const motivos = []
    const recursos = performance.getEntriesByType('resource').map(r => decodeURIComponent(r.name))

    // (a) cada família carregada, a partir do arquivo esperado
    for (const { familia, arquivo } of fontes) {
      const nome = `16px "${familia}"`
      const check = document.fonts.check(nome)
      const faces = [...document.fonts].filter(f => f.family.replace(/^["']|["']$/g, '') === familia)
      const carregada = faces.some(f => f.status === 'loaded')
      const erro = faces.some(f => f.status === 'error')
      const baixou = recursos.some(u => u.endsWith('/' + arquivo))
      if (!faces.length) motivos.push(`fonte "${familia}": nenhum @font-face declarado`)
      else if (erro) motivos.push(`fonte "${familia}": @font-face em status "error" (arquivo faltando ou corrompido)`)
      else if (!carregada) motivos.push(`fonte "${familia}": nenhum @font-face chegou a "loaded" (status: ${faces.map(f => f.status).join(', ')})`)
      else if (!check) motivos.push(`fonte "${familia}": document.fonts.check(${JSON.stringify(nome)}) deu falso`)
      else if (!baixou) motivos.push(`fonte "${familia}": carregou, mas não do arquivo esperado ${arquivo}`)
    }

    // (b) sentinela do CSS
    const sentinela = getComputedStyle(document.documentElement).getPropertyValue('--css-carregado').trim()
    if (sentinela !== '1') {
      motivos.push(`--css-carregado = ${JSON.stringify(sentinela || '(vazio)')}, esperado "1" — css/tokens.css não chegou`)
    }

    return { ok: motivos.length === 0, motivos }
  }, fontes)
}

/**
 * Abre a página em cada largura pedida e chama `tarefa({ page, largura })`.
 * Antes de cada tarefa confere fontes e sentinela do CSS; se falhar, PARA tudo
 * com código de saída 1 dizendo qual largura e o quê.
 */
export async function porLargura(larguras, tarefa, { antesDeCarregar, pagina = 'index.html', movimento = false, dobra = false, semJs = false } = {}) {
  const servidor = await subirServidor()
  const navegador = await chromium.launch()
  const fontes = fontesDaPagina(pagina)
  const resultados = []
  let falha = null

  try {
    for (const largura of larguras) {
      const contexto = await navegador.newContext({
        viewport: { width: largura, height: (dobra && DOBRA[largura]) || ALTURA },
        deviceScaleFactor: 1,
        reducedMotion: movimento ? 'no-preference' : 'reduce',
        colorScheme: 'dark',
        javaScriptEnabled: !semJs,
      })
      const page = await contexto.newPage()
      const quebrados = []
      page.on('response', r => {
        if (r.status() >= 400) quebrados.push(`${r.status()} ${r.url()}`)
      })
      if (antesDeCarregar) await antesDeCarregar(page)

      try {
        const url = servidor.url + (pagina === 'index.html' ? '' : pagina)
        await page.goto(url, { waitUntil: 'load', timeout: 30000 })
        const sanidade = await conferirCarregamento(page, fontes)
        if (!sanidade.ok || quebrados.length) {
          const detalhe = sanidade.motivos.map(m => `      · ${m}`).join('\n')
          const extra = quebrados.length
            ? '\n      · respostas com erro: ' + quebrados.join('; ')
            : ''
          throw new Error(`${pagina} carregada pela metade em ${largura}px:\n${detalhe}${extra}`)
        }
        resultados.push(await tarefa({ page, largura }))
      } finally {
        await contexto.close()
      }
    }
  } catch (erro) {
    falha = erro
  } finally {
    await navegador.close()
    await servidor.fechar()
  }

  if (falha) {
    console.error('\nPAROU — nada foi gravado.')
    console.error(falha.message)
    process.exit(1)
  }
  return resultados
}

export const colapsar = s => s.replace(/\s+/g, ' ').trim()
