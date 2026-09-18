# Contexto — Landing page Mentor IAVA (Zero7)

Leia este arquivo inteiro antes de qualquer tarefa. Ele é a fonte de verdade do projeto
e deve descrever o ESTADO ATUAL, não o histórico. Atualize-o ao fim de cada fase.

## O que é

Landing page de venda do **Mentor IAVA**, ferramenta de IA da Zero7 que analisa o
histórico de operações do trader e entrega um diagnóstico de performance.
Publicação: **zero7.com.br/mentor-iava/** (subpasta — todo caminho de asset é RELATIVO,
nunca começando com `/`).

## Stack

HTML + CSS + JS puro. Sem framework, sem build, sem bundler. Node só para os scripts de
verificação (Playwright) em `scripts/`. Nada de `node_modules` em produção.

## Arquivos-fonte que não se editam à mão

- `copy/copy.json` — toda a copy da página, literal, com um `id` por bloco. **Fonte da
  verdade.** Só muda com pedido explícito do dono, e toda mudança ganha uma linha em
  `copy/ALTERACOES.md` (data, id, texto antigo, texto novo, quem pediu).
- `copy/COPY.md` — versão legível, gerada: `node scripts/gerar-copy-md.mjs`.
- `copy/ALTERACOES.md` — histórico de mudanças de copy depois do docx.
- `copy/LP - Mentor IAVA.docx` — original.

## REGRAS INVIOLÁVEIS

1. **A copy é literal.** Todo texto visível da página vem de `copy/copy.json`, idêntico,
   inclusive erros de digitação, pontuação e caixa alta. Não corrija, não reescreva, não
   complete, não "melhore". Se um layout parecer pedir texto diferente, PARE e pergunte.
2. **Todo elemento com texto de copy leva `data-copy="<id>"`** com o id do `copy.json`.
   `scripts/verificar-copy.mjs` compara um a um (`textContent`) e falha se divergir.
   **Marcação inline dentro da copy é permitida**: envolver trechos em `<span>` para
   quebra de linha ou destaque. **Proibido** acrescentar ou tirar qualquer caractere, e
   **proibido `<br>`**. Separadores visuais são CSS (pseudo-elemento), nunca texto.
3. **Nenhum texto inventado.** Nada de lorem ipsum, número de exemplo, depoimento fictício,
   rótulo de seção, eyebrow, legenda de card, microcopy de botão ou item de menu que não
   esteja no `copy.json`. Onde o design pedir um texto que não existe, use um PENDENTE.
4. **PENDENTE é visível de propósito.** Componente `.pendente` com `data-pendente="<id>"`:
   caixa tracejada magenta (#FF2BD6), fundo listrado, texto `[PENDENTE: <descrição>]`.
   Ele deve saltar aos olhos numa página preta e azul — é para o dono bater o olho e
   saber o que falta. `scripts/pendentes.mjs` lista todos. **Exceção (decisão do
   dono):** pendente de DESTINO DE LINK não vira caixa na página; fica só no atributo
   `data-pendente-href="<id>"` do link (ex.: `d1.cta.destino` nos CTAs de compra). Os
   scripts contam e listam esse pendente pelo atributo.
5. **Decoração pode ter texto só se for imagem gerada sem texto legível** ou se o texto
   estiver no `copy.json`. Mockups de dashboard com números inventados são proibidos;
   quando precisar de tela da plataforma, use PENDENTE `print-plataforma`.
6. **Tokens desde o dia 1.** Nenhum valor literal de cor, raio, espaço, sombra, fonte ou
   duração fora de `css/tokens.css`. Exceção: valores de posicionamento de uma peça única.
7. **Raiz tipográfica: `html { font-size: 100% }` e nunca muda.** 1rem = 16px (respeita a
   preferência do navegador). A escala é fluida com `clamp()`; nada de trocar a raiz por
   media query.
8. **Toda verificação cobre as 9 larguras:** 320, 375, 390, 430, 768, 1024, 1280, 1474,
   1920. Critério de aceite que diz "no celular" ou "no desktop" sem números é inválido.
9. **Um commit por fase.** Mensagens em português, no padrão `tipo(escopo): descrição`.
10. Se algo parecer intencional e não erro, **pergunte antes**.
11. **Segurança de processos.** Nunca encerrar processos por filtro amplo (`taskkill /FI`,
    `killall`, `pkill` por nome genérico). Só encerrar processos iniciados pelos próprios
    scripts, pelo PID. Os scripts que abrem navegador ou servidor guardam o PID (em
    `.pids/`) e têm timeout próprio: `vigiar()` / `abrirNavegador()` em
    `scripts/comum.mjs` (padrão 10 min, `--tempo-max=MIN`); `npm run servir` encerra
    sozinho em 120 min (`--minutos=N`). Sobras: `npm run parar` (só pelos PIDs de `.pids/`).
12. **Hover e cursor pointer só em `<a href>` e `<button>`. Nada que não seja clicável
    reage ao mouse.** Cards, ícones, textos e blocos não têm `:hover`, `:active` nem
    `cursor: pointer`. Revelação no scroll e barras acesas da #dor são animação de
    entrada, não interação — continuam. `npm run tokens` falha se achar `:hover`/`:active`
    ou `cursor: pointer` fora de `a`, `button` ou `.botao`.

## Direção visual

Referência estética (não estrutural): landing "GabrielWebd" no Behance. Pegamos a
linguagem, não o layout nem as seções. A Zero7 costuma usar cinza e azul-escuro; **aqui
a proposta é mais agressiva e futurista**.

**Cor**
- Fundo: preto de verdade (#000 e um degrau #05070A). Nada de cinza nem azul-marinho
  como fundo de página.
- Marca: azul Zero7 **#0080C9**. A referência é roxa — trocamos TODO roxo/lavanda por
  derivados do azul (azul elétrico mais claro para neon, ciano para o topo do brilho,
  azul profundo para halos). Nenhum roxo na página.
- Texto: branco para títulos, segunda linha do título em azul claro/gradiente,
  corpo em branco com opacidade reduzida.

**Assinaturas da referência que queremos, reinterpretadas em azul**
- Arco de horizonte luminoso (borda de planeta com bloom forte) como marco de seção.
- Grade de quadrados sutil no fundo, com alguns quadrados preenchidos aleatórios.
- Nav em pílula de vidro, centralizada, item ativo preenchido.
- Títulos em duas linhas: primeira branca, segunda na cor de acento.
- Cards pretos com borda de 1px quase invisível que acende no hover.
- Ícones 3D de vidro/metal em ladrilho arredondado (virão do Nano Banana).
- Ilustrações 3D isométricas com trilhas de circuito (virão do Nano Banana).
- Fileiras de pílulas em marquee, sentidos opostos.
- Palco de luz com piso em grade em perspectiva no CTA final.
- Botão primário preenchido com brilho, dentro de um anel externo sutil.

**Onde ir além da referência (o "agressivo")**
- Bloom mais forte e contraste mais duro: preto absoluto contra neon.
- Bordas neon finas em gradiente animado nos elementos-chave (com parcimônia).
- Grão/ruído sutil por cima dos gradientes para não "bandear".
- Movimento: entradas curtas e firmes, sem bounce. Tudo respeitando
  `prefers-reduced-motion`.

## Decisões aprovadas (fase 2)

- **Canto: assimétrico Zero7** (`--raio-z7` / `--raio-z7-p`) em toda superfície: cards,
  botões e campos (`--raio-card`, `--raio-botao`, `--raio-campo`). Os raios simétricos
  ficam só para o que não é superfície: selo, ladrilho de ícone, pontos.
- **Fonte display: NCS Radhiumz** (continua só local até a licença Webfonts).
  **Unbounded** fica documentada como reserva, sem carregar em página nenhuma.
- **CTAs em caixa alta por CSS** (`text-transform` na `.botao`); o texto no HTML e no
  json segue como o dono escreveu. Botões com 60px de altura (`--altura-botao`).
- **Sem cabeçalho**: não há menu de navegação nem logo na página (`nav.itens` saiu da
  copy). A página começa direto na hero.
- **H1 estático**: sem faixa de brilho animada; a luz vem só do gradiente dentro do texto.

## Sistemas reutilizáveis (valem para todas as seções)

- **Ritmo entre seções**: `--respiro-secao` (96px no celular → 160px no desktop). Toda
  seção depois da hero usa a classe `.secao` (gutter + `--respiro-secao` embaixo); a
  hero termina com o mesmo respiro. O espaço entre duas seções é sempre esse token.
- **Revelação no scroll** (`js/revelar.js` + estilos em `componentes.css`), sem
  biblioteca: `data-revelar` (opacidade + subida de 12px, 400ms, easing de saída),
  `data-revelar="acender"` (não some: entra apagado e acende), `data-revelar-atraso="N"`
  (N × 150ms, para sequência). **Progressive enhancement**: o estado escondido só existe
  depois que o script põe `.revelar-ativo` no `<html>`; sem JS tudo aparece. Com
  reduced-motion o script não liga (tudo no estado final). O que já está na tela ao
  carregar aparece direto, sem piscar. **Não se aplica ao H1 da hero.**
- **Lista com barra acesa** (`.lista-barra`, ref. 04): itens com barra vertical à
  esquerda; com `data-revelar="acender"`, a barra acende em azul e o texto vai de
  `--texto-3` a `--texto`, um item de cada vez.
- **Degrau "destaque"** (`.degrau-destaque`, `--fs-destaque`): entre o H2 e o H1, para
  o momento tipográfico de uma seção.

## Tipografia

- Títulos (display): **NCS Radhiumz** — a mesma da home zero7.com.br, amarra com a marca.
- **NCS Radhiumz: sempre em caixa alta, só pela classe `.display`. Nunca minúscula.**
  A caixa alta é só CSS (`text-transform: uppercase` dentro da `.display`); o texto no
  HTML continua literal como no copy.json. Nenhum outro seletor usa
  `var(--fonte-display)` — `npm run tokens` falha se usar. Uso:
  `class="display degrau-N"`. Tracking da display é neutro a levemente positivo.
- Corpo e interface: **Inter** (licença OFL).
- Auto-hospedadas em `fonts/`, `font-display: swap`, preload só do que aparece acima da
  dobra. Nenhuma fonte de CDN.
- Inter: `fonts/InterVariable.woff2` (variável 100–900), OFL, `fonts/Inter-LICENSE.txt`.
- NCS Radhiumz: `fonts/NcsRadhiumz-Rp3x6.woff`, o WOFF original do cdnfonts, **sem
  conversão** (a licença proíbe converter formato). **Um peso só (400).**
- ⚠ **NCS Radhiumz só em ambiente local até a licença Webfonts ser confirmada. Não
  publicar.** O arquivo é "All Right Reserved" da Namara Creative Studio; `@font-face`
  exige a licença paga Webfonts (onedsgn.com/licenses). Ver `fonts/NCS-Radhiumz-LICENCA.md`.
- Reserva OFL (não carregada em página nenhuma): **Unbounded**,
  `fonts/Unbounded-latin-variavel.woff2`, `fonts/Unbounded-LICENSE.txt`. Trocar = apontar
  `--fonte-display` para `--fonte-display-alternativa` e declarar o `@font-face`.
- **Regra de quebra de TODOS os títulos**: proibida linha contendo só uma palavra
  CURTA (5 caracteres ou menos, contando a pontuação — "SUA.", "DE", "POR", "DIA",
  "24"). Palavra longa sozinha é permitida ("ANALISANDO", "OPERAÇÃO"). Proibida palavra
  partida no meio. Onde precisar, prender a curta à vizinha com `<span>` sem quebra.
  O `medir` confere o H1 (curta sozinha, partida, palavra fora da caixa).
- **H1 (`--fs-5`) proporcional** à página, com respiro dos lados (ref. 01): bloco com
  teto de ~900px, 3–4 linhas no desktop. 22,9 · 27,1 · 28,3 · 31,4 · 38,1 · 43,1 · 48,2 ·
  52 · 56px (320 → 1920; 56 é o teto). No celular o limite é da regra de quebra: "CADA"
  precisa dividir linha com "ANALISANDO" (12,41em), senão "SUA." fica sozinha.
- **Escala de títulos**, válida nas 9 larguras: **H2 (`--fs-4`) = 0,72 × H1, nunca
  abaixo de 19px** (faixa aceita: 0,65–0,85); **H3 (`--fs-3`) = 0,7 × H2, nunca abaixo
  de 17px** (sempre menor que o H2 e maior que o corpo).
- **Luz do H1**: gradiente radial que nasce no centro de cima, no mesmo ponto do arco e
  do cone — azul (o elétrico do arco, clareado) → branco → prata (`#aeb6c2`) só nas
  pontas laterais. Halo externo bem discreto; a letra fica nítida.

## Estrutura de pastas

```
index.html
amostra.html  página de amostra do sistema visual (NÃO vai para produção)
css/          tokens.css, base.css, componentes.css, fundos.css, hero.css, dor.css, analise.css,
              pendente.css
              amostra.css (NÃO vai para produção)
js/           revelar.js; amostra.js (NÃO vai para produção)
fonts/
img/          imagens finais usadas pela página (banner-hero.png: teste do dono)
img/icones/   ícones 3D processados (transparentes) usados nos cards
img/nano/     imagens geradas no Nano Banana (nomes definidos nos prompts)
copy/         copy.json, COPY.md, ALTERACOES.md, docx original
scripts/      verificação (Playwright) — não vai para produção
referencias/  prints de referência visual (NÃO vai para produção, fora do git)
shots/        capturas (NÃO vai para produção)
medidas/      saídas do medir (NÃO vai para produção)
```

## Como rodar

Servidor local em `http://localhost:4321/mentor-iava/` — subpasta de propósito, para que
caminho absoluto quebre aqui igual quebraria em produção. Os scripts sobem e derrubam o
servidor sozinhos.

| comando | o que faz |
| --- | --- |
| `npm run servir` | sobe o servidor e fica de pé |
| `npm run copy` | compara a página com o `copy.json` (`textContent`); falha com código 1 se divergir |
| `npm run pendentes` | lista os pendentes da página, com seção e descrição |
| `npm run shots -- <rótulo>` | página inteira em `shots/<rótulo>/<largura>.png` |
| `npm run medir -- <rótulo>` | tabela de medidas em `medidas/<rótulo>.md` |
| `npm run tokens` | cor literal fora do tokens.css, display fora da `.display`, hover/cursor fora de clicável, contraste |
| `npm run pintura` | trace do Chrome: custo de pintura das animações da hero (tudo × parado) |
| `npm run lcp` | LCP em 390 e 1474, local e em 4G lento simulado, com o elemento de LCP |
| `npm run parar` | encerra só os processos que os scripts do projeto abriram (PIDs em `.pids/`) |
| `node scripts/gerar-copy-md.mjs` | regera `copy/COPY.md` a partir do `copy.json` |

Todos os de navegador aceitam `--larguras=375,1474` (recorte das 9 larguras) e
`--pagina=amostra.html` (padrão: index). Emulam `prefers-reduced-motion: reduce`; `--movimento`
desliga a emulação. `shots --dobra` captura só a primeira dobra, na altura de tela de
cada largura (`DOBRA` em `scripts/comum.mjs`); o `medir` mede o H1 (linhas, palavra
sozinha, palavra partida) e a posição do botão da hero nessas alturas. `shots --brilho=meio`
congela a luz de cima da hero no pico (sem reduce). `shots --secao=dor` captura só a seção
inteira; `--sem-js` carrega com JavaScript desligado. O `medir` também confere a regra de
quebra em todos os títulos `.display` e a menor fonte de cada seção. Antes de medir ou capturar, cada um confirma que as fontes carregaram
do arquivo esperado (`document.fonts.check()`) e que `--css-carregado` vale 1 no `:root`;
se falhar, PARA com código 1 e não grava nada. Na amostra, `npm run copy` aceita repetição
de blocos e isenta só o texto de `.rotulo-tecnico`.

## Estado atual

**Fase 4 — hero, #dor e #analise prontas no index.html.** De #para-quem em diante ainda é o
esqueleto sem estilo.

- **Hero** (sem cabeçalho, sem menu, sem logo): selo (`d1.apoio`, frase única em branco,
  ponto "ao vivo" pulsando) → H1 `.display` estático, luz radial azul → branco → prata →
  subtítulo → um botão (`d1.cta1`, **60px**, `href="#"` +
  `data-pendente-href="d1.cta.destino"` — **sem caixa de pendente na tela**). Fundo, de
  baixo para cima: **banner** `img/banner-hero.png` (troca do Gustavo: anel escuro
  simétrico, 1920×1080, PNG de 1,08 MB, a 70% e sumindo para baixo) → grade de quadrados
  → arco invertido + cone de luz que respira. Botão inteiro na dobra de 375 a 1920
  (em 320×568 fica 35px abaixo).
- **LCP**: é o banner (o Chrome atribui à `section#hero`, fundo do `::before`).
  Local: 96 ms (390) e 132 ms (1474). Em 4G lento simulado: ~7,8 s nas duas — o PNG de
  1,08 MB é o gargalo. Ainda NÃO otimizado (o dono vai trocar por AVIF).
- **#dor**: sequência narrativa em coluna estreita; termina com o feixe-ponte, que agora
  para exatamente na borda da seção.
- **#analise**: o feixe pousa no topo (ponto de luz + linha fina, no respiro, nunca sobre
  texto) → d3.titulo em `.display` H2 com "e destrincha isso para você." no gradiente
  de acento (via `<span>`), bloco de até 20em, centrado no celular e à esquerda a
  partir de 1024 → d3.intro → grade de 7 cards (ícone de 64px reservado, H3 em Inter
  semibold, descrição) + card destaque do chat. Grade: 1 coluna até 640px; 2 colunas
  até 1080px (item 7 e chat ocupam a linha inteira); 3 acima (item 7 + chat em 2
  colunas fecham a última linha). Halo azul suave atrás da grade. Cards revelam em
  sequência; não reagem ao mouse (não são clicáveis). Nada focável na seção.
- **Animações contínuas (3)**: respiro da luz e pulso do selo (hero, zero pintura) e a
  borda neon girando no card do chat. Mais as revelações, uma vez cada.
- **Copy**: 51 blocos + 6 pendentes (5 em caixa, `d1.cta.destino` só no link).
- `amostra.html` segue como guia do sistema (seções 1–5).
- Pendentes ainda abertos da fase 0: `<title>` "Mentor IAVA"; `preco` em `#demonstracao`.
