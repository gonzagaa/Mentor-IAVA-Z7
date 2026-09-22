# GSAP 3.15.0 — licença

GSAP (gsap.min.js e ScrollTrigger.min.js, 3.15.0, pacote npm `gsap`) é distribuído sob a
**"Standard 'No Charge' GSAP License"** da GreenSock/Webflow:
https://gsap.com/standard-license

O pacote npm não traz arquivo de licença; o `package.json` declara:
`"license": "Standard 'no charge' license: https://gsap.com/standard-license."`
e o cabeçalho de cada arquivo (mantido intacto, como a licença exige):

    @license Copyright 2026, GreenSock. All rights reserved.
    Subject to the terms at https://gsap.com/standard-license.

Resumo conferido na página da licença em 2026-09-18:

- Uso comercial: permitido sem custo em qualquer site, aplicação web ou interface
  digital, por qualquer pessoa ou empresa (FAQ: "Can I really use GSAP in commercial
  projects without paying anything? Yes, really!").
- Restrição: não usar GSAP em ferramentas que permitam criar, editar ou gerenciar
  animações por uma interface visual/construtor semelhante ao Webflow sem consentimento
  por escrito. Esta landing page não é esse caso.
- Não remover nem alterar os avisos de propriedade/marca dos arquivos.

Os arquivos aqui são os de `dist/` do pacote, sem alteração além da remoção da linha
`//# sourceMappingURL=` (os .map não são publicados).
