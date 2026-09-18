// node scripts/gerar-copy-md.mjs
// Regera copy/COPY.md (versão legível) a partir de copy/copy.json, que é a fonte da
// verdade. Nunca editar o COPY.md à mão.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const copy = JSON.parse(fs.readFileSync(path.join(RAIZ, 'copy/copy.json'), 'utf8'))

const cabecalho = [
  '# COPY — Mentor IAVA',
  '',
  'Gerado a partir de `LP - Mentor IAVA.docx`. **Fonte da verdade é o `copy.json`.**',
  'Texto literal: nada foi corrigido. Espaços no início/fim de parágrafo foram aparados; espaços duplos internos foram mantidos (o HTML os colapsa na tela).',
  'Blocos `PENDENTE` são lacunas que precisam aparecer na página como caixa pendente — nunca preenchidas com texto inventado.',
  'Mudanças de copy posteriores ao docx estão registradas em `ALTERACOES.md`. Este arquivo é gerado por `node scripts/gerar-copy-md.mjs`.',
].join('\n')

// agrupa por seção, na ordem em que aparecem no json
const secoes = new Map()
for (const b of copy) {
  if (!secoes.has(b.secao)) secoes.set(b.secao, [])
  secoes.get(b.secao).push(b)
}

const item = b =>
  b.tipo === 'pendente'
    ? `- **\`${b.id}\`** — ⚠ PENDENTE: ${b.descricao}`
    : `- **\`${b.id}\`** · _${b.papel}_  \n  ${b.texto}`

const corpo = [...secoes]
  .map(([secao, blocos]) => `## ${secao}\n\n${blocos.map(item).join('\n')}`)
  .join('\n\n')

fs.writeFileSync(path.join(RAIZ, 'copy/COPY.md'), `${cabecalho}\n\n\n${corpo}\n`, 'utf8')
console.log(`copy/COPY.md regerado · ${copy.length} blocos em ${secoes.size} seções`)
