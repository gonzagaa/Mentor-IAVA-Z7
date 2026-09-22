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
- **Movimento** (fase 15): bibliotecas LOCAIS e fixadas em `js/vendor/` (GSAP 3.15.0 +
  ScrollTrigger, "Standard No-Charge License" — uso comercial livre, exceto ferramentas
  tipo construtor visual; Lenis 1.3.26, MIT), com as licenças; todas com defer.
  - **Scroll suave** (`js/rolagem.js`): Lenis só na roda/trackpad (smoothWheel; toque
    nativo, syncTouch desligado), no ticker do GSAP (autoRaf desligado,
    ScrollTrigger.update no scroll, lagSmoothing(0)). Com reduced-motion NÃO inicia.
    CSS recomendado do Lenis em `base.css`. Teclado, Tab e sticky seguem nativos.
    Roda sobre o vídeo do YouTube já carregado: com a página parada, o iframe recebe a
    roda e a página rola no scroll nativo (um salto, sem suavização); durante uma
    rolagem suave o iframe não captura a roda e ela continua suave.
  - **Revelação** (`js/revelar.js`, GSAP ScrollTrigger): TODA animação de entrada passa
    por ele (revelações, "Talvez", glow do card IAVA, inclinação das molduras, contagem). Nenhuma animação de entrada em CSS. Mesma API: `data-revelar`
    (opacidade + subida de 12px, 400ms), `="acender"`, `data-revelar-atraso="N"` (N ×
    150ms RELATIVO ao lote que entra junto: quem entra sozinho anima na hora). Uma vez
    por elemento, com o elemento ~15% dentro da tela. O GSAP só escreve VARIÁVEIS CSS
    (`--revelar-opacidade`, `--revelar-y` → opacity + translate; `--acesa`,
    `--inclinar`); o CSS descreve só o estado final. **Progressive enhancement**: o estado
    escondido só é aplicado depois de o script confirmar o GSAP; sem JS/bibliotecas tudo
    aparece; reduced-motion via gsap.matchMedia (nada anima). O que já está na tela ao
    carregar nasce pronto. **Não se aplica ao H1 da hero.** Desempenho: estado escondido
    escrito sem ler estilo entre escritas e gatilhos criados numa tarefa separada (um
    set por elemento custava ~0,6s de tarefa longa no celular 4×).
  - Diagnóstico: `npm run diagnostico-movimento` (quadros da rolagem + pisca/pulo/nunca/
    repete/tempo morto, CLS, scroll lateral e console, com o Lenis ativo).
- **Lista com barra acesa** (`.lista-barra`, ref. 04): itens com barra vertical à
  esquerda; com `data-revelar="acender"`, a barra acende em azul e o texto vai de
  `--texto-3` a `--texto`, um item de cada vez.
