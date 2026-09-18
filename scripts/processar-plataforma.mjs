// node scripts/processar-plataforma.mjs
// Prints reais da plataforma (img/plataforma/originais/, 1920×1080) → recortes em
// AVIF e WebP responsivos em img/plataforma/. SÓ recorte e otimização: nenhum
// retoque, nenhuma geração — o texto da interface sai como está. Os originais não
// mudam e não vão para o dist/.
//
// Coordenadas em px do original. Sem a barra lateral esquerda da plataforma e sem a
// aba flutuante "Mentor IAVA" colada na borda direita.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGEM = path.join(RAIZ, 'img/plataforma/originais')
const DESTINO = path.join(RAIZ, 'img/plataforma')

const RECORTES = [
  {
    nome: 'topo',
    arquivo: 'dashboard-topo.png',
    // "Briefing Operacional" + card de alerta "Boa tarde" com os 4 indicadores. A
    // borda direita para em 1842: a aba "Mentor IAVA" começa em 1843 (de y 540 a 770)
    // e cobriria a ponta do card de alerta.
    area: { left: 298, top: 80, width: 1544, height: 552 },
    larguras: [800, 1544], // exibido até ~1100px: 2× passaria do original, não amplia
  },
  {
    nome: 'evidencias',
    arquivo: 'dashboard-evidencias.png',
    // 4 dos 8 cards (2×2: saldo, taxa de acerto, max drawdown, melhor trade) — com os
    // 8, no painel de ~600px a escala cairia para 38% (decisão do dono: 2×2)
    area: { left: 298, top: 66, width: 797, height: 414 },
    larguras: [400, 797],
  },
  {
    nome: 'chat',
    arquivo: 'chat.png',
    // a segunda pergunta "Como eu posso melhorar?" (o print tem duas iguais) e a
    // resposta do Mentor até o fim, com o carimbo "Mentor · 15:00"
    area: { left: 612, top: 250, width: 920, height: 716 },
    larguras: [480, 920],
  },
]

fs.mkdirSync(DESTINO, { recursive: true })
const kb = n => `${(n / 1024).toFixed(1)} KB`
console.log('| recorte | origem | área (x, y, largura × altura) | arquivos |')
console.log('| --- | --- | --- | --- |')
for (const r of RECORTES) {
  const base = sharp(path.join(ORIGEM, r.arquivo)).extract(r.area)
  const saidas = []
  for (const w of r.larguras) {
    const largura = Math.min(w, r.area.width)
    for (const [fmt, opcoes] of [['avif', { quality: 62, effort: 6 }], ['webp', { quality: 82, effort: 6 }]]) {
      // AVIF/WebP com croma cheio (4:4:4): texto fino de interface não borra nas cores
      const buf = await base.clone().resize(largura)[fmt]({ ...opcoes, chromaSubsampling: '4:4:4', smartSubsample: true }).toBuffer()
      const nome = `${r.nome}-${largura}.${fmt}`
      fs.writeFileSync(path.join(DESTINO, nome), buf)
      saidas.push(`${nome} ${kb(buf.length)}`)
    }
  }
  const { left, top, width, height } = r.area
  console.log(`| ${r.nome} | ${r.arquivo} | (${left}, ${top}) ${width}×${height} | ${saidas.join(' · ')} |`)
}
