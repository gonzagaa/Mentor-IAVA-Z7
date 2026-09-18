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

      // Quebra de um título, palavra por palavra: cada palavra vira um Range; o topo de
      // cada retângulo diz em que linha ela está. Palavra com retângulos em 2 topos =
      // partida. Regra (CONTEXTO.md): proibida linha só com palavra CURTA (≤ 5
      // caracteres, contando a pontuação); palavra longa sozinha é permitida.
      const CURTA = 5
      const analisarTitulo = el => {
        const caixa = el.getBoundingClientRect()
        const est = getComputedStyle(el)
        const esq = caixa.left + parseFloat(est.paddingLeft)
        const dir = caixa.right - parseFloat(est.paddingRight)
        const palavras = []
        const andar = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        for (let n = andar.nextNode(); n; n = andar.nextNode()) {
          for (const m of n.nodeValue.matchAll(/\S+/g)) {
            const r = document.createRange()
            r.setStart(n, m.index)
            r.setEnd(n, m.index + m[0].length)
            const rets = [...r.getClientRects()].filter(q => q.width > 0)
            const topos = [...new Set(rets.map(q => Math.round(q.top)))]
            // texto centralizado que não cabe transborda pelos DOIS lados: confere os dois
            const fora = rets.some(q => q.left < esq - 0.5 || q.right > dir + 0.5)
            palavras.push({ p: m[0], topos, fora })
          }
        }
        const linhas = []
        for (const w of palavras) {
          const topo = w.topos[0]
          const linha = linhas.find(l => Math.abs(l.topo - topo) <= 3)
          if (linha) linha.palavras.push(w.p)
          else linhas.push({ topo, palavras: [w.p] })
        }
        const sozinhas = linhas.filter(l => l.palavras.length === 1).map(l => l.palavras[0])
        return {
          id: el.closest('[data-copy]')?.getAttribute('data-copy') || el.tagName.toLowerCase(),
          linhas: linhas.length,
          curtaSozinha: sozinhas.filter(p => p.length <= CURTA),
          longaSozinha: sozinhas.filter(p => p.length > CURTA),
          partidas: palavras.filter(w => w.topos.length > 1).map(w => w.p),
          foraDaCaixa: palavras.filter(w => w.fora).map(w => w.p),
        }
      }

      let linhasH1 = null, curtaSozinha = [], longaSozinha = [], partidas = [], foraDaCaixa = []
      if (h1 && visivel(h1)) {
        ;({ linhas: linhasH1, curtaSozinha, longaSozinha, partidas, foraDaCaixa } = analisarTitulo(h1))
      }

      // os demais títulos em .display (a regra de quebra vale para todos)
      const outrosTitulos = [...document.querySelectorAll('.display')]
        .filter(el => el !== h1 && visivel(el))
        .map(analisarTitulo)
      // exceção: um número sozinho de contagem (data-contar) é um dado, não uma frase
      const violacoesTitulos = outrosTitulos
        .filter(t => !document.querySelector(`[data-copy="${t.id}"][data-contar]`) || t.partidas.length || t.foraDaCaixa.length)
        .filter(t => t.curtaSozinha.length || t.partidas.length || t.foraDaCaixa.length)
        .map(t => `${t.id}: ${[...t.curtaSozinha.map(p => `curta "${p}"`), ...t.partidas.map(p => `partida "${p}"`), ...t.foraDaCaixa.map(p => `fora "${p}"`)].join(', ')}`)

      // menor fonte visível de cada seção
      const menorPorSecao = {}
      for (const sec of document.querySelectorAll('main > section[id]')) {
        const dentro = comTexto.filter(el => sec.contains(el))
        if (dentro.length) menorPorSecao[sec.id] = Math.min(...dentro.map(el => px(getComputedStyle(el).fontSize)))
      }

      // H2 e H3 do sistema (.display.degrau-4/3) e o corpo (.degrau-1), medidos com
      // sondas na largura atual — o index ainda não tem H2/H3 com .display
      const medirClasse = classe => {
        const sonda = document.createElement('span')
        sonda.className = classe
        sonda.style.position = 'absolute'
        sonda.style.visibility = 'hidden'
        sonda.textContent = 'H'
        document.body.append(sonda)
        const v = px(getComputedStyle(sonda).fontSize)
        sonda.remove()
        return v
      }
      const fsH2 = medirClasse('display degrau-4')
      const fsH3 = medirClasse('display degrau-3')
      const fsCorpo = medirClasse('degrau-1')

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
        curtaSozinha,
        longaSozinha,
        partidas,
        foraDaCaixa,
        fsH2,
        fsH3,
        fsCorpo,
        outrosTitulos: outrosTitulos.length,
        violacoesTitulos,
        menorPorSecao,
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

    // títulos cortados: rola até cada h1/h2/h3 e confere, linha a linha, (a) que o ponto
    // central de cada linha é o próprio título (nada pintado por cima) e (b) que nenhum
    // ancestral com overflow recortado corta a linha
    const cortes = []
    for (let i = 0; await page.evaluate(i => i < document.querySelectorAll('h1, h2, h3').length, i); i++) {
      const c = await page.evaluate(async i => {
        const t = document.querySelectorAll('h1, h2, h3')[i]
        if (!t.getClientRects().length) return null
        t.scrollIntoView({ block: 'center' })
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
        const nome = t.getAttribute('data-copy') || t.tagName.toLowerCase()
        const faixa = document.createRange()
        faixa.selectNodeContents(t)
        const linhas = [...faixa.getClientRects()].filter(r => r.width > 2 && r.height > 2)
        for (const l of linhas) {
          const x = l.left + l.width / 2, y = l.top + l.height / 2
          const topo = document.elementFromPoint(x, y)
          if (topo && topo !== t && !t.contains(topo)) return `${nome} (coberto por ${topo.tagName.toLowerCase()}${topo.className ? '.' + String(topo.className).split(' ')[0] : ''})`
          for (let a = t.parentElement; a && a !== document.documentElement; a = a.parentElement) {
            const s = getComputedStyle(a)
            const cx = s.overflowX !== 'visible', cy = s.overflowY !== 'visible'
            if (!cx && !cy) continue
            const r = a.getBoundingClientRect()
            if ((cy && (l.top < r.top - 1 || l.bottom > r.bottom + 1)) || (cx && (l.left < r.left - 1 || l.right > r.right + 1))) {
              return `${nome} (recortado por ${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''})`
            }
          }
        }
        return null
      }, i)
      if (c) cortes.push(c)
    }

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

    return { largura, ...m, cortes, dobra }
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

