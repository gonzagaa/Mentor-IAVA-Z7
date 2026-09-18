// node scripts/processar-icones.mjs
// Ícones 3D gerados com fundo preto (img/nano/) → PNG transparente (img/icones/).
// Os originais em img/nano/ NÃO mudam.
//
// 1. "Color to alpha" do preto, por luminância: alfa = maior canal; cor = canal ÷ alfa.
//    Sobre preto, o resultado reproduz o original pixel a pixel — o brilho azul vira
//    semitransparência, sem recorte de borda dura.
// 2. Recorta a margem vazia (alfa abaixo de ~2%) e centraliza o objeto num quadrado.
// 3. Reduz para 2× o tamanho de exibição (64px → 128px). Nunca amplia.
// 4. PNG com transparência (o dono converte para AVIF depois).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ORIGEM = path.join(RAIZ, 'img/nano')
const DESTINO = path.join(RAIZ, 'img/icones')
const NOMES = ['estrategias', 'horarios', 'disciplina', 'tilt', 'dias', 'numeros', 'padroes', 'chat'].map(n => `icone-${n}`)
const EXIBICAO = 64 // px, --tamanho-icone
const ALVO = EXIBICAO * 2
const LIMIAR = 5 // alfa (0–255) abaixo do qual o pixel conta como margem vazia
const FOLGA = 0.02 // 2% de respiro em volta do objeto

fs.mkdirSync(DESTINO, { recursive: true })
const kb = n => `${(n / 1024).toFixed(1)} KB`

console.log('| ícone | original | processado | redução | recorte do objeto | px semitransparentes |')
console.log('| --- | --- | --- | --- | --- | --- |')

for (const nome of NOMES) {
  const entrada = path.join(ORIGEM, `${nome}.png`)
  if (!fs.existsSync(entrada)) {
    console.log(`| ${nome} | **não existe** | — | — | — | — |`)
    continue
  }
  const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: L, height: A } = info
  const rgba = Buffer.alloc(L * A * 4)
  let x0 = L, y0 = A, x1 = -1, y1 = -1

  // 1. color to alpha (preto)
  for (let i = 0, p = 0; i < L * A; i++, p += 3) {
    const r = data[p], g = data[p + 1], b = data[p + 2]
    const a = Math.max(r, g, b)
    const o = i * 4
    if (a > 0) {
      rgba[o] = Math.round((r * 255) / a)
      rgba[o + 1] = Math.round((g * 255) / a)
      rgba[o + 2] = Math.round((b * 255) / a)
      rgba[o + 3] = a
    }
    if (a >= LIMIAR) {
      const x = i % L, y = (i / L) | 0
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }

  // 2. recorte da margem vazia + quadrado centralizado no objeto
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const lado = Math.ceil(Math.max(w, h) * (1 + 2 * FOLGA))
  const cx = x0 + w / 2, cy = y0 + h / 2
  const esq = Math.round(cx - lado / 2), topo = Math.round(cy - lado / 2)
  // área do original que cabe no quadrado; o que sair da imagem vira transparente
  const ext = {
    left: Math.max(0, -esq), top: Math.max(0, -topo),
    right: Math.max(0, esq + lado - L), bottom: Math.max(0, topo + lado - A),
  }
  const recorte = {
    left: Math.max(0, esq), top: Math.max(0, topo),
    width: Math.min(L, esq + lado) - Math.max(0, esq),
    height: Math.min(A, topo + lado) - Math.max(0, topo),
  }

  // 3. reduz para 2× a exibição, nunca amplia
  const final = Math.min(ALVO, lado)
  const saida = path.join(DESTINO, `${nome}.png`)
  const buffer = await sharp(rgba, { raw: { width: L, height: A, channels: 4 } })
    .extract(recorte)
    .extend({ ...ext, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(final, final, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
  fs.writeFileSync(saida, buffer)

  // 4. prova de que o brilho sobreviveu: pixels com alfa parcial no resultado
  const { data: px } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  let parciais = 0, total = 0
  for (let i = 3; i < px.length; i += 4) {
    total++
    if (px[i] > 0 && px[i] < 255) parciais++
  }
  const antes = fs.statSync(entrada).size
  console.log(
    `| ${nome} | ${L}×${A} · ${kb(antes)} | ${final}×${final} · ${kb(buffer.length)} | ${(100 - (buffer.length / antes) * 100).toFixed(1)}% | ${w}×${h} em (${x0},${y0}) | ${((parciais / total) * 100).toFixed(0)}% |`
  )
}

// ───────────── ilustração do painel do IAVA (#o-que-e) ─────────────
// Mesmo "color to alpha" dos ícones, mas SEM recorte de margem (as trilhas vão até as
// bordas; quem esfuma as pontas é a máscara radial no CSS). WebP com transparência,
// em 2× o maior tamanho de exibição (~604px → 1208px) e numa versão de 640px para o
// celular. Nunca amplia.
{
  const entrada = path.join(ORIGEM, 'ilustracao-iava.png')
  if (fs.existsSync(entrada)) {
    const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const rgba = Buffer.alloc(info.width * info.height * 4)
    for (let i = 0, p = 0; i < info.width * info.height; i++, p += 3) {
      const r = data[p], g = data[p + 1], b = data[p + 2], a = Math.max(r, g, b), o = i * 4
      if (a > 0) {
        rgba[o] = Math.round((r * 255) / a)
        rgba[o + 1] = Math.round((g * 255) / a)
        rgba[o + 2] = Math.round((b * 255) / a)
        rgba[o + 3] = a
      }
    }
    const antes = fs.statSync(entrada).size
    console.log(`\nilustracao-iava: original ${info.width}×${info.height} · ${kb(antes)}`)
    for (const largura of [1208, 640]) {
      const w = Math.min(largura, info.width)
      const nome = largura === 1208 ? 'ilustracao-iava.webp' : `ilustracao-iava-${w}.webp`
      const buf = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize(w, null, { kernel: 'lanczos3' })
        .webp({ quality: 70, alphaQuality: 60, effort: 6 }) // alfa ruidoso: q82 dava 768 KB
        .toBuffer()
      fs.writeFileSync(path.join(DESTINO, nome), buf)
      console.log(`  → ${nome}: ${w}×${Math.round((w * info.height) / info.width)} · ${kb(buf.length)}`)
    }
  }
}
