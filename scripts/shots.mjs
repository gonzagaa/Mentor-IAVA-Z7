// npm run shots -- <rótulo> [--pagina=amostra.html] [--larguras=375,1474] [--movimento] [--dobra]
// Página inteira em shots/<rótulo>/<largura>.png, nas 9 larguras.
// --dobra: só a primeira dobra, na altura de tela de cada largura (DOBRA em comum.mjs),
//          em shots/<rótulo>/<largura>x<altura>.png.
// --brilho=meio: SEM reduced-motion; antes de capturar congela as animações da hero
//          com a faixa de brilho no meio da passagem pelo H1 e a luz de cima no pico.
// Só grava depois que fontes e CSS estão confirmados.

import fs from 'node:fs'
import path from 'node:path'
import { RAIZ, lerLarguras, lerRotulo, lerPagina, lerMovimento, porLargura } from './comum.mjs'

const rotulo = lerRotulo()
const larguras = lerLarguras()
const pagina = lerPagina()
const dobra = process.argv.includes('--dobra')
const argBrilho = process.argv.find(a => a.startsWith('--brilho='))
const brilho = argBrilho ? argBrilho.slice('--brilho='.length) : null
if (brilho && brilho !== 'meio') {
  console.error(`erro: --brilho=${brilho} não existe (só --brilho=meio)`)
  process.exit(1)
}
const movimento = lerMovimento() || brilho === 'meio' // congelar exige as animações vivas

// Momentos congelados (ms), a partir do CSS da hero:
//  varrer-titulo — ciclo de 7000ms; a faixa anda de 5800ms (82,857%) a 7000ms → meio em 6400
//  respirar-luz  — opacidade 1 em 0% e 100%: o pico é o início do ciclo
//  pulso-ao-vivo — início do pulso (anel sobre o ponto)
const CONGELAR = { 'varrer-titulo': 6400, 'respirar-luz': 0, 'pulso-ao-vivo': 0 }
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
    if (brilho === 'meio') {
      const congeladas = await page.evaluate(congelar => {
        const feitas = []
        for (const a of document.getAnimations()) {
          if (!(a.animationName in congelar)) continue
          a.pause()
          a.currentTime = congelar[a.animationName]
          feitas.push(a.animationName)
        }
        return feitas
      }, CONGELAR)
      const faltou = Object.keys(CONGELAR).filter(n => !congeladas.includes(n))
      if (faltou.length) throw new Error(`--brilho=meio: animação não encontrada em ${largura}px: ${faltou.join(', ')}`)
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
    }
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
