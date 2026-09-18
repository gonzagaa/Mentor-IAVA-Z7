// npm run medir -- <rótulo>
// Tabela em markdown em medidas/<rótulo>.md, uma linha por largura.
// Só grava depois que fontes e CSS estão confirmados em TODAS as larguras.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, lerRotulo, lerPagina, lerMovimento, porLargura, ALTURA, DOBRA, DOBRA_OBRIGATORIA } from './comum.mjs'

const rotulo = lerRotulo()
const larguras = lerLarguras()
const pagina = lerPagina()
const movimento = lerMovimento()

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

      // linhas do H1, palavra por palavra: cada palavra vira um Range; o topo de cada
      // retângulo diz em que linha ela está. Palavra com retângulos em 2 topos = partida.
      let linhasH1 = null, umaPalavra = [], partidas = []
      if (h1 && visivel(h1)) {
        const palavras = []
        const andar = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
        for (let n = andar.nextNode(); n; n = andar.nextNode()) {
          for (const m of n.nodeValue.matchAll(/\S+/g)) {
            const r = document.createRange()
            r.setStart(n, m.index)
            r.setEnd(n, m.index + m[0].length)
            const topos = [...new Set([...r.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top)))]
            palavras.push({ p: m[0], topos })
          }
        }
        partidas = palavras.filter(w => w.topos.length > 1).map(w => w.p)
        const linhas = []
        for (const w of palavras) {
          const topo = w.topos[0]
          const linha = linhas.find(l => Math.abs(l.topo - topo) <= 3)
          if (linha) linha.palavras.push(w.p)
          else linhas.push({ topo, palavras: [w.p] })
        }
        linhasH1 = linhas.length
        umaPalavra = linhas.filter(l => l.palavras.length === 1).map(l => l.palavras[0])
      }

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
      // inline puro não tem caixa própria (clientWidth 0): fica de fora
      const estouros = comTexto.filter(el => {
        const d = getComputedStyle(el).display
        if (d === 'inline') return false
        return el.scrollWidth > el.clientWidth + 1
      })
      const fontesTexto = new Set(comTexto.map(el => getComputedStyle(el).fontSize))
      const coresTexto = new Set(comTexto.map(el => getComputedStyle(el).color))

      return {
        raiz,
        fsH1,
        linhasH1,
        umaPalavra,
        partidas,
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
        // texto mais largo que a própria caixa (palavra que não cabe na linha)
        nEstouros: estouros.length,
        estourosIds: estouros
          .map(el => el.getAttribute('data-copy') || el.className || el.tagName.toLowerCase())
          .slice(0, 5),
        // animações rodando agora (CSS animations e transitions); com reduce tem que dar 0
        nAnimacoes: document.getAnimations().filter(a => a.playState === 'running').length,
      }
    })

    // botão principal na primeira dobra: mede de novo na altura real de tela
    let dobra = null
    if (DOBRA[largura]) {
      await page.setViewportSize({ width: largura, height: DOBRA[largura] })
      await page.evaluate(() => scrollTo(0, 0))
      dobra = await page.evaluate(() => {
        const b = document.querySelector('#hero .botao--primario')
        if (!b) return null
        const r = b.getBoundingClientRect()
        return { topo: Math.round(r.top), base: Math.round(r.bottom), altura: innerHeight }
      })
    }

    return { largura, ...m, dobra }
  },
  { antesDeCarregar: page => page.addInitScript(OBSERVADOR), pagina, movimento }
)

const pct = (a, b) => (b ? (a / b * 100).toFixed(1) + '%' : '—')
const n = v => (v === null || v === undefined ? '—' : v)

const cab = [
  'largura', ':root', 'h1', 'p longo', 'menor fonte',
  'largura conteúdo', '% da tela', 'scroll-x', 'CLS',
  'raios', 'font-sizes', 'cores', 'gaps', 'animações', 'estouros',
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
  m.nAnimacoes,
  m.nEstouros ? `**${m.nEstouros}** (${m.estourosIds.join(', ')})` : '0',
])

const tabelaMd = (cabecalho, corpo) => [
  '| ' + cabecalho.join(' | ') + ' |',
  '| ' + cabecalho.map(() => '---').join(' | ') + ' |',
  ...corpo.map(l => '| ' + l.join(' | ') + ' |'),
].join('\n')

const tabela = tabelaMd(cab, linhas)

// H1: linhas, palavra sozinha na linha, palavra partida
const tabelaH1 = tabelaMd(
  ['largura', 'h1', 'linhas', 'linha com 1 palavra', 'palavra partida'],
  medicoes.map(m => [
    `**${m.largura}**`,
    `${n(m.fsH1)}px`,
    n(m.linhasH1),
    m.umaPalavra?.length ? `**${m.umaPalavra.join(', ')}**` : 'nenhuma',
    m.partidas?.length ? `**${m.partidas.join(', ')}**` : 'nenhuma',
  ])
)

// botão principal na primeira dobra, medido na altura real de tela
const comDobra = medicoes.filter(m => m.dobra)
const tabelaDobra = comDobra.length
  ? tabelaMd(
      ['tela', 'botão (topo → base)', 'sobra até a dobra', 'aparece sem rolar?', 'exigido?'],
      comDobra.map(m => {
        const { topo, base, altura } = m.dobra
        return [
          `**${m.largura}×${altura}**`,
          `${topo} → ${base}px`,
          `${altura - base}px`,
          base <= altura ? 'sim' : '**não**',
          DOBRA_OBRIGATORIA.includes(m.largura) ? 'sim' : 'só reportar',
        ]
      })
    )
  : ''

const idP = medicoes.find(m => m.pLongoId)?.pLongoId
const md = [
  `# medidas · ${rotulo} · ${pagina}`,
  '',
  `Gerado em ${new Date().toISOString()}`,
  `Viewport ${ALTURA}px de altura · \`prefers-reduced-motion: ${movimento ? 'no-preference' : 'reduce'}\` · escala de tela 1`,
  '',
  tabela,
  '',
  '## H1',
  '',
  tabelaH1,
  '',
  ...(tabelaDobra ? ['## Botão principal na primeira dobra', '', tabelaDobra, ''] : []),
  '## Notas',
  '',
  `- **p longo**: primeiro \`<p>\` visível com 120+ caracteres${idP ? ` (\`${idP}\`)` : ''}.`,
  '- **menor fonte**: menor \`font-size\` entre os elementos visíveis que desenham texto.',
  '- **largura conteúdo**: caixa que envolve todo o conteúdo visível com texto.',
  '- **CLS**: soma de \`layout-shift\` sem interação, com a página rolada até o fim.',
  '- **animações**: \`document.getAnimations()\` rodando no fim da medição. Com reduce, tem que ser 0.',
  '- **estouros**: elementos de texto cujo conteúdo é mais largo que a própria caixa.',
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
console.log('\n' + tabelaH1)
if (tabelaDobra) console.log('\n' + tabelaDobra)
console.log(`\nsalvo em medidas/${rotulo}.md`)
