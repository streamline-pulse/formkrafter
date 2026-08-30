# Brief — FormKrafter comme bien public numérique et brique UX/UI GovStack

Contexte : la suite Streamline Pulse est alignée sur le GovStack Workflow Building Block (façade API conforme, harnais en CI, SCIM 2.0, BPMN import/export). FormKrafter est son constructeur de formulaires, publié sous MIT (`streamline-pulse/formkrafter`, paquets npm `@streamline-pulse/formkrafter-{core,wc,react,vue,react-native}`). Objectif : le rendre **reconnu** hors de la suite, sur deux tableaux qui ne demandent pas de code produit mais de la documentation vérifiable.

Le bloc UX/UI de GovStack (`GovStackWorkingGroup/bb-ux`) est un bloc de **lignes directrices** (design system, accessibilité, multilingue, mobile-first, patrons de formulaires), sans API ni harnais : on ne le « certifie » pas, on documente qu'on le respecte. Le label qui compte pour les États est celui de **bien public numérique** (Digital Public Goods Alliance, registre `digitalpublicgoods.net`).

## Livrable 1 — Dossier DPG (registre DPGA)

Créer `docs/dpg/` avec un fichier par indicateur, en anglais, chacun pointant vers une preuve dans le dépôt (lien vers un fichier, une page de doc, un rapport). Les neuf indicateurs et ce qu'il faut vérifier ou produire :

1. **Relevance to SDGs** — expliquer le lien avec l'ODD 16 (institutions efficaces, accès à l'information) et l'ODD 9 (infrastructure numérique) : formulaires de services publics dématérialisés, usage dans Streamline Pulse pour des procédures administratives (recrutement, casier judiciaire, permis). Une page `docs/dpg/01-sdg-relevance.md`.
2. **Open licence** — MIT déjà en place (`LICENSE`). Vérifier que chaque `packages/*/package.json` déclare `"license": "MIT"` et que les dépendances embarquées n'imposent rien de plus restrictif (`bunx license-checker` ou équivalent ; joindre le rapport).
3. **Clear ownership** — le titulaire est « Streamline Pulse » (copyright 2026). Ajouter dans le README une section *Governance* : qui décide, comment on contribue, où sont les décisions (issues/discussions). Vérifier que les noms de paquets npm et le domaine (`formkrafter.streamline-pulse.com` ou celui du site des docs) sont contrôlés par l'entité.
4. **Platform independence** — c'est le point fort : Web Components consommables en React, Vue, React Native, sans dépendance à un service. Documenter qu'aucune dépendance propriétaire obligatoire n'existe (pas de SaaS requis, pas de clé d'API pour fonctionner), et que les dépendances tierces sont ouvertes.
5. **Documentation** — le site `docs/` (Astro) doit couvrir : installation, spec JSON du formulaire (schéma complet), builder, renderer, règles/validation, i18n, accessibilité, contribution. Ajouter un **schéma JSON publié** de la spec (`packages/core/schema/form-spec.schema.json`) si absent : c'est ce qu'un évaluateur ouvre en premier.
6. **Mechanism for extracting data** — montrer que les formulaires (spec) et les réponses sont des JSON portables, exportables sans outil propriétaire : page `docs/dpg/06-data-extraction.md` avec un exemple d'export/import et le lien vers le schéma.
7. **Privacy & applicable laws** — FormKrafter ne collecte rien lui-même ; documenter la posture : aucune télémétrie, aucun appel réseau par défaut, les données restent dans l'application hôte ; renvoyer vers la responsabilité de l'intégrateur (RGPD / lois locales). Vérifier qu'aucun paquet n'embarque de télémétrie.
8. **Standards & best practices** — lister : Web Components (Custom Elements v1), JSON Schema pour la spec, WCAG 2.1 AA (voir livrable 2), semver, Conventional Commits, CI (`ci.yml`), tests e2e (`e2e/`). Ajouter `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant), `SECURITY.md` (canal de signalement) — les trois manquent aujourd'hui et sont demandés explicitement.
9. **Do no harm by design** — trois sous-points : *data privacy & security* (validation côté client seulement, pas de stockage, recommandation de validation serveur, pas de secrets dans la spec), *inappropriate & illegal content* (non applicable : outil, pas plateforme de contenu — le dire), *protection from harassment* (idem). Une page `docs/dpg/09-do-no-harm.md`.

Puis soumettre via le formulaire du registre DPGA (compte GitHub, le dossier est un `.json` généré depuis leur formulaire) et garder le fichier de soumission dans `docs/dpg/submission.json`.

## Livrable 2 — Note de conformité UX/UI GovStack

Créer `docs/govstack/ux-ui-conformance.md` (anglais), structurée selon les sections du bloc UX/UI, chacune avec état ✅/🟠/❌ et preuve :

- **Accessibilité WCAG 2.1 AA** — passer `axe` (ex. `@axe-core/playwright`) sur les exemples du builder et du renderer, joindre le rapport, corriger ce qui bloque (labels associés, focus visible, navigation clavier dans le drag & drop, contrastes, messages d'erreur annoncés par `aria-live`). Ajouter le test axe dans la CI.
- **Multilingue** — libellés, messages de validation et textes du builder externalisables ; montrer un formulaire en deux langues (fr/en) et le mécanisme de traduction de la spec (clés ou libellés par locale). Prise en charge RTL à documenter (même si « non testé »).
- **Mobile-first / responsive** — captures ou test Playwright à 360 px ; champs utilisables au doigt ; pas de défilement horizontal.
- **Patrons de formulaires** — validation en ligne, messages d'erreur clairs et positionnés près du champ, sauvegarde/reprise, étapes (multi-pages) et progression, champs conditionnels (règles), aide contextuelle, formats locaux (dates, nombres, téléphone avec indicatif).
- **Design system** — thème par variables CSS, intégration dans un design system hôte (exemple avec GOV.UK Frontend ou USWDS si faisable en une page d'exemple : c'est l'argument le plus parlant pour un évaluateur GovStack).
- **Tests d'utilisabilité** — s'il n'y en a pas eu, le dire et décrire le protocole prévu.

## Livrable 3 — Positionnement sandbox GovStack

Une page `docs/govstack/sandbox-positioning.md` : FormKrafter comme constructeur de formulaires du **Registration BB** (qui n'a pas d'éditeur natif) et comme rendu de formulaires pour les tâches humaines du Workflow BB ; montrer l'intégration existante avec Streamline Pulse (spec stockée par l'API, rendue par Portal/Flow, préremplissage via `prefillMapping`) comme preuve d'usage en production. Proposer la fiche pour la page *Building Block Software* de govstack.global (nom, licence, lien, blocs concernés : UX/UI, Registration).

## Ordre de travail et livraison

1. Fichiers de gouvernance manquants (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`) et section *Governance* du README.
2. Schéma JSON de la spec publié + page « data extraction ».
3. Audit axe + corrections + test en CI.
4. Pages DPG 1→9, note UX/UI, positionnement sandbox.
5. Soumission DPGA ; ouvrir une issue sur `GovStackWorkingGroup/bb-ux` pour proposer FormKrafter en implémentation de référence des patrons de formulaires.

Contraintes : commits sur `v1` puis merge ; pas de trailer *Co-Authored-By* ; commentaires de code minimaux ; tout ce qui est affirmé dans le dossier doit renvoyer à une preuve dans le dépôt (fichier, test, rapport), jamais à une intention.
