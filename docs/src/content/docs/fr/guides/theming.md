---
title: Theming
description: Custom properties CSS, dark mode par cascade, et la stratégie bring-your-own-CSS.
---

Tout le style passe par des custom properties CSS — surchargez-les n'importe où dans la cascade, globalement ou scopées à un sous-arbre :

| Token | Light | Dark |
|---|---|---|
| `--fk-color-primary` | `#328f97` | `#4fb8b2` |
| `--fk-color-surface` | `#ffffff` | `#111c24` |
| `--fk-color-border` | `#d5dde2` | `#2d3f4b` |
| `--fk-color-text` / `--fk-color-muted` / `--fk-color-danger` | … | … |
| `--fk-radius` / `--fk-spacing` / `--fk-font` | tokens de layout | — |

```css
.my-brand {
  --fk-color-primary: #7c3aed;
  --fk-radius: 2px;
}
```

## Dark mode

Le dark mode s'active avec la classe `.dark` façon Tailwind **ou** `data-fk-theme="dark"` sur n'importe quel ancêtre — pure cascade CSS, aucun JavaScript, scopable à un sous-arbre (vous pouvez rendre un aperçu sombre dans une page claire).

## Amenez votre propre CSS

`styles.css` est opt-in et pèse 6 Ko. L'ignorer entièrement et styler vous-même les classes `.fk-*` est une stratégie supportée — les composants n'embarquent aucun reset global, aucun framework CSS, et rien ne fuit hors de leur namespace de classes.
