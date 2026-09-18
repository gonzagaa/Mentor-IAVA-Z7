// npm run shots -- <rótulo> [--pagina=amostra.html] [--larguras=375,1474] [--movimento] [--dobra]
// Página inteira em shots/<rótulo>/<largura>.png, nas 9 larguras.
// --dobra: só a primeira dobra, na altura de tela de cada largura (DOBRA em comum.mjs),
//          em shots/<rótulo>/<largura>x<altura>.png.
// Só grava depois que fontes e CSS estão confirmados.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, lerRotulo, lerPagina, lerMovimento, porLargura } from './comum.mjs'

const rotulo = lerRotulo()
const larguras = lerLarguras()
const pagina = lerPagina()
const movimento = lerMovimento()
const dobra = process.argv.includes('--dobra')
const destino = path.join(RAIZ, 'shots', rotulo)

const capturas = await porLargura(
  larguras,
  async ({ page, largura }) => {
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
    const buffer = await page.screenshot({ fullPage: !dobra })
    const altura = await page.evaluate(d => (d ? innerHeight : document.documentElement.scrollHeight), dobra)
    return { largura, buffer, altura }
  },
  { pagina, movimento, dobra }
)

// nada é escrito antes de todas as larguras passarem
fs.rmSync(destino, { recursive: true, force: true })
fs.mkdirSync(destino, { recursive: true })
for (const c of capturas) {
  const arquivo = path.join(destino, dobra ? `${c.largura}x${c.altura}.png` : `${c.largura}.png`)
  fs.writeFileSync(arquivo, c.buffer)
  console.log(`  ${path.basename(arquivo)}  ${c.largura}×${c.altura}  ${(c.buffer.length / 1024).toFixed(0)} KB`)
}
console.log(`\n${capturas.length} captura(s) de ${pagina} em shots/${rotulo}/`)
