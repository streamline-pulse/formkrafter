---
title: Theming
description: CSS custom properties, dark mode via cascade, and the bring-your-own-CSS strategy.
---

All styling flows through CSS custom properties — override them anywhere in the cascade, globally or scoped to a subtree:

| Token | Light | Dark |
|---|---|---|
| `--fk-color-primary` | `#328f97` | `#4fb8b2` |
| `--fk-color-surface` | `#ffffff` | `#111c24` |
| `--fk-color-border` | `#d5dde2` | `#2d3f4b` |
| `--fk-color-text` / `--fk-color-muted` / `--fk-color-danger` | … | … |
| `--fk-radius` / `--fk-spacing` / `--fk-font` | layout tokens | — |

```css
.my-brand {
  --fk-color-primary: #7c3aed;
  --fk-radius: 2px;
}
```

## Dark mode

Dark mode activates with the Tailwind-style `.dark` class **or** `data-fk-theme="dark"` on any ancestor — pure CSS cascade, no JavaScript, scopable to a subtree (you can render a dark form preview inside a light page).

## Bring your own CSS

`styles.css` is opt-in and weighs 6 KB. Skipping it entirely and styling the `.fk-*` classes yourself is a supported strategy — the components ship no global resets, no CSS framework, and nothing leaks outside their own class namespace.
