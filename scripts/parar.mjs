// npm run parar
// Encerra processos que os PRÓPRIOS scripts do projeto abriram (servidor, navegador),
// pelos PIDs gravados em .pids/. Nunca por nome nem por filtro amplo (regra do
// CONTEXTO.md). Arquivo cujo processo já saiu é só apagado.

import fs from 'node:fs'
import path from 'node:path'
import { PASTA_PIDS } from './comum.mjs'

const vivo = pid => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

if (!fs.existsSync(PASTA_PIDS)) {
  console.log('nada registrado em .pids/')
  process.exit(0)
}

let encerrados = 0
for (const nome of fs.readdirSync(PASTA_PIDS).filter(f => f.endsWith('.json'))) {
  const arquivo = path.join(PASTA_PIDS, nome)
  let dados
  try {
    dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'))
  } catch {
    fs.rmSync(arquivo, { force: true })
    continue
  }
  const alvos = [...(dados.filhos || []), dados.pid].filter(pid => Number.isInteger(pid) && pid !== process.pid)
  for (const pid of alvos) {
    if (!vivo(pid)) continue
    try {
      process.kill(pid)
      encerrados++
      console.log(`encerrado PID ${pid} (${dados.script}, desde ${dados.inicio})`)
    } catch (e) {
      console.log(`não consegui encerrar PID ${pid}: ${e.message}`)
    }
  }
  fs.rmSync(arquivo, { force: true })
}
console.log(encerrados ? `${encerrados} processo(s) encerrado(s)` : 'nenhum processo do projeto estava rodando')
