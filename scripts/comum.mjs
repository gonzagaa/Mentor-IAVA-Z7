// Peças compartilhadas pelos scripts de verificação.
// Regra de ouro: NUNCA gravar captura ou medida de uma página carregada pela metade.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { subirServidor } from './servidor.mjs'

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// CONTEXTO.md, regra 8 — toda verificação cobre estas 9 larguras
export const LARGURAS = [320, 375, 390, 430, 768, 1024, 1280, 1474, 1920]
export const ALTURA = 900

// Famílias que precisam estar carregadas antes de medir ou capturar
export const FAMILIAS = ['Inter', 'NCS Radhiumz']

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
async function conferirCarregamento(page, familias) {
  await page.evaluate(() => document.fonts.ready)
  return page.evaluate(familias => {
    const motivos = []

    // (a) as duas famílias precisam estar de fato carregadas
    for (const familia of familias) {
      const nome = `16px "${familia}"`
      const check = document.fonts.check(nome)
      const faces = [...document.fonts].filter(f => f.family.replace(/^["']|["']$/g, '') === familia)
      const carregada = faces.some(f => f.status === 'loaded')
      const erro = faces.some(f => f.status === 'error')
      if (!faces.length) motivos.push(`fonte "${familia}": nenhum @font-face declarado`)
      else if (erro) motivos.push(`fonte "${familia}": @font-face em status "error" (arquivo faltando ou corrompido)`)
      else if (!carregada) motivos.push(`fonte "${familia}": nenhum @font-face chegou a "loaded" (status: ${faces.map(f => f.status).join(', ')})`)
      else if (!check) motivos.push(`fonte "${familia}": document.fonts.check(${JSON.stringify(nome)}) deu falso`)
    }

    // (b) sentinela do CSS
    const sentinela = getComputedStyle(document.documentElement).getPropertyValue('--css-carregado').trim()
    if (sentinela !== '1') {
      motivos.push(`--css-carregado = ${JSON.stringify(sentinela || '(vazio)')}, esperado "1" — css/tokens.css não chegou`)
    }

    return { ok: motivos.length === 0, motivos }
  }, familias)
}

/**
 * Abre a página em cada largura pedida e chama `tarefa({ page, largura })`.
 * Antes de cada tarefa confere fontes e sentinela do CSS; se falhar, PARA tudo
 * com código de saída 1 dizendo qual largura e o quê.
 */
export async function porLargura(larguras, tarefa, { antesDeCarregar } = {}) {
  const servidor = await subirServidor()
  const navegador = await chromium.launch()
  const resultados = []
  let falha = null

  try {
    for (const largura of larguras) {
      const contexto = await navegador.newContext({
        viewport: { width: largura, height: ALTURA },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce', // prefers-reduced-motion: reduce
        colorScheme: 'dark',
      })
      const page = await contexto.newPage()
      const quebrados = []
      page.on('response', r => {
        if (r.status() >= 400) quebrados.push(`${r.status()} ${r.url()}`)
      })
      if (antesDeCarregar) await antesDeCarregar(page)

      try {
        await page.goto(servidor.url, { waitUntil: 'load', timeout: 30000 })
        const sanidade = await conferirCarregamento(page, FAMILIAS)
        if (!sanidade.ok) {
          const detalhe = sanidade.motivos.map(m => `      · ${m}`).join('\n')
          const extra = quebrados.length
            ? '\n      · respostas com erro: ' + quebrados.join('; ')
            : ''
          throw new Error(`página carregada pela metade em ${largura}px:\n${detalhe}${extra}`)
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
