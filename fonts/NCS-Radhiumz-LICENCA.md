# NCS Radhiumz — relatório de licença

Levantado em 2026-09-18 a partir do arquivo baixado e dos metadados internos da fonte.

## Origem do arquivo

- Fonte do download: `https://fonts.cdnfonts.com/css/ncs-radhiumz`
- Único arquivo servido: `https://fonts.cdnfonts.com/s/51836/NcsRadhiumz-Rp3x6.woff` (WOFF, 16.628 bytes)
- O cdnfonts **não oferece pacote .zip** para esta família (`/download/ncs-radhiumz` → HTTP 404).
  Não veio nenhum arquivo de licença junto — só o binário da fonte.
- Convertido aqui para `NCSRadhiumz-Regular.woff2` (13.024 bytes).

## Pesos disponíveis

**Um só:** `font-weight: 400`, `font-style: normal` (Regular). Não há Bold, Light nem itálico.

## Nome interno do arquivo

- Nome completo (nameID 4): `NCS Radhiumz`
- Nome PostScript (nameID 6): `NCSRadhiumzRegular`
- Identificador único (nameID 3): `Version 1.000;XXXX;NCSRadhiumzRegular;2021;FLVI-609`

**Não há "Trial" nem "Demo"** em nenhum lugar — nem no nome do arquivo, nem nos nomes
internos. Não é uma versão de demonstração com glifos faltando.

## Metadados de licença dentro da fonte

| Campo | Valor |
| --- | --- |
| copyright (nameID 0) | `Copyright © 2021 \| Namara Creative Studio, All Right Reserved.` |
| trademark (nameID 7) | `NCS Radhiumz is Trademark Font of Namara Creativen Studio.` |
| fabricante (nameID 8) | `Namara Creative Studio` |
| designer (nameID 9) | `Toni Setiawan` |
| URL do fornecedor (nameID 11) | `https://onedsgn.com` |
| descrição da licença (nameID 13) | **ausente** |
| URL da licença (nameID 14) | `https://onedsgn.com/licenses` |
| OS/2 `fsType` | `0x0000` — embedding irrestrito no nível técnico |
| bloco de metadata XML do WOFF | ausente |

`fsType: 0x0000` só diz que o arquivo não tem trava técnica de embedding. Não é concessão
de licença: o copyright é "All Right Reserved" e aponta para uma licença paga.

## O que diz onedsgn.com/licenses

A Namara Creative Studio vende licenças por tipo de uso. Os trechos que importam:

- **Desktop** (a licença que normalmente acompanha um download): permite instalação em 2
  computadores e 10 projetos comerciais, mas **proíbe explicitamente**:
  *"Logo Usage/Branding · Website or App Embedding · Digital Ads or Broadcasting · Webfonts"*.
- **Webfonts** (licença separada, paga): *"1 Website · For licensee's web app and website
  usage only · Embedding fonts using @font-face · Monthly Webpage Views: 1,000,000 Views"*.
- Em "YOU ARE NOT ALLOWED TO", consta **Convert**: *"Converting products into different
  formats without written permission from us."*

## Conclusão

Usar a NCS Radhiumz em `zero7.com.br/mentor-iava/` via `@font-face` é exatamente o caso
coberto pela licença **Webfonts**, que é paga e não acompanha o arquivo do cdnfonts. A
conversão WOFF → WOFF2 feita aqui também cai na cláusula "Convert".

**Pendência do dono:** comprar a licença Webfonts em onedsgn.com (ou pelo contato da
Namara Creative Studio) para o domínio zero7.com.br, ou trocar a fonte de display.
Se a home da zero7.com.br já usa a NCS Radhiumz, vale checar se a licença já foi comprada
na época — nesse caso é só confirmar a cobertura do subdomínio/subpasta.