- **Hierarquia de luz** (toda seção nova respeita): o arco é a assinatura da página.
  **Forte**: só o arco da hero (com o cone) e o arco da #origem. **Médio**: cards
  destaque, painel de dados da #provas, palco do vídeo e glow das molduras `.tela`
  (não há mais halo de seção: o da #provas saiu, o arco da #origem o substitui). **Sutil**: marcadores,
  trilhas, barras, feixes, pontos. Nenhum outro brilho tem a força do arco.
- **Largura**: `--largura-max: min(92vw, 1360px)` é o wrapper de conteúdo de toda seção
  (≈ 71% da tela em 1920; gutter da `.secao`, ≥ 40px, em 1280/1474). Cresce com ele:
  grades, colunas e cards. NÃO cresce (medida de leitura): bloco do H1 (~900px),
  subtítulo da hero (60ch), coluna da #dor (`--coluna-estreita`, 720px, teto) e textos
  com `--medida-leitura` (52ch ≈ 65–68 caracteres). **Nenhum texto corrido passa de 75
  caracteres por linha** — exceção do dono: o d5.intro tem a largura do bloco do H1
  (~900px, quebra equilibrada) e chega a ~100 caracteres em 1080–1280. Card largo não estreita nem deixa vazio: divide o conteúdo em
  colunas dentro dele (virada da #para-quem, chat da #analise) ou centra a frase na
  medida (item 3 da #o-que-e). `npm run larguras` mede tudo.
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
              para-quem.css, o-que-e.css, demo.css, provas.css, origem.css, rodape.css,
              pendente.css
              amostra.css (NÃO vai para produção)
js/           rolagem.js, revelar.js, ano.js, video.js; vendor/ (GSAP, ScrollTrigger,
              Lenis + licenças); amostra.js (NÃO vai para produção)
fonts/        InterVariable-latin.woff2 (subconjunto latino, é o que a página usa),
              InterVariable.woff2 (original), NcsRadhiumz-Rp3x6.woff (original, sem conversão)
img/          banner-hero.png: ORIGEM do banner (não vai para produção)
img/hero/     banner da hero em AVIF/WebP 960/1280/1920 (scripts/processar-imagens.mjs)
img/icones/   ícones 3D (AVIF/WebP 128px; os PNG são a origem) e a ilustração do IAVA
img/marca/    logo da Zero7 (SVG), favicon-32.png e apple-touch-icon.png (do favicon do
              site da Zero7; o arquivo copiado está em originais/)
img/pagamento/ bandeiras do rodapé: N-104.avif/webp (os N.webp são a origem)
img/demo/     capa do vídeo da #demonstracao (AVIF/WebP)
img/plataforma/ recortes dos prints reais (originais/ não vai para produção)
img/nano/     imagens geradas no Nano Banana (nomes definidos nos prompts)
copy/         copy.json, COPY.md, ALTERACOES.md, docx original
scripts/      verificação (Playwright), processamento de imagens/fontes, publicar — não vai
              para produção; htaccess.txt é a fonte do dist/.htaccess
dist/         pacote de produção gerado pelo npm run publicar (fora do git)
docs/         implementações guardadas para voltar depois (selo-reclame-aqui.md)
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
| `npm run larguras` | largura do conteúdo e % da tela por seção, e maior linha de texto corrido |
| `npm run parar` | encerra só os processos que os scripts do projeto abriram (PIDs em `.pids/`) |
| `npm run publicar` | monta `dist/` (só o que a página referencia, CSS numa folha só, URLs com `?v=hash`, `.htaccess`); falha se faltar arquivo; BLOQUEIA (código 1) enquanto a licença da NCS não estiver confirmada |
| `npm run desempenho` | celular (CPU 4×, 4G lento) × desktop: LCP, FCP, TBT, CLS, peso, requisições; e CLS com rede lenta nas 9 larguras (`--dist` mede o pacote; `--bloquear=x` isola um arquivo) |
| `npm run acessibilidade` | axe-core nas 9 larguras (0 sérias/críticas), títulos, landmarks, ordem do Tab com foco visível, contraste dos gradientes na cor mais escura |
| `npm run imagens` | inventário das imagens: dimensões, peso e tamanho de exibição nas 9 larguras |
| `npm run diagnostico-movimento` | quadros da rolagem + pisca/pulo/nunca/repete/tempo morto, CLS, scroll lateral e console, com o Lenis |
| `node scripts/processar-imagens.mjs` | banner, ícones e bandeiras em AVIF/WebP no tamanho de exibição (×2) |
| `node scripts/subsetar-inter.mjs` | Inter → subconjunto latino (falha se faltar caractere da copy) |
| `node scripts/fontes-reserva.mjs` | recalibra as fontes reserva (rodar de novo se a copy ou o layout da primeira dobra mudar) |
| `node scripts/selo-ra.mjs` | levanta o selo do Reclame Aqui em produção (domínios, peso, cookies, altura) — para quando ele voltar |
| `node scripts/gerar-og.mjs` | regera img/og-mentor-iava.jpg (captura da hero composta em 1200×630) |
| `node scripts/gerar-copy-md.mjs` | regera `copy/COPY.md` a partir do `copy.json` |

Todos os de navegador aceitam `--dist` (servem a pasta `dist/` com os headers de segurança
do `dist/.htaccess`, CSP inclusa, e gzip como em produção), `--larguras=375,1474` (recorte das 9 larguras) e
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

## Pacote de produção (fase 9)

- `npm run publicar` → `dist/`: index.html sem comentários, as 15 folhas de estilo numa só
  (`css/estilo.css`, sem comentários), só os arquivos que a página e o CSS referenciam
  (PNG de origem, img/plataforma/topo-*, img/nano/, amostra.* etc. ficam fora por
  construção), toda URL local com `?v=<hash>` (cache de 1 ano seguro), licenças do Lenis
  (MIT) e da Inter (OFL). Falha se o index.html ou o CSS pedir arquivo que não está no
  dist/.
- `dist/.htaccess` (fonte: scripts/htaccess.txt): nosniff, Referrer-Policy
  strict-origin-when-cross-origin, X-Frame-Options SAMEORIGIN, Permissions-Policy
  restritiva (YouTube liberado para autoplay/fullscreen/PiP/encrypted-media), CSP estrita
  (tudo 'self' + data: em img; único terceiro: youtube-nocookie em frame-src; sem
  style-src-attr), gzip, cache de 1 ano para css/js/fontes/imagens e no-cache no index.html, e o
  aviso no topo: GTM, Pixel ou qualquer terceiro exige atualizar a CSP.
- **BLOQUEIO NCS**: enquanto este arquivo não tiver a linha abaixo (com a licença
  Webfonts confirmada de verdade), o `npm run publicar` monta o dist/ mas termina com
  aviso em destaque e código 1 (a linha tem que estar sozinha, sem crase):
  Licença NCS Radhiumz (Webfonts): CONFIRMADA.
- **Fontes**: Inter em subconjunto latino (103 KB; era 344 KB). Três FONTES RESERVA com as
  medidas das fontes da página (`css/fontes.css`, geradas por scripts/fontes-reserva.mjs):
  Arial → Inter 100–599, Arial Bold → Inter 600–900, Arial Black → NCS Radhiumz; calibradas
  para os textos da primeira dobra quebrarem nas MESMAS linhas nas 9 larguras. `--ch`
  (0,625em) no lugar do `ch` das medidas: não muda de largura na troca de fonte.
- **Head**: canonical https://zero7.com.br/mentor-iava/, robots index,follow, theme-color
  preto, favicon da Zero7, og:type/url/locale/site_name, twitter:card. **Imagem de
  compartilhamento**: img/og-mentor-iava.jpg (1200×630, JPEG 85, ~60 KB) — captura da
  hero real (selo, H1, luz de cima e fundo) composta para o formato, sem subtítulo e
  botão (scripts/gerar-og.mjs); og:image e twitter:image com URL ABSOLUTA
  (https://zero7.com.br/mentor-iava/img/og-mentor-iava.jpg) + og:image:width/height/type;
  o publicar copia para o dist/ o que o head cita por URL absoluta. Pendentes (content
  vazio + data-pendente): `meta.titulo` (o <title> segue "Mentor IAVA" como reserva) e
  `meta.descricao`.
- **Medidas** (dist/, mediana de 5 rodadas): celular 4G lento + CPU 4× — LCP 2,0 s, TBT
  ~110 ms, CLS 0,002, 240 KB transferidos, 19 requisições (antes da fase 9: LCP 3,5 s,
  CLS 0,12, 1,86 MB, 36 requisições); desktop LCP 0,2 s, TBT 0. CLS com rede lenta nas 9
  larguras: 0,001–0,007. Acessibilidade: 0 violações sérias/críticas nas 9 larguras.

## Estado atual

**Todas as seções prontas, rodapé incluso.**

- **Hero** (sem cabeçalho, sem menu, sem logo): selo (`d1.apoio`, frase única em branco,
  ponto "ao vivo" pulsando) → H1 `.display` estático, luz radial azul → branco → prata →
  subtítulo → um botão (`d1.cta1`, **60px**, `href="#"` +
  `data-pendente-href="d1.cta.destino"` — **sem caixa de pendente na tela**). Fundo, de
  baixo para cima: **banner** (troca do Gustavo: anel escuro simétrico, a 70% e sumindo
  para baixo) — desde a fase 9 um `<img>` decorativo (alt="", aria-hidden) com AVIF/WebP
  960/1280/1920 (2–7 KB; o PNG de origem tinha 1,08 MB), object-fit: cover,
  fetchpriority="high" e preload com imagesrcset/imagesizes → grade de quadrados
  → arco invertido + cone de luz que respira. Botão inteiro na dobra de 375 a 1920
  (em 320×568 fica 35px abaixo). **Sem print** (fase 14): o fundo termina em preto
  por gradiente, sem linha (conferido linha a linha na luminância das laterais).
- **LCP** (fase 9, pacote dist/, celular com CPU 4× e 4G lento): **2,0 s** (antes 9,6 s com
  o PNG). O H1 NÃO é candidato — o Chrome ignora texto com preenchimento transparente (o
  gradiente, que fica); o LCP é o banner (celular) ou o subtítulo (desktop).
- **H1 com quebras FIXAS, sem <br>** (regra 36): `<span class="quebra quebra--celular">` /
  `<span class="quebra quebra--desktop">` VAZIOS (sem texto: o textContent é o da copy),
  `display: none` e `display: block` só na faixa em que a quebra existe — um bloco vazio
  no meio do texto encerra a linha. Mesmas linhas que o balanceamento dava com a NCS:
  6 no celular (< 768px: SEU NOVO / MENTOR DE / TRADING / 24 HORAS POR DIA / ANALISANDO
  CADA / OPERAÇÃO SUA.) e 4 a partir de 768px (SEU NOVO MENTOR / DE TRADING 24 HORAS /
  POR DIA ANALISANDO / CADA OPERAÇÃO SUA.). Assim a fonte reserva monta as mesmas linhas
  (conferido nas 9 larguras) e a troca de fonte não mexe o H1 (CLS).
- **#dor**: sequência narrativa em coluna estreita (até 1079px); termina com o
  feixe-ponte, que para exatamente na borda da seção, sempre no centro. **≥ 1080px**
  (fase 14): a seção ocupa a largura do wrapper — d2.p1 centrado; a pergunta do d2.p2
  numa linha só no maior tamanho que cabe (`--fs-pergunta-linha` = wrapper × 0,97 ÷
  17,17; ~68px em 1280, ~79px em 1474/1920, MAIOR que o H1, por pedido); a resposta
  centrada embaixo; os três "Talvez" em 3 colunas de mesma altura, com a barra no TOPO
  de cada card acendendo da esquerda para a direita (0 → 450 → 900ms, um lote só);
  d2.p6 com no máximo 75 caracteres (`--medida-virada`). Sem hover.
- **#analise**: o feixe pousa no topo (ponto de luz + linha fina, no respiro, nunca sobre
  texto) → d3.titulo em `.display` H2 com "e destrincha isso para você." no gradiente
  de acento (via `<span>`), centrado em todas as larguras; a partir de 1080px em 3
  linhas fixas e equilibradas (o acento na última) → d3.intro → grade de 7 cards (ícone de 64px reservado, H3 em Inter
  semibold, descrição) + card destaque do chat. Grade: 1 coluna até 640px; 2 colunas
  até 1080px (4 linhas de pares, item 7 + chat na última); 3 acima (item 7 + chat em
  2 colunas fecham a última linha, o chat com ícone grande à esquerda e texto à
  direita). Cards no fundo original do card base; só o chat em
  destaque (gradiente azul suave). Halo azul suave atrás da grade. Cards revelam em
  sequência; não reagem ao mouse (não são clicáveis). Nada focável na seção.
- **#para-quem**: ≥ 1080px em duas colunas (5fr/7fr) — d4.titulo em `.display` H2
  fixo (sticky, solta no fim da lista sem sobrepor) sobre feixes verticais suaves; à
  direita o d4.p1, UM `<p>` com as 6 frases em `<span>` display:block (abertura em
  `--fs-virada` + 5 perfis com fio de 1px e marcador quadrado aceso em CSS),
  revelando em sequência. Abaixo de 1080px, uma coluna. Depois, card destaque de
  virada com d4.p2 e d4.p3 (em 2 colunas dentro do card a partir de 1080px, 60/40, o d4.p3 centrado na
  vertical; abaixo,
  empilhados na medida de leitura), cada um com o trecho final no gradiente de acento.
- **#o-que-e**, parte A: d5.titulo (.display H2, centrado) + d5.p1 na medida → comparativo
  lado a lado (1 coluna < 768px, planilha em cima), mesma altura: painel da planilha
  (d5.p2, d5.p3; neutro, sem azul, grade de células em CSS sem números) e card destaque
  do IAVA (`img/icones/ilustracao-iava.webp`, 1208 e 640px, preto → transparência sem
  recorte, bordas esfumadas por máscara radial, altura reservada na proporção real 4:3
  + d5.p4).
  A planilha revela primeiro; o IAVA depois, e o glow dele sobe de 0 (só opacity, no
  `::after`). Parte B: d5.subtitulo (.display H3) + d5.intro → item 1 (H4 Inter
  semibold + texto) e item 2 (só texto, sem rótulo) ligados por trilha de circuito SVG
  (horizontal ≥ 768px; vertical no celular), e de cada um desce uma trilha até o item 3
  (card destaque na largura dos dois, frase centrada na medida). Sem numeração.
- **Prints reais da plataforma** (`scripts/processar-plataforma.mjs`: só recorte e
  otimização, AVIF/WebP com croma cheio; originais em `img/plataforma/originais/` fora do
  dist): **topo** — SAIU da hero na fase 14 (os arquivos `img/plataforma/topo-*` ficam
  no repositório mas NÃO vão para o dist/; alt marcado "oculto" no copy.json); **chat**
  no card do chat da #analise (≥ 1081px: print e texto lado a lado, 1.1fr/1fr — o dono
  pediu o print menor); **evidencias** (2×2 cards) no painel do IAVA; o chip foi para o
  fundo dos itens 1 e 2 da #o-que-e (nível sutil). **alerta**: removido (o print da
  notificação não vai existir; decisão do Gustavo). Componente `.tela` (componentes.css): vidro, --raio-z7, borda acesa no
  topo, três pontos, glow médio, reflexo. Alts em `alt.*` no copy.json (checados pelo
  `npm run copy`): evidências e chat APROVADOS pelo Gustavo (2026-09-22); o do topo
  segue no json, marcado "oculto" (o print saiu da página).
- **#demonstracao**: d6.titulo (.display H2) + d6.texto → tela (card destaque, vidro,
  --raio-z7) com a capa local do vídeo (`img/demo/capa-640/1280`, AVIF/WebP, lazy) num
  `<a href="https://www.youtube.com/watch?v=RjCiGF0Ce7A">` com `aria-labelledby` no título e
  botão de play em CSS/SVG (anel pulsando; hover/foco acendem e crescem). Com JS
  (`js/video.js`), o clique troca o link por um iframe youtube-nocookie no mesmo espaço
  16:9 (CLS 0), com title lido do título e foco nele; sem JS, abre o YouTube. NADA do
  YouTube carrega antes do clique. A tela entra inclinada e endireita com o scroll
  (`--inclinar` pelo `js/revelar.js`, scrub; reta com reduced-motion). Palco (5c) em nível médio
  embaixo, com reflexo suave. Depois, o CTA principal d6.cta. A CSP precisa de
  `frame-src https://www.youtube-nocookie.com`.
