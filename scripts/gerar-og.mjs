// node scripts/gerar-og.mjs
// Imagem de compartilhamento (og:image / twitter:image): img/og-mentor-iava.jpg, 1200×630.
// É uma CAPTURA da hero real (selo, H1, luz de cima e o fundo), composta para o formato:
// a página é aberta numa tela de 1200×630 e, só nesta captura, o subtítulo e o botão
// saem (não cabem bem no 1,91:1) e o conteúdo fica centrado na altura. Nenhum texto novo:
// é o texto da página, na fonte da página. JPEG ~85, abaixo de 300 KB.

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { RAIZ, porLargura } from './comum.mjs'

const SAIDA = path.join(RAIZ, 'img/og-mentor-iava.jpg')
const COMPOSICAO = `
  .hero__sub, .hero__acao, #dor, main > section:not(#hero), footer { display: none !important; }
  .hero { min-block-size: 630px; padding-block: 0; display: grid; align-content: center; }
  .hero__conteudo { gap: 28px; }
`

const [png] = await porLargura([1200], async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.addStyleTag({ content: COMPOSICAO })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  return page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } })
})

let q = 85, buf
do {
  buf = await sharp(png).jpeg({ quality: q, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer()
  q -= 3
} while (buf.length > 300 * 1024 && q > 60)
fs.writeFileSync(SAIDA, buf)
const m = await sharp(buf).metadata()
console.log(`${path.relative(RAIZ, SAIDA)}: ${m.width}×${m.height} · qualidade ${q + 3} · ${(buf.length / 1024).toFixed(1)} KB`)
