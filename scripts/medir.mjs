// npm run medir -- <rótulo>
// Tabela em markdown em medidas/<rótulo>.md, uma linha por largura.
// Só grava depois que fontes e CSS estão confirmados em TODAS as larguras.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, lerRotulo, porLargura, ALTURA } from './comum.mjs'

const rotulo = lerRotulo()
const larguras = lerLarguras()

// Observa layout-shift desde antes do primeiro pixel.
const OBSERVADOR = () => {
  window.__cls = 0
  new PerformanceObserver(lista => {
    for (const e of lista.getEntries()) if (!e.hadRecentInput) window.__cls += e.value
  }).observe({ type: 'layout-shift', buffered: true })
}

const medicoes = await porLargura(
  larguras,
  async ({ page, largura }) => {
    // rola até o fim, devagar, acumulando CLS
    await page.evaluate(async () => {
      const passo = Math.round(innerHeight * 0.8)
      for (let y = 0; y < document.body.scrollHeight; y += passo) {
        scrollTo(0, y)
        await new Promise(r => setTimeout(r, 120))
      }
      scrollTo(0, document.body.scrollHeight)
      await new Promise(r => setTimeout(r, 300))
    })

    const m = await page.evaluate(() => {
      const px = v => Math.round(parseFloat(v) * 100) / 100

      const visivel = el => {
        const s = getComputedStyle(el)
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
        return el.getClientRects().length > 0
      }
      // elementos que de fato desenham texto (têm nó de texto direto)
      const comTexto = [...document.body.querySelectorAll('*')].filter(
        el => visivel(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())
      )

      const raiz = px(getComputedStyle(document.documentElement).fontSize)

      const h1 = document.querySelector('h1')
      const fsH1 = h1 && visivel(h1) ? px(getComputedStyle(h1).fontSize) : null

      const pLongo = [...document.querySelectorAll('p')].find(
        el => visivel(el) && el.textContent.trim().length >= 120
      )
      const fsP = pLongo ? px(getComputedStyle(pLongo).fontSize) : null

      const menorFonte = comTexto.length
        ? Math.min(...comTexto.map(el => px(getComputedStyle(el).fontSize)))
        : null

      // caixa que envolve todo o conteúdo visível com texto
      let esq = Infinity, dir = -Infinity
      for (const el of comTexto) {
        const r = el.getBoundingClientRect()
        if (r.width === 0) continue
        esq = Math.min(esq, r.left + scrollX)
        dir = Math.max(dir, r.right + scrollX)
      }
      const larguraConteudo = Number.isFinite(esq) ? Math.round(dir - esq) : null

      const doc = document.documentElement
      const scrollX_ = doc.scrollWidth > doc.clientWidth + 1

      // contagem de valores distintos
      const todos = [...document.body.querySelectorAll('*')].filter(visivel)
      const raios = new Set()
      const gaps = new Set()
      for (const el of todos) {
        const s = getComputedStyle(el)
        for (const p of ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius']) {
          if (s[p] && s[p] !== '0px') raios.add(s[p])
        }
        for (const p of ['rowGap', 'columnGap']) {
          if (s[p] && s[p] !== 'normal' && s[p] !== '0px') gaps.add(s[p])
        }
      }
      const fontesTexto = new Set(comTexto.map(el => getComputedStyle(el).fontSize))
      const coresTexto = new Set(comTexto.map(el => getComputedStyle(el).color))

      return {
        raiz,
        fsH1,
        fsP,
        pLongoId: pLongo ? pLongo.getAttribute('data-copy') : null,
        menorFonte,
        larguraConteudo,
        scrollX: scrollX_,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        alturaPagina: doc.scrollHeight,
        cls: Math.round((window.__cls || 0) * 10000) / 10000,
        nRaios: raios.size,
        nFontes: fontesTexto.size,
        nCores: coresTexto.size,
        nGaps: gaps.size,
      }
    })

    return { largura, ...m }
  },
  { antesDeCarregar: page => page.addInitScript(OBSERVADOR) }
)

const pct = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—')
const n = v => (v === null || v === undefined ? '—' : v)

const cab = [
  'largura', ':root', 'h1', 'p longo', 'menor fonte',
  'largura conteúdo', '% da tela', 'scroll-x', 'CLS',
  'raios', 'font-sizes', 'cores', 'gaps',
]

const linhas = medicoes.map(m => [
  `**${m.largura}**`,
  `${n(m.raiz)}px`,
  `${n(m.fsH1)}px`,
  `${n(m.fsP)}px`,
  `${n(m.menorFonte)}px`,
  `${n(m.larguraConteudo)}px`,
  pct(m.larguraConteudo, m.largura),
  m.scrollX ? `**sim** (${m.scrollWidth} > ${m.clientWidth})` : 'não',
  m.cls.toFixed(4),
  m.nRaios,
  m.nFontes,
  m.nCores,
  m.nGaps,
])

const tabela = [
  '| ' + cab.join(' | ') + ' |',
  '| ' + cab.map(() => '---').join(' | ') + ' |',
  ...linhas.map(l => '| ' + l.join(' | ') + ' |'),
].join('\n')

const idP = medicoes.find(m => m.pLongoId)?.pLongoId
const md = [
  `# medidas · ${rotulo}`,
  '',
  `Gerado em ${new Date().toISOString()}`,
  `Viewport ${ALTURA}px de altura · \`prefers-reduced-motion: reduce\` · escala de tela 1`,
  '',
  tabela,
  '',
  '## Notas',
  '',
  `- **p longo**: primeiro \`<p>\` visível com 120+ caracteres${idP ? ` (\`${idP}\`)` : ''}.`,
  '- **menor fonte**: menor \`font-size\` entre os elementos visíveis que desenham texto.',
  '- **largura conteúdo**: caixa que envolve todo o conteúdo visível com texto.',
  '- **CLS**: soma de \`layout-shift\` sem interação, com a página rolada até o fim.',
  '- **raios / font-sizes / cores / gaps**: quantidade de valores DISTINTOS computados.',
  '',
  '## Altura da página',
  '',
  medicoes.map(m => `- ${m.largura}px → ${m.alturaPagina}px`).join('\n'),
  '',
].join('\n')

// nada é escrito antes de todas as larguras passarem
fs.mkdirSync(path.join(RAIZ, 'medidas'), { recursive: true })
const arquivo = path.join(RAIZ, 'medidas', `${rotulo}.md`)
fs.writeFileSync(arquivo, md, 'utf8')

console.log(tabela)
console.log(`\nsalvo em medidas/${rotulo}.md`)
