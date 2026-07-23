---
title: Bricks
description: Les 30 bricks intégrées et comment enregistrer les vôtres.
---

Un spec de formulaire est un arbre de **bricks**. Chaque brick a un `type` (`input`, `panel`, `collection`, `output`, `action`), un `id` (quelle brick enregistrée la rend), des `configs` (avec un `uid` unique et une `key` de données), plus des `validations`, `rules`, `styles` et `children` optionnels.

## Bricks intégrées

| Catégorie | Bricks |
|---|---|
| **Inputs** (19) | text, email, password, url, phone, textarea, number, date, time, datetime, select, multi-select, radio, select-boxes, checkbox, tags, signature, address, code (CodeMirror, chargé en lazy) |
| **Data** (3) | file (upload pluggable, `uploadUrl` par brick, mode `multiple`), data-grid (lignes répétées, validation par ligne, réordonnancement), hidden |
| **Layout** (8) | content, recap (résumé vivant du formulaire), nested-form (référence un autre formulaire par `specRef`), group (fieldset), row, column, stepper (wizard), tabs |

Comportements notables :

- **select / multi-select** — combobox avec recherche implémentant le pattern WAI-ARIA complet (navigation clavier, gestion du focus). Options depuis du texte `static`, la `dataMap` du formulaire, une URL `remote` (headers avec interpolation `{key}`, paramètre de recherche côté serveur optionnel, cache), du `js` sandboxé, ou un `catalog` partagé (`optionsRef` résolu par `services.optionSourceService` — stockez une grosse liste une fois, référencez-la partout). `labelKey`/`valueKey` acceptent les chemins pointés comme `name.common`.
- **data-grid** — le template de ligne s'édite comme n'importe quel panel ; au rendu, chaque ligne scope ses propres données. `minItems`/`maxItems` valident le nombre de lignes, les lignes se réordonnent avec des boutons haut/bas accessibles, et `validate()` rapporte des clés du type `contacts[0].email`.
- **stepper** — validation bloquante par étape, saut d'étape au clic optionnel, bouton Submit optionnel émettant `formSubmit`. **tabs** — « valider l'onglet avant de le quitter » optionnel, navigation aux flèches.
- **text / phone** — adornments `prefix`/`suffix` optionnels et config `mask` (`9` chiffre, `a` lettre, `A` majuscule, `*` alphanumérique ; les littéraux s'insèrent automatiquement).
- **code** — un éditeur JavaScript avec autocomplétion alimentée par les clés du formulaire (`dataMap.<key>`), chargé en lazy pour ne rien coûter aux formulaires qui ne l'utilisent pas.
- **nested-form** — renseignez `specRef` dans ses configs ; au rendu, le formulaire référencé est résolu via `services.specSourceService` et inliné. Voir [formulaires imbriqués](/formkrafter/fr/guides/nested-forms/).
- **recap** — un résumé vivant, en lecture seule, de tout le formulaire ; `groupBySections` transforme les panels labellisés en sections titrées et les collections se rendent en tableaux.

## Bricks personnalisées

```ts
import { createBrick, h, registerBrick } from '@streamline-pulse/formkrafter-wc'

registerBrick(createBrick({
  type: 'input', dataType: 'number', id: 'rating', name: 'Rating', category: 'Inputs',
  defaultConfigs: { label: 'Rating' },
  render: (props) =>
    h('div', { class: { 'fk-field': true } },
      ...[1, 2, 3, 4, 5].map((star) =>
        h('button', {
          type: 'button',
          onClick: () => props.onDataChange?.(star),
        }, '★')
      )
    ),
}))
```

`h` (et le type `VNode`) sont réexportés par `formkrafter-wc` — votre app n'a besoin d'aucune dépendance Stencil. Les bricks enregistrées apparaissent dans la palette, et le registre est un **singleton à l'échelle de la page** : enregistrez une fois au démarrage et chaque instance de builder/renderer les voit.