// H1: linhas e regra de quebra; escala h1 → h2 → h3 → corpo; base do botão.
// Alvos (CONTEXTO.md): h2 entre 0,65 e 0,85 do h1 e ≥ 19px; corpo < h3 < h2.
const razao = m => (m.fsH1 && m.fsH2 ? m.fsH2 / m.fsH1 : null)
const tabelaH1 = tabelaMd(
  ['largura', 'h1', 'linhas', 'curta sozinha', 'longa sozinha', 'partida / fora da caixa', 'h2', 'h2/h1', 'h3', 'corpo', 'base do botão'],
  medicoes.map(m => {
    const r = razao(m)
    const okH2 = r !== null && r >= 0.65 && r <= 0.85 && m.fsH2 >= 19
    const okH3 = m.fsH3 < m.fsH2 && m.fsH3 > m.fsCorpo
    const defeitos = [...(m.partidas || []), ...(m.foraDaCaixa || [])]
    return [
      `**${m.largura}**`,
      `${n(m.fsH1)}px`,
      n(m.linhasH1),
      m.curtaSozinha?.length ? `**${m.curtaSozinha.join(', ')}**` : 'nenhuma',
      m.longaSozinha?.length ? m.longaSozinha.join(', ') : '—',
      defeitos.length ? `**${defeitos.join(', ')}**` : 'nenhuma',
      okH2 ? `${n(m.fsH2)}px` : `**${n(m.fsH2)}px**`,
      r === null ? '—' : okH2 ? r.toFixed(3) : `**${r.toFixed(3)}**`,
      okH3 ? `${n(m.fsH3)}px` : `**${n(m.fsH3)}px**`,
      `${n(m.fsCorpo)}px`,
      m.dobra ? `${m.dobra.base}px / ${m.dobra.altura}` : '—',
    ]
  })
)

// demais títulos .display (regra de quebra) e menor fonte das seções já montadas
const SECOES_PRONTAS = ['hero', 'dor', 'analise', 'para-quem', 'o-que-e', 'provas', 'origem']
const tabelaSecoes = tabelaMd(
  ['largura', 'outros títulos .display', 'quebra', 'títulos cortados', ...SECOES_PRONTAS.map(id => `menor fonte #${id}`)],
  medicoes.map(m => [
    `**${m.largura}**`,
    n(m.outrosTitulos),
    m.violacoesTitulos?.length ? `**${m.violacoesTitulos.join(' · ')}**` : 'ok',
    m.cortes?.length ? `**${m.cortes.join(' · ')}**` : 'nenhum',
    // a hero tem o selo (13–14px, rótulo); nas demais seções o piso é 16px
    ...SECOES_PRONTAS.map(id => {
      const v = m.menorPorSecao?.[id]
      if (v === undefined) return '—'
      return id === 'hero' || v >= 16 ? `${v}px` : `**${v}px**`
    }),
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
  '## Outros títulos e seções',
  '',
  tabelaSecoes,
  '',
  ...(tabelaDobra ? ['## Botão principal na primeira dobra', '', tabelaDobra, ''] : []),
  '## Notas',
  '',
  `- **p longo**: primeiro \`<p>\` visível com 120+ caracteres${idP ? ` (\`${idP}\`)` : ''}.`,
  '- **menor fonte**: menor \`font-size\` entre os elementos visíveis que desenham texto.',
  '- **largura conteúdo**: caixa que envolve todo o conteúdo visível com texto.',
  '- **CLS**: soma de \`layout-shift\` sem interação, com a página rolada até o fim.',
  '- **animações**: \`document.getAnimations()\` rodando no fim da medição. Com reduce, tem que ser 0.',
  '- **títulos cortados**: cada h1/h2/h3 rolado até o centro da tela; linha coberta por outro elemento (elementFromPoint) ou fora de um ancestral com overflow recortado.',
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
console.log('\n' + tabelaSecoes)
if (tabelaDobra) console.log('\n' + tabelaDobra)
console.log(`\nsalvo em medidas/${rotulo}.md`)
