// node scripts/subsetar-inter.mjs
// Inter variável (fonts/InterVariable.woff2, 352 KB, todos os alfabetos) → só latim
// (fonts/InterVariable-latin.woff2), mantendo os eixos de variação (peso e tamanho
// óptico). A licença da Inter (OFL 1.1, sem Reserved Font Name — ver
// fonts/Inter-LICENSE.txt) permite versões modificadas. A NCS Radhiumz NÃO passa por
// isto: a licença dela proíbe converter ou alterar o arquivo.
//
// Mantém: ASCII + Latin-1 (acentos do português), os extras de latim do Google Fonts
// (aspas, travessões, reticências, €, ™…) e TODO caractere do copy/copy.json. Falha se
// algum caractere da copy ou do index.html ficar de fora.

import fs from 'node:fs'
import path from 'node:path'
import subsetFont from 'subset-font'
import { RAIZ } from './comum.mjs'

const ENTRADA = path.join(RAIZ, 'fonts/InterVariable.woff2')
const SAIDA = path.join(RAIZ, 'fonts/InterVariable-latin.woff2')

// faixa "latin" do Google Fonts
const FAIXAS = [[0x0000, 0x00ff], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc], [0x02c6, 0x02c6], [0x02da, 0x02da], [0x02dc, 0x02dc], [0x0304, 0x0304], [0x0308, 0x0308], [0x0329, 0x0329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215], [0xfeff, 0xfeff], [0xfffd, 0xfffd]]

const noTexto = new Set()
const copy = JSON.parse(fs.readFileSync(path.join(RAIZ, 'copy/copy.json'), 'utf8'))
for (const b of copy) for (const ch of String(b.texto || '')) noTexto.add(ch)
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').replace(/<[^>]+>/g, ' ')
for (const ch of html) noTexto.add(ch)

let texto = ''
for (const [a, b] of FAIXAS) for (let c = a; c <= b; c++) texto += String.fromCodePoint(c)
for (const ch of noTexto) if (ch.codePointAt(0) >= 0x20) texto += ch

const entrada = fs.readFileSync(ENTRADA)
const saida = await subsetFont(entrada, texto, { targetFormat: 'woff2' })
fs.writeFileSync(SAIDA, saida)

// prova: todo caractere da copy está no subconjunto (as faixas + o que foi pedido)
const cobertos = new Set(texto)
const fora = [...noTexto].filter(ch => ch.codePointAt(0) >= 0x20 && !cobertos.has(ch))
if (fora.length) { console.error('caracteres fora do subconjunto:', fora.join(' ')); process.exit(1) }
const kb = n => `${(n / 1024).toFixed(1)} KB`
console.log(`Inter: ${kb(entrada.length)} → ${kb(saida.length)} (${path.relative(RAIZ, SAIDA)}) · ${cobertos.size} caracteres`)
