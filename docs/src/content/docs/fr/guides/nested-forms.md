---
title: Formulaires imbriqués
description: Référencez un formulaire dans un formulaire avec specRef, résolu par une source de specs pluggable.
---

Une brick `nested-form` référence un autre formulaire par sa config `specRef`. Au rendu, la référence est résolue et inlinée comme un groupe labellisé — champs, validations et règles compris — si bien que tout le reste du pipeline (rendu, règles, validation, recap) voit un spec ordinaire.

```json
{
  "type": "panel",
  "id": "nested-form",
  "configs": { "key": "address", "label": "Adresse de livraison", "specRef": "adresse" }
}
```

## Brancher la source de specs

```ts
import { services } from '@streamline-pulse/formkrafter-core'

services.specSourceService = {
  fetchSpec: async (ref) => (await fetch(`/api/forms/${ref}`)).json(),
}
```

Le défaut est `FetchSpecSourceService` — il traite le ref comme une URL et supporte `baseUrl`, headers et cache par URL. `<fk-form-render>` exécute l'expansion automatiquement (avec états de chargement et d'erreur) ; configurez le service une fois au démarrage.

## Backend

Expansez avant de valider pour que le backend voie l'arbre complet :

```ts
import { expandSpec, validateFormData } from '@streamline-pulse/formkrafter-core'

const full = await expandSpec(spec)
const verdict = validateFormData(full, payload)
```

`expandSpec` détecte les cycles de références et impose une limite de profondeur (5) : un formulaire qui se référence lui-même échoue bruyamment au lieu de boucler.
