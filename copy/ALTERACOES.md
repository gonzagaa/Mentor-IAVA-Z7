# Alterações de copy

Toda mudança no `copy.json` depois do docx original entra aqui, uma linha por bloco
alterado, na ordem em que aconteceu. Sem linha nesta tabela, a copy não muda.

| data | id | texto antigo | texto novo | quem pediu |
| --- | --- | --- | --- | --- |
| 2026-09-18 | `d1.cta1` | COMECE A ANALISAR SUAS OPERAÇÕES COM O IAVA | Experimentar agora o IAVA | Gustavo |
| 2026-09-18 | `d1.cta2` | COMO O IAVA FUNCIONA | *(removido da copy e da página)* | Gustavo |
| 2026-09-18 | `nav.itens` | *(pendente: itens do menu de navegação)* | *(removido — "não vai ter menu de navegação")* | Gustavo |
| 2026-09-18 | `d1.apoio` | Você opera. O IAVA analisa. | Você opera, o IAVA analisa. | Gustavo |
| 2026-09-18 | `rodape` | *(pendente: conteúdo do rodapé)* | *(removido — substituído pelo rodapé do site zero7.com.br)* | Gustavo |
| 2026-09-18 | `rodape.*` (11 blocos) | *(não existiam)* | textos do rodapé do site zero7.com.br: endereço, horário, Navegação (Home, Blog, Planos, Regulamento, Área do Trader), Suporte (suporte@zero7.com.br), Social | Gustavo |
| 2026-09-18 | `rodape.cnpj`, `rodape.simbolo`, `rodape.direitos`, `rodape.privacidade`, `rodape.aviso` | *(não existiam)* | textos do #author do site zero7.com.br, literais: razão social + CNPJ, "©", "| Todos os direitos reservados." (o ano é gerado por JS), "Política de Privacidade" e o aviso legal completo | Gustavo |
| 2026-09-18 | `rodape.cookie`, `rodape.uso` | *(não existiam)* | *(pendentes: no site da Zero7 os links "Cookie" e "Políticas de Uso" estão com href vazio)* | Gustavo |
| 2026-09-18 | `rodape.cookie`, `rodape.uso` | *(pendentes)* | Cookie · Políticas de Uso (links com href vazio, cópia 100% do site da Zero7) | Gustavo |
| 2026-09-18 | `rodape.pagamento` | *(não existia)* | Formas de Pagamento (#pagamento do site da Zero7, com as 6 imagens) | Gustavo |
| 2026-09-18 | `d7.provas` → `d7.prova1–3.numero/rotulo/descricao` | *(pendente: provas sociais)* | dados do Iago, aprovados pelo Gustavo — linhas originais: "+26 mil operações analisadas — Base de dados ativa e crescente" · "+1.300 traders na plataforma — Comunidade validada" · "50 padrões operacionais catalogados — Algoritmo calibrado com dados reais". Cada linha cortada em número, rótulo e descrição sem mudar caractere; o travessão é só separador e não aparece na página. Uma quarta linha ("55% de taxa de acerto média") foi descartada pelo Gustavo. | Gustavo |
| 2026-09-18 | `d6.titulo` | *(pendente: título da seção)* | Veja o Mentor IAVA funcionando na prática | Gustavo |
| 2026-09-18 | `d6.video` | *(pendente: vídeo de demonstração)* | *(removido — vídeo no YouTube, id RjCiGF0Ce7A, com capa local clicável)* | Gustavo |
| 2026-09-18 | `preco` | *(pendente na página)* | *(continua pendente no copy.json, mas fora da página — "oculto" — para não atrapalhar o design; o Gustavo resolve depois)* | Gustavo |
| 2026-09-18 | `alt.plataforma.topo` | *(não existia)* | Painel do Mentor IAVA com o briefing operacional e um alerta de revenge trading: risco de tilt alto e limite sugerido de 2 trades — **proposto pelo Claude Code, AGUARDANDO APROVAÇÃO do Gustavo** | Claude Code |
| 2026-09-18 | `alt.plataforma.evidencias` | *(não existia)* | Evidências estatísticas no painel do Mentor IAVA: saldo do período, taxa de acerto de 54,3%, drawdown máximo e melhor trade — **proposto pelo Claude Code, AGUARDANDO APROVAÇÃO do Gustavo** | Claude Code |
| 2026-09-18 | `alt.plataforma.chat` | *(não existia)* | Conversa com o Mentor IAVA: o trader pergunta “Como eu posso melhorar?” e recebe ajustes baseados nas próprias operações — **proposto pelo Claude Code, AGUARDANDO APROVAÇÃO do Gustavo** | Claude Code |
| 2026-09-18 | `img.plataforma.alerta` | *(não existia)* | *(pendente: o print da notificação "Padrão de Revenge Trading Detectado" não veio no dashboard-graficos.png; slot no lugar)* | Gustavo |
