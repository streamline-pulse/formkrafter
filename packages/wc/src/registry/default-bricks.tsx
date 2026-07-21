import { h } from '@stencil/core';
import type { VNode } from '@stencil/core';
import { createBrick } from './create-brick';
import { registerBricks } from './registry';
import { asInlineStyle } from '../utils/style';
import type { WcBrickProps } from './create-brick';

const labelOf = (props: WcBrickProps, fallback: string): string =>
  (props.configs?.label as string) ?? props.configs?.key ?? fallback;

const field = (props: WcBrickProps, fallback: string, control: VNode): VNode => (
  <label class="fk-field" style={asInlineStyle(props.styles)}>
    <span class="fk-field__label">{labelOf(props, fallback)}</span>
    {control}
    {props.error ? <span class="fk-field__error">{props.error}</span> : null}
  </label>
);

export const textInputBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'text',
  name: 'Text',
  category: 'Inputs',
  defaultConfigs: { label: 'Text' },
  render: (props) =>
    field(
      props,
      'Text',
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
    ),
});

export const textareaBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'textarea',
  name: 'Text area',
  category: 'Inputs',
  defaultConfigs: { label: 'Text area' },
  render: (props) =>
    field(
      props,
      'Text area',
      <textarea
        class="fk-field__input fk-field__input--textarea"
        value={(props.data as string) ?? ''}
        placeholder={props.configs?.placeholder as string}
        disabled={props.editable}
        onInput={(event) =>
          props.onDataChange?.((event.target as HTMLTextAreaElement).value)
        }
      ></textarea>
    ),
});

export const numberBrick = createBrick({
  type: 'input',
  dataType: 'number',
  id: 'number',
  name: 'Number',
  category: 'Inputs',
  defaultConfigs: { label: 'Number' },
  render: (props) =>
    field(
      props,
      'Number',
      <input
        class="fk-field__input"
        type="number"
        value={props.data == null ? '' : String(props.data)}
        placeholder={props.configs?.placeholder as string}
        disabled={props.editable}
        onInput={(event) => {
          const raw = (event.target as HTMLInputElement).value;
          props.onDataChange?.(raw === '' ? undefined : Number(raw));
        }}
      />
    ),
});

export const dateBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'date',
  name: 'Date',
  category: 'Inputs',
  defaultConfigs: { label: 'Date' },
  render: (props) =>
    field(
      props,
      'Date',
      <input
        class="fk-field__input"
        type="date"
        value={(props.data as string) ?? ''}
        disabled={props.editable}
        onInput={(event) => {
          const raw = (event.target as HTMLInputElement).value;
          props.onDataChange?.(raw === '' ? undefined : raw);
        }}
      />
    ),
});

const selectOptions = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String);

  return String(raw ?? '')
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);
};

export const selectBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'select',
  name: 'Select',
  category: 'Inputs',
  defaultConfigs: { label: 'Select', options: 'Option 1\nOption 2' },
  render: (props) =>
    field(
      props,
      'Select',
      <select
        class="fk-field__input"
        disabled={props.editable}
        onInput={(event) => {
          const raw = (event.target as HTMLSelectElement).value;
          props.onDataChange?.(raw === '' ? undefined : raw);
        }}
      >
        <option value="" selected={props.data == null || props.data === ''}></option>
        {selectOptions(props.configs?.options).map((option) => (
          <option value={option} selected={props.data === option}>
            {option}
          </option>
        ))}
      </select>
    ),
});

export const checkboxBrick = createBrick({
  type: 'input',
  dataType: 'boolean',
  id: 'checkbox',
  name: 'Checkbox',
  category: 'Inputs',
  defaultConfigs: { label: 'Checkbox' },
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
      <span class="fk-field__label">{labelOf(props, 'Checkbox')}</span>
      {props.error ? <span class="fk-field__error">{props.error}</span> : null}
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

export const rowBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'row',
  name: 'Row',
  category: 'Layout',
  render: (props) => (
    <div class="fk-row" style={asInlineStyle(props.styles)}>
      {props.children as VNode}
    </div>
  ),
});

export const columnBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'column',
  name: 'Column',
  category: 'Layout',
  render: (props) => (
    <div class="fk-column" style={asInlineStyle(props.styles)}>
      {props.children as VNode}
    </div>
  ),
});

export function registerDefaultBricks(): void {
  registerBricks([
    textInputBrick,
    textareaBrick,
    numberBrick,
    dateBrick,
    selectBrick,
    checkboxBrick,
    groupBrick,
    rowBrick,
    columnBrick,
  ]);
}