- **#provas**: UM painel de dados (`.provas__painel`, `--raio-z7`, glow médio, linha neon
  no topo) com os 3 números do Iago (`d7.prova1–3.numero/rotulo/descricao`), separados
  por fios neon: 1 coluna até 767px (fios horizontais), 3 colunas a partir de 768px
  (fios verticais; nunca 2). Número maior (`--fs-numero-painel`, sem quebra) com ponto
  vivo pulsando; rótulo Inter semibold `--texto`; descrição `--texto-3`. Sem barras de
  gráfico (removidas a pedido do Gustavo). Sem hover. Contagem (`js/revelar.js`, GSAP): o HTML traz o número
  final; a caixa é travada no tamanho final antes de contar (CLS 0); só a parte
  numérica anima, com "+", " mil" e o ponto de milhar em todos os quadros; ~1,2s,
  uma vez, ao entrar na tela; sem JS ou com reduced-motion, nada anima. Fechamento perto do painel (`--fechamento-perto`, 64→96px): ≥ 1080px em 2 colunas
  (d7.titulo à esquerda, ~55%; d7.p1 + d7.fecho à direita com linha neon de 2px), abaixo
  em 1 coluna. d7.p1 em `--texto-2` (≥ 9,77:1). Sem halo; fica acima da camada do arco.
