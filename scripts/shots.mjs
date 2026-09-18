// npm run shots -- <rótulo>
// Página inteira em shots/<rótulo>/<largura>.png, nas 9 larguras.
// Só grava depois que fontes e CSS estão confirmados.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, lerRotulo, porLargura } from './comum.mjs'

const rotulo = lerRotulo()
const larguras = lerLarguras()
const destino = path.join(RAIZ, 'shots', rotulo)

const capturas = await porLargura(larguras, async ({ page, largura }) => {
  // rola até o fim e volta, para disparar tudo que for preguiçoso
  await page.evaluate(async () => {
    const passo = innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += passo) {
      scrollTo(0, y)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
    scrollTo(0, 0)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  const buffer = await page.screenshot({ fullPage: true })
  const altura = await page.evaluate(() => document.documentElement.scrollHeight)
  return { largura, buffer, altura }
})

// nada é escrito antes de todas as larguras passarem
fs.rmSync(destino, { recursive: true, force: true })
fs.mkdirSync(destino, { recursive: true })
for (const c of capturas) {
  const arquivo = path.join(destino, `${c.largura}.png`)
  fs.writeFileSync(arquivo, c.buffer)
  console.log(`  ${c.largura}.png  ${c.largura}×${c.altura}  ${(c.buffer.length / 1024).toFixed(0)} KB`)
}
console.log(`\n${capturas.length} captura(s) em shots/${rotulo}/`)
