# Selo do Reclame Aqui — implementação guardada

Removido da página em 2026-09-22 (pedido do Gustavo): a verificação do selo falha
também em zero7.com.br — a chamada a `api.reclameaqui.com.br` é recusada (CORS) e o
selo mostra só o widget genérico "Procure nossa empresa no Reclame AQUI", deixando 3
erros no console. Para voltar quando a verificação funcionar, reponha as 5 partes abaixo
e confira com `node scripts/selo-ra.mjs` (levanta o selo em produção) e com o console.

## Levantamento em produção (zero7.com.br, 2026-09-22, scripts/selo-ra.mjs)

| origem | tipos | requisições | transferido |
| --- | --- | --- | --- |
| s3.amazonaws.com (/raichu-beta/ra-verified/) | script, stylesheet, image | 3 | 46,8 KB |
| api.reclameaqui.com.br | XHR | 1 | falha (CORS) |
| fonts.googleapis.com | stylesheet | 2 | 2,9 KB |
| fonts.gstatic.com | font (Open Sans, Inter Tight) | 2 | 91,7 KB |

- Total: 8 requisições, ~141 KB.
- Cookies: nenhum; localStorage: nenhum. Mas pede fontes ao Google (o IP do visitante vai
  para o Google): avaliar na política de privacidade/consentimento.
- Caixa final: 76px de altura (widget 136×76).
- Escreve `style=""` no HTML que injeta: exige `style-src-attr 'unsafe-inline'` na CSP
  (sem isso, 3 violações; conferido que nenhuma outra parte da página precisa).

## 1. HTML — no rodapé, dentro de `#footer .logo`, depois de `rodape.horario`

```html
<div id="ra-verified-seal">
  <!-- o script do selo é inserido por js/selo-ra.js, depois da página pronta -->
</div>
```

## 2. HTML — no `<head>`, depois de `js/video.js`

```html
<script src="js/selo-ra.js" defer></script>
```

## 3. js/selo-ra.js

```js
// Selo do Reclame Aqui no rodapé (cópia da home). É script de TERCEIRO: só é pedido
// depois da página pronta (evento load) e quando o rodapé chega perto da tela — não
// pesa no LCP nem no TBT, e quem não rola até o fim não baixa nada dele.
// A caixa do selo tem altura reservada no CSS (#ra-verified-seal): CLS 0 ao aparecer.
// Domínios que ele usa (liberados na CSP do .htaccess): s3.amazonaws.com
// (/raichu-beta/ra-verified/), api.reclameaqui.com.br, fonts.googleapis.com e
// fonts.gstatic.com. Sem JS, o selo não aparece (a caixa fica vazia).

(() => {
  const alvo = document.getElementById('ra-verified-seal')
  if (!alvo) return

  const carregar = () => {
    const s = document.createElement('script')
    s.id = 'ra-embed-verified-seal'
    s.src = 'https://s3.amazonaws.com/raichu-beta/ra-verified/bundle.js'
    s.async = true
    s.dataset.id = 'WDRYanlCUWlyT0xFUTFZeDp6ZXJvNy10ZXNvdXJhcmlh'
    s.dataset.target = 'ra-verified-seal'
    s.dataset.model = '2'
    alvo.append(s)
  }

  const quandoPerto = () => {
    if (!('IntersectionObserver' in window)) return carregar()
    const obs = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) {
        obs.disconnect()
        carregar()
      }
    }, { rootMargin: '800px 0px' })
    obs.observe(alvo)
  }

  if (document.readyState === 'complete') quandoPerto()
  else addEventListener('load', quandoPerto, { once: true })
})()
```

## 4. CSS

Em `css/tokens.css` (junto de `--alvo-toque-minimo`):

```css
--selo-ra-altura: 4.75rem; /* 76px: altura do selo do Reclame Aqui (medida em produção) */
```

Em `css/rodape.css` (antes de `#pagamento picture`):

```css
/* diferença deliberada da home: o selo do Reclame Aqui chega depois (js/selo-ra.js);
   a caixa já nasce com a altura dele (76px, medida em zero7.com.br): CLS 0 */
#ra-verified-seal {
  min-block-size: var(--selo-ra-altura);
}
```

## 5. CSP (scripts/htaccess.txt)

A linha como estava com o selo:

```
# ⚠ ATENÇÃO: a Content-Security-Policy abaixo é ESTRITA. Se entrar Google Tag Manager,
```

E o comentário no topo do htaccess listando os domínios do selo e o motivo do
`style-src-attr 'unsafe-inline'`.