- **#origem**: arco de horizonte (bloco 5b da amostra) sangrando até as bordas, d8.titulo
  logo abaixo da curva; a seção SOBE (`--origem-sobe`, fundo transparente)
  para o bloom começar logo abaixo do d7.fecho (0–22px medidos; alvo ≤ 80px desktop /
  ≤ 48px celular), sem cobrir texto; d8.p1/d8.p2 em 2 colunas ≥ 1080px (empilhados na medida abaixo);
  o argumento central do d8.p2 em `--texto`. Overflow recortado: nada vaza no rodapé.
- **Luz**: o painel da #provas (médio) e o arco da #origem (forte) aparecem juntos na
  rolagem; o arco é claramente o mais luminoso (`shots/fase13/`).
- **Títulos cortados**: `npm run medir` confere todo h1/h2/h3 rolado até o centro da
  tela (linha coberta por outro elemento ou recortada por ancestral com overflow).
- **Animações contínuas (4)**: respiro da luz e pulso do selo (hero, zero pintura) e a
  borda neon girando nos cards destaque (chat, virada, IAVA e item 3). Mais as entradas do GSAP, uma vez cada.
- **Rodapé**: CÓPIA 100% do rodapé de zero7.com.br (#footer, #pagamento, #author), por
  escolha do Gustavo — mesmo conteúdo, estrutura, tamanhos, cores, grades e hovers da home,
  inclusive o que contraria regras da página: aviso legal em 8px, links "Cookie" e
  "Políticas de Uso" com href vazio (marcados `data-href-vazio="copia-zero7"`; o
  `npm run tokens` só aceita esses e sempre os lista) e alvos de toque menores que 44px. `css/rodape.css` usa uma
  unidade local `--u` = o "1rem" da home (8px; 10,4px ≥ 1600px) — a raiz da página segue
  100%. Diferenças deliberadas: fonte do texto Inter (a home usa "TT Fors Trial", versão
  trial via CDN), ícones do ionicons em SVG local (mesmos desenhos, sem CDN) e o ano do ©
  automático (`js/ano.js`, com o ano atual no HTML). Textos em `rodape.*`; logo em
  `img/marca/`, bandeiras em `img/pagamento/` (copiadas do projeto Zero7).
- **Rodapé — diferenças deliberadas da home (fase 9)**: links de Navegação com alvo de
  toque de 24px (WCAG 2.2, 2.5.8; cada linha ~5px mais alta); bandeiras em AVIF/WebP no
  tamanho de exibição; SEM o selo do Reclame Aqui (ver abaixo).
- **Selo do Reclame Aqui: FORA da página** (2026-09-22, pedido do Gustavo). A verificação
  dele falha inclusive em zero7.com.br (a API recusa por CORS) e ele só mostrava o widget
  genérico, com 3 erros no console. Saíram o HTML, o js/selo-ra.js, a altura reservada no
  rodapé e as liberações na CSP (s3.amazonaws.com, api.reclameaqui.com.br, Google Fonts e
  style-src-attr 'unsafe-inline'). A implementação completa, o levantamento em produção
  (8 requisições, ~141 KB, sem cookies, mas pede fontes ao Google) e a CSP que ele exige
  estão em **docs/selo-reclame-aqui.md**, para voltar quando a verificação funcionar.
- **Links**: nenhum `href` vazio fora os dois do rodapé copiado; `#` só com
  `data-pendente-href` (`npm run tokens` falha se achar outro).
- **Copy**: 80 blocos + 2 pendentes: `d1.cta.destino` (só no link) e `preco` (marcado
  "oculto" — fora da página a pedido do Gustavo; o `npm run pendentes` lista).
- `amostra.html` segue como guia do sistema (seções 1–5).
- Pendentes ainda abertos da fase 0: `<title>` "Mentor IAVA"; `preco` em `#demonstracao`.
