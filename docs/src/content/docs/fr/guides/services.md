---
title: Services
description: Points d'injection de dépendances — uploads de fichiers, options distantes, auth, sources de specs, exécution JS.
---

`services` est la surface d'injection de dépendances de FormKrafter. Remplacez un service une fois au démarrage de l'app et chaque builder/renderer de la page l'utilise.

| Service | Défaut | À remplacer quand… |
|---|---|---|
| `services.jsRunnerService` | sandbox AST | vous voulez du JS complet dans un contexte de confiance |
| `services.dataSourceService` | `fetch` + cache par URL/headers | auth, base URL, politique de retry : `new FetchDataSourceService({ credentials: 'include', headers: { … } })` |
| `services.fileUploadService` | data-URL base64 | vrais uploads : `new UrlFileUploadService({ url, headers, credentials })` — POST multipart + `remove()` à la suppression ; la config `uploadUrl` d'une brick surcharge l'URL par défaut |
| `services.specSourceService` | `fetch` du ref comme URL (`FetchSpecSourceService`, avec `baseUrl`/headers/cache) | formulaires imbriqués chargés depuis votre propre store : `fetchSpec(ref)` retourne un `BrickSpec` |
| `services.optionSourceService` | `fetch` du ref comme URL (`FetchOptionSourceService`, mêmes défauts) | catalogues d'options partagés : un select avec `optionsSource: "catalog"` et `optionsRef` se résout via `fetchOptions(ref)` — stockez une liste de 500 entrées une fois, référencez-la depuis tous vos formulaires |

## Uploads de fichiers

```ts
import { services, UrlFileUploadService } from '@streamline-pulse/formkrafter-core'

services.fileUploadService = new UrlFileUploadService({
  url: '/api/uploads',
  credentials: 'include',
})
```

La brick file POSTe chaque fichier en multipart, lit l'URL stockée dans la réponse (`url`/`path`/`location`/`href`), et appelle `remove()` quand l'utilisateur supprime un fichier. `multiple: true` bascule la brick en liste de cartes multi-fichiers.

## Options distantes & auth

Un select peut charger ses options depuis une URL avec interpolation `{key}` sur les données du formulaire :

```
/api/employees?dept={department}
Authorization: Bearer {_authToken}
```

Deux patterns d'auth, composables :

1. **Cookie httpOnly** (recommandé, same-origin) : `services.dataSourceService = new FetchDataSourceService({ credentials: 'include' })` — rien de secret dans les specs ni le panel.
2. **Token de contexte** : l'hôte injecte `data={{ _authToken }}` sur le renderer. Les clés préfixées par underscore sont disponibles en interne (interpolation, règles) mais **exclues de tout payload émis**.

## Un singleton à l'échelle de la page — par design

`services` vit sur `globalThis` sous `Symbol.for("formkrafter.core.services")`. Les bundlers se retrouvent régulièrement avec plusieurs copies d'un module dans une même app (votre bundle importe core directement, le bundle Web Components embarque le sien) — le store partagé garantit qu'un override fait depuis votre app est vu par les composants, quelle que soit la copie qui l'exécute. Le registre de bricks et les traductions du chrome utilisent le même pattern.
