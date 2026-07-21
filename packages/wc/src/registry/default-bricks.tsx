import { h } from '@stencil/core';
import type { VNode } from '@stencil/core';
import { createBrick } from './create-brick';
import { registerBricks } from './registry';
import { asInlineStyle } from '../utils/style';

export const textInputBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'text',
  name: 'Text',
  category: 'Inputs',
  render: (props) => (
    <label class="fk-field" style={asInlineStyle(props.styles)}>
      <span class="fk-field__label">
        {(props.configs?.label as string) ?? props.configs?.key ?? 'Text'}
      </span>
      <input
        class="fk-field__input"
        type="text"
        value={(props.data as string) ?? ''}
        placeholder={props.configs?.placeholder as string}
        disabled={props.editable}
        onInput={(event) =>
          props.onDataChange?.((event.target as HTMLInputElement).value)
        }
      />
      {props.error ? <span class="fk-field__error">{props.error}</span> : null}
    </label>
  ),
});

export const checkboxBrick = createBrick({
  type: 'input',
  dataType: 'boolean',
  id: 'checkbox',
  name: 'Checkbox',
  category: 'Inputs',
  render: (props) => (
    <label class="fk-field fk-field--inline" style={asInlineStyle(props.styles)}>
      <input
        class="fk-field__checkbox"
        type="checkbox"
        checked={props.data === true}
        disabled={props.editable}
        onChange={(event) =>
          props.onDataChange?.((event.target as HTMLInputElement).checked)
        }
      />
      <span class="fk-field__label">
        {(props.configs?.label as string) ?? props.configs?.key ?? 'Checkbox'}
      </span>
    </label>
  ),
});

export const groupBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'group',
  name: 'Group',
  category: 'Layout',
  render: (props) => (
    <fieldset class="fk-group" style={asInlineStyle(props.styles)}>
      {props.configs?.label ? (
        <legend class="fk-group__legend">{props.configs.label as string}</legend>
      ) : null}
      {props.children as VNode}
    </fieldset>
  ),
});

export function registerDefaultBricks(): void {
  registerBricks([textInputBrick, checkboxBrick, groupBrick]);
}
