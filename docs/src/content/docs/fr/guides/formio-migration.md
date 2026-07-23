---
title: Venir de Form.io
description: Convertissez vos définitions Form.io en specs FormKrafter avec convertFormioForm — et ce que vous y gagnez.
---

`convertFormioForm(form)` transforme une définition de formulaire Form.io en spec FormKrafter :

```ts
import { convertFormioForm } from '@streamline-pulse/formkrafter-core'

const { spec, warnings } = convertFormioForm(formioJson)
// warnings: tout ce qui n'a pas pu être converti
```

La conversion **ne lève jamais** sur un composant inconnu — il est ignoré et signalé dans `warnings`, pour migrer un gros portefeuille de formulaires progressivement et auditer précisément ce qui demande une passe manuelle.

## Ce qui est converti

| Form.io | FormKrafter |
|---|---|
| Composants de champ (textfield, email, number, day, select, radio, selectboxes, checkbox, textarea, phone, url, signature, address, …) | Les bricks input correspondantes, `inputMask` compris |
| Layout : panels, columns, tables, tabs, fieldsets | Bricks de layout |
| Wizard (`display: "wizard"`) | stepper avec validation par étape |
| datagrid / editgrid | data-grid avec validation par ligne |
| `validate.*` (required, min/max, longueurs, pattern, JS custom) | Validateurs ; le JS custom est auto-encapsulé pour le sandbox (`data`/`row` deviennent `dataMap`) |
| `conditional` (show/when/eq) et triggers `logic` JavaScript | Règles (JSON Logic / JS sandboxé) ; un conditionnel prime sur un flag toujours-caché |
| Select `dataSrc: url / json` | Options distantes ou statiques (`valueProperty` → `valueKey`, templates d'items → `labelKey`, chemins pointés supportés) |
| Composants file (`storage: url`, `multiple`) | brick file avec configs `uploadUrl` / `multiple` |
| Composants `form` imbriqués | bricks nested-form (`specRef`), voir [formulaires imbriqués](/formkrafter/fr/guides/nested-forms/) |
| Composants content/HTML | bricks content (conditionnels préservés) |

Le converter est testé en régression contre de vrais formulaires Form.io de production (wizards, uploads conditionnels, selects en cascade, validateurs custom).

## Ce que vous gagnez en poids

Migrer met aussi votre app au régime. Méthodologie : bundles minifiés et gzippés ; FormKrafter v0.5.0 mesuré avec `bun build --minify` depuis le package publié, Form.io `@formio/js` v5.5.0 mesuré depuis ses bundles CDN officiels (juillet 2026).

| | FormKrafter | Form.io |
|---|---|---|
| Builder (renderer inclus) | **~215 Ko** | ~470 Ko (`formio.full.min.js`) |
| Renderer seul | ~205 Ko | ~415 Ko (`formio.form.min.js`) |
| CSS requis | 6 Ko, optionnel | 129 Ko + Bootstrap |

## Gardez vos specs légers

Vos définitions stockées fondent aussi. Les exports Form.io réels charrient un lourd boilerplate (chaque composant sérialisé avec tous ses défauts), tandis que le converter ne garde que ce qui porte du sens et compacte les listes d'options statiques (une simple chaîne multiligne dès que les labels égalent les valeurs). Mesuré sur un portefeuille de 6 formulaires de production (juillet 2026, converter v0.5.0) :

| | JSON brut | Gzippé |
|---|---|---|
| Définitions Form.io | 277 Ko | 40 Ko |
| Specs FormKrafter convertis | **68 Ko** (3 à 5× plus petits par formulaire) | **18 Ko** |

L'exception à connaître : une définition Form.io minimale écrite à la main peut ressortir légèrement *plus grosse* une fois convertie — le spec est plus explicite (`uid` stables pour les patches RFC 6902, configs typées). Personne ne stocke des définitions minifiées à la main, mais la page d'import affiche les deux tailles pour juger sur vos propres formulaires.

Pour les plus grosses listes (professions, nationalités, …), ne les embarquez pas du tout — le converter avertit dès qu'un composant porte plus de 100 options statiques et recommande :

- **`optionsSource: "remote"`** — le select interroge votre API (avec recherche à la frappe) ;
- **`optionsSource: "catalog"` + `optionsRef`** — un catalogue partagé résolu par `services.optionSourceService` : la liste est stockée une fois et référencée par tous les formulaires qui en ont besoin.

## Sandbox au lieu d'eval

Form.io exécute les validateurs custom et la logique avec du vrai JavaScript. FormKrafter exécute le code converti dans un interpréteur AST compatible CSP — voir [règles dynamiques](/formkrafter/fr/guides/rules/). Les snippets convertis continuent de fonctionner parce que le converter injecte des alias de compatibilité (`const data = dataMap; const row = dataMap;`), et ils gagnent l'isolation du sandbox gratuitement.
