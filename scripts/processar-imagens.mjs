// node scripts/processar-imagens.mjs
// Versões de produção (AVIF + WebP) das imagens que ainda estavam em PNG ou grandes
// demais para o tamanho de exibição. Os arquivos de origem NÃO mudam e não vão para o
// dist/ (o scripts/publicar.mjs só copia o que o index.html referencia).
// Regra: no máximo 2× o maior tamanho de exibição (npm run imagens) e nunca amplia.
//
//   banner da hero  img/banner-hero.png (1920×1080)  → img/hero/banner-{960,1280,1920}
//     exibido com object-fit: cover na hero inteira: no celular a hero é mais alta que
//     larga e a imagem cobre ~1250px de largura; no desktop até 1920 (o original).
//   ícones          img/icones/icone-*.png (128×128) → mesmo nome .avif/.webp (64px × 2)
//   pagamento       img/pagamento/N.webp (730×369)   → N-104.{avif,webp} (52px × 2)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const kb = n => `${(n / 1024).toFixed(1)} KB`
const linhas = []

async function gerar(entrada, saidaSemExt, largura, { avif, webp }) {
  const meta = await sharp(entrada).metadata()
  const w = Math.min(largura, meta.width)
  const pesos = []
  for (const [fmt, op] of [['avif', avif], ['webp', webp]]) {
    const buf = await sharp(entrada).resize(w, null, { kernel: 'lanczos3' })[fmt](op).toBuffer()
    fs.mkdirSync(path.dirname(saidaSemExt), { recursive: true })
    fs.writeFileSync(`${saidaSemExt}.${fmt}`, buf)
    pesos.push(`${fmt} ${kb(buf.length)}`)
  }
  linhas.push(`| ${path.relative(RAIZ, entrada).replaceAll('\\', '/')} (${meta.width}×${meta.height}, ${kb(fs.statSync(entrada).size)}) | ${path.relative(RAIZ, saidaSemExt).replaceAll('\\', '/')} · ${w}px | ${pesos.join(' · ')} |`)
}

// banner: escuro, a 70% de opacidade e com máscara — aguenta compressão forte
for (const w of [960, 1280, 1920]) {
  await gerar(path.join(RAIZ, 'img/banner-hero.png'), path.join(RAIZ, `img/hero/banner-${w}`), w, {
    avif: { quality: 45, effort: 6 },
    webp: { quality: 68, effort: 6 },
  })
}

// ícones com transparência (brilho semitransparente): alfa com boa qualidade
for (const f of fs.readdirSync(path.join(RAIZ, 'img/icones')).filter(f => /^icone-.*\.png$/.test(f))) {
  await gerar(path.join(RAIZ, 'img/icones', f), path.join(RAIZ, 'img/icones', f.replace(/\.png$/, '')), 128, {
    avif: { quality: 60, effort: 6 },
    webp: { quality: 82, alphaQuality: 90, effort: 6 },
  })
}

// bandeiras de pagamento do rodapé (cópia da home), exibidas a 40–52px
for (const n of [1, 2, 3, 4, 5, 6]) {
  await gerar(path.join(RAIZ, `img/pagamento/${n}.webp`), path.join(RAIZ, `img/pagamento/${n}-104`), 104, {
    avif: { quality: 70, effort: 6 },
    webp: { quality: 85, effort: 6 },
  })
}

console.log('| origem | saída | peso |\n| --- | --- | --- |\n' + linhas.join('\n'))
