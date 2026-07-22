export type * from './components.d.ts';
export { h } from '@stencil/core';
export type { VNode } from '@stencil/core';
export {
  registerBrick,
  registerBricks,
  getBrick,
  getBrickMolds,
  getBrickMoldsGroupedByCategory,
  newBrickSpec,
} from './registry/registry';
export type { AnyBrick } from './registry/registry';
export { createBrick } from './registry/create-brick';
export type { WcBrickConfigs, WcBrickProps, BrickRenderFn } from './registry/create-brick';
export {
  registerDefaultBricks,
  textInputBrick,
  emailBrick,
  passwordBrick,
  urlBrick,
  phoneBrick,
  textareaBrick,
  numberBrick,
  dateBrick,
  timeBrick,
  datetimeBrick,
  selectBrick,
  multiSelectBrick,
  radioBrick,
  selectBoxesBrick,
  checkboxBrick,
  tagsBrick,
  signatureBrick,
  addressBrick,
  fileBrick,
  dataGridBrick,
  hiddenBrick,
  contentBrick,
  recapBrick,
  groupBrick,
  rowBrick,
  columnBrick,
  stepperBrick,
  tabsBrick,
} from './registry/default-bricks';
export type {
  BrickDropDetail,
  BrickConfigsChangeDetail,
  BrickStylesChangeDetail,
  BrickValidationsChangeDetail,
  BrickRulesChangeDetail,
  BrickPathDetail,
  SpecChangeDetail,
  DataChangeDetail,
} from './utils/events';
export { setFkTranslations, fkT, fkTOr, frFkTranslations } from './i18n/i18n';
export type { FkTranslations } from './i18n/i18n';
