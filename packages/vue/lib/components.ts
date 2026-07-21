/* eslint-disable */
/* tslint:disable */
/* auto-generated vue proxies */
import { defineContainer, type StencilVueComponent } from '@stencil/vue-output-target/runtime';

import type { JSX } from '@streamline-pulse/formkrafter-wc/dist/components';

import { defineCustomElement as defineFkBrickActions } from '@streamline-pulse/formkrafter-wc/dist/components/fk-brick-actions.js';
import { defineCustomElement as defineFkBrickList } from '@streamline-pulse/formkrafter-wc/dist/components/fk-brick-list.js';
import { defineCustomElement as defineFkBrickMoldItem } from '@streamline-pulse/formkrafter-wc/dist/components/fk-brick-mold-item.js';
import { defineCustomElement as defineFkBrickNotFound } from '@streamline-pulse/formkrafter-wc/dist/components/fk-brick-not-found.js';
import { defineCustomElement as defineFkBrickRender } from '@streamline-pulse/formkrafter-wc/dist/components/fk-brick-render.js';
import { defineCustomElement as defineFkCodeEditor } from '@streamline-pulse/formkrafter-wc/dist/components/fk-code-editor.js';
import { defineCustomElement as defineFkDropArea } from '@streamline-pulse/formkrafter-wc/dist/components/fk-drop-area.js';
import { defineCustomElement as defineFkEmptyForm } from '@streamline-pulse/formkrafter-wc/dist/components/fk-empty-form.js';
import { defineCustomElement as defineFkFormBuilder } from '@streamline-pulse/formkrafter-wc/dist/components/fk-form-builder.js';
import { defineCustomElement as defineFkFormRender } from '@streamline-pulse/formkrafter-wc/dist/components/fk-form-render.js';
import { defineCustomElement as defineFkPropertyPanel } from '@streamline-pulse/formkrafter-wc/dist/components/fk-property-panel.js';
import { defineCustomElement as defineFkRulesEditor } from '@streamline-pulse/formkrafter-wc/dist/components/fk-rules-editor.js';



export const FkBrickActions: StencilVueComponent<JSX.FkBrickActions> = /*@__PURE__*/ defineContainer<JSX.FkBrickActions>('fk-brick-actions', defineFkBrickActions, [
  'path',
  'selected',
  'brickRemove',
  'brickDuplicate',
  'brickDrop',
  'brickSelect'
], [
  'brickRemove',
  'brickDuplicate',
  'brickDrop',
  'brickSelect'
]);


export const FkBrickList: StencilVueComponent<JSX.FkBrickList> = /*@__PURE__*/ defineContainer<JSX.FkBrickList>('fk-brick-list', defineFkBrickList);


export const FkBrickMoldItem: StencilVueComponent<JSX.FkBrickMoldItem> = /*@__PURE__*/ defineContainer<JSX.FkBrickMoldItem>('fk-brick-mold-item', defineFkBrickMoldItem, [
  'brickMold'
]);


export const FkBrickNotFound: StencilVueComponent<JSX.FkBrickNotFound> = /*@__PURE__*/ defineContainer<JSX.FkBrickNotFound>('fk-brick-not-found', defineFkBrickNotFound);


export const FkBrickRender: StencilVueComponent<JSX.FkBrickRender> = /*@__PURE__*/ defineContainer<JSX.FkBrickRender>('fk-brick-render', defineFkBrickRender, [
  'brickSpec',
  'data',
  'dataMap',
  'path',
  'editable',
  'selectedUid',
  'utils',
  'brickDataChange',
  'brickConfigsChange',
  'brickStylesChange',
  'brickValidationsChange',
  'brickRulesChange',
  'brickRemove',
  'brickDuplicate'
], [
  'brickDataChange',
  'brickConfigsChange',
  'brickStylesChange',
  'brickValidationsChange',
  'brickRulesChange',
  'brickRemove',
  'brickDuplicate'
]);


export const FkCodeEditor: StencilVueComponent<JSX.FkCodeEditor> = /*@__PURE__*/ defineContainer<JSX.FkCodeEditor>('fk-code-editor', defineFkCodeEditor, [
  'value',
  'placeholder',
  'codeChange'
], [
  'codeChange'
]);


export const FkDropArea: StencilVueComponent<JSX.FkDropArea> = /*@__PURE__*/ defineContainer<JSX.FkDropArea>('fk-drop-area', defineFkDropArea, [
  'path',
  'brickDrop'
], [
  'brickDrop'
]);


export const FkEmptyForm: StencilVueComponent<JSX.FkEmptyForm> = /*@__PURE__*/ defineContainer<JSX.FkEmptyForm>('fk-empty-form', defineFkEmptyForm);


export const FkFormBuilder: StencilVueComponent<JSX.FkFormBuilder> = /*@__PURE__*/ defineContainer<JSX.FkFormBuilder>('fk-form-builder', defineFkFormBuilder, [
  'spec',
  'data',
  'specChange'
], [
  'specChange'
]);


export const FkFormRender: StencilVueComponent<JSX.FkFormRender> = /*@__PURE__*/ defineContainer<JSX.FkFormRender>('fk-form-render', defineFkFormRender, [
  'spec',
  'data',
  'editable',
  'selectedUid',
  'formDataChange'
], [
  'formDataChange'
]);


export const FkPropertyPanel: StencilVueComponent<JSX.FkPropertyPanel> = /*@__PURE__*/ defineContainer<JSX.FkPropertyPanel>('fk-property-panel', defineFkPropertyPanel, [
  'brick',
  'fields',
  'brickConfigsChange',
  'brickValidationsChange',
  'brickStylesChange'
], [
  'brickConfigsChange',
  'brickValidationsChange',
  'brickStylesChange'
]);


export const FkRulesEditor: StencilVueComponent<JSX.FkRulesEditor> = /*@__PURE__*/ defineContainer<JSX.FkRulesEditor>('fk-rules-editor', defineFkRulesEditor, [
  'brick',
  'fields',
  'brickRulesChange'
], [
  'brickRulesChange'
]);


