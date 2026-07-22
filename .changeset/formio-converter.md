---
"@streamline-pulse/formkrafter-core": minor
"@streamline-pulse/formkrafter-wc": minor
"@streamline-pulse/formkrafter-react": minor
"@streamline-pulse/formkrafter-vue": minor
---

New `convertFormioForm(form)` in the core: converts a Form.io form definition into a FormKrafter spec.

- Inputs: textfield, textarea, number, currency, password, email, url, phoneNumber, datetime/day/time, checkbox, selectboxes, select (static values, multiple, remote url with valueProperty/template/searchField), radio, tags, hidden, file, signature, address.
- Layout: panel/fieldset/well/container → group, columns → row + columns, tabs → tabs, datagrid/editgrid → data-grid, wizard display → stepper.
- Validations (required, min/maxLength, min/max, pattern, customMessage) and simple conditionals (`show/when/eq` → hidden rule in json-logic) carry over.
- Anything unmappable is reported in the returned `warnings` array instead of failing.
