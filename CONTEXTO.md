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
   saber o que falta. `scripts/pendentes.mjs` lista todos.
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
  ficam só para o que não é superfície: pílula da nav, selo, ladrilho de ícone, pontos.
- **Fonte display: NCS Radhiumz** (continua só local até a licença Webfonts).
  **Unbounded** fica documentada como reserva, sem carregar em página nenhuma.
- **CTAs em caixa alta por CSS** (`text-transform` na `.botao`); o texto no HTML e no
  json segue como o dono escreveu.

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
- **H1 (`--fs-5`)**: 23px em 320, 27px em 375, 64px de 1474 em diante. O teto no celular
  vem de uma regra, não de gosto: nenhuma linha do H1 pode ter uma palavra só, e o menor
  par possível para "ANALISANDO" é "ANALISANDO CADA" (12,41em).

## Estrutura de pastas

```
index.html
amostra.html  página de amostra do sistema visual (NÃO vai para produção)
css/          tokens.css, base.css, componentes.css, fundos.css, hero.css, pendente.css
              amostra.css (NÃO vai para produção)
js/           amostra.js (NÃO vai para produção)
fonts/
img/          imagens finais usadas pela página
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
| `npm run tokens` | cor literal fora do tokens.css, display fora da `.display`, contraste |
| `npm run pintura` | trace do Chrome: custo de pintura das animações da hero (com e sem a varredura do H1) |
| `node scripts/gerar-copy-md.mjs` | regera `copy/COPY.md` a partir do `copy.json` |

Todos os de navegador aceitam `--larguras=375,1474` (recorte das 9 larguras) e
`--pagina=amostra.html` (padrão: index). Emulam `prefers-reduced-motion: reduce`; `--movimento`
desliga a emulação. `shots --dobra` captura só a primeira dobra, na altura de tela de
cada largura (`DOBRA` em `scripts/comum.mjs`); o `medir` mede o H1 (linhas, palavra
sozinha, palavra partida) e a posição do botão da hero nessas alturas. Antes de medir ou capturar, cada um confirma que as fontes carregaram
do arquivo esperado (`document.fonts.check()`) e que `--css-carregado` vale 1 no `:root`;
se falhar, PARA com código 1 e não grava nada. Na amostra, `npm run copy` aceita repetição
de blocos e isenta só o texto de `.rotulo-tecnico`.

## Estado atual

**Fase 2 concluída — cabeçalho e #hero construídos no index.html.** O resto da página
(#dor em diante) ainda é o esqueleto sem estilo.

- **Hero**, de cima para baixo: nav (pílula com o pendente `nav.itens`) → selo
  (`d1.apoio`, ponto "ao vivo" pulsando) → H1 `.display` branco iluminado de cima →
  subtítulo → um botão (`d1.cta1`, `href="#"` + `data-pendente-href`) → pendente
  `d1.cta.destino`. Fundo: grade de quadrados + arco de horizonte invertido + cone de luz
  que respira.
- **Animações da hero (3)**: respiro da luz (opacity), pulso do selo (transform +
  opacity) — ambas só compositor, zero pintura —, e a varredura do H1
  (`background-position`, pinta ~1,2s a cada 7s). Todas param com reduced-motion.
  O H1 nasce visível: nenhuma entrada animada.
- **Copy**: 51 blocos (`d1.cta1` mudou, `d1.cta2` saiu — ver `copy/ALTERACOES.md`).
- `amostra.html` segue como guia do sistema (seções 1–5); as comparações decididas e o
  hero de teste saíram.
- A revisar quando a próxima seção for montada: `--fs-4` (h2) é maior que o H1 no
  celular (29px × 27px em 375) e vai esbarrar na mesma regra de "nenhuma linha com
  uma palavra só".
- Pendentes ainda abertos da fase 0: `<title>` "Mentor IAVA"; `preco` em `#demonstracao`.
