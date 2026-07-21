import { h } from '@stencil/core';
import type { VNode } from '@stencil/core';
import { createBrick } from './create-brick';
import { registerBricks } from './registry';
import { asInlineStyle } from '../utils/style';
import type { WcBrickProps } from './create-brick';

const labelOf = (props: WcBrickProps, fallback: string): string =>
  (props.configs?.label as string) ?? props.configs?.key ?? fallback;

const adorned = (props: WcBrickProps, control: VNode): VNode => {
  const prefix = props.configs?.prefix as string | undefined;
  const suffix = props.configs?.suffix as string | undefined;
  if (!prefix && !suffix) return control;

  return (
    <div class="fk-adorned">
      {prefix ? <span class="fk-adorned__affix">{prefix}</span> : null}
      {control}
      {suffix ? <span class="fk-adorned__affix">{suffix}</span> : null}
    </div>
  );
};

const field = (props: WcBrickProps, fallback: string, control: VNode): VNode => (
  <label class="fk-field" style={asInlineStyle(props.styles)}>
    <span class="fk-field__label">{labelOf(props, fallback)}</span>
    {control}
    {props.error ? <span class="fk-field__error">{props.error}</span> : null}
  </label>
);

const createTextVariant = (params: {
  id: string;
  name: string;
  inputType: string;
}) =>
  createBrick({
    type: 'input',
    dataType: 'string',
    id: params.id,
    name: params.name,
    category: 'Inputs',
    defaultConfigs: { label: params.name },
    render: (props) =>
      field(
        props,
        params.name,
        adorned(
          props,
          <input
          class="fk-field__input fk-adorned__input"
          type={params.inputType}
          value={(props.data as string) ?? ''}
          placeholder={props.configs?.placeholder as string}
          disabled={props.editable || props.disabled}
          onInput={(event) =>
            props.onDataChange?.((event.target as HTMLInputElement).value)
          }
          />
        )
      ),
  });

export const textInputBrick = createTextVariant({
  id: 'text',
  name: 'Text',
  inputType: 'text',
});
export const emailBrick = createTextVariant({
  id: 'email',
  name: 'Email',
  inputType: 'email',
});
export const passwordBrick = createTextVariant({
  id: 'password',
  name: 'Password',
  inputType: 'password',
});
export const urlBrick = createTextVariant({
  id: 'url',
  name: 'URL',
  inputType: 'url',
});
export const phoneBrick = createTextVariant({
  id: 'phone',
  name: 'Phone',
  inputType: 'tel',
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
        disabled={props.editable || props.disabled}
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
      adorned(
        props,
        <input
        class="fk-field__input fk-adorned__input"
        type="number"
        value={props.data == null ? '' : String(props.data)}
        placeholder={props.configs?.placeholder as string}
        disabled={props.editable || props.disabled}
        onInput={(event) => {
          const raw = (event.target as HTMLInputElement).value;
          props.onDataChange?.(raw === '' ? undefined : Number(raw));
        }}
        />
      )
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
        disabled={props.editable || props.disabled}
        onInput={(event) => {
          const raw = (event.target as HTMLInputElement).value;
          props.onDataChange?.(raw === '' ? undefined : raw);
        }}
      />
    ),
});

export const selectBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'select',
  name: 'Select',
  category: 'Inputs',
  defaultConfigs: {
    label: 'Select',
    optionsSource: 'static',
    options: 'Option 1\nOption 2',
  },
  render: (props) =>
    field(
      props,
      'Select',
      <fk-select-input
        configs={props.configs}
        value={(props.data as string) ?? ''}
        disabled={props.editable || props.disabled}
        dataMap={props.dataMap}
        onSelectValueChange={(event: CustomEvent<string | undefined>) => {
          event.stopPropagation();
          props.onDataChange?.(event.detail);
        }}
      />
    ),
});

export const timeBrick = createTextVariant({
  id: 'time',
  name: 'Time',
  inputType: 'time',
});
export const datetimeBrick = createTextVariant({
  id: 'datetime',
  name: 'Date / Time',
  inputType: 'datetime-local',
});

const staticOptions = (raw: unknown): string[] =>
  String(raw ?? '')
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);

export const selectBoxesBrick = createBrick({
  type: 'input',
  dataType: 'array',
  id: 'select-boxes',
  name: 'Select boxes',
  category: 'Inputs',
  defaultConfigs: { label: 'Select boxes', options: 'Option 1\nOption 2\nOption 3' },
  render: (props) => {
    const selected = Array.isArray(props.data) ? (props.data as string[]) : [];

    return (
      <div class="fk-field" style={asInlineStyle(props.styles)}>
        <span class="fk-field__label">{labelOf(props, 'Select boxes')}</span>
        <div class="fk-radio-group">
          {staticOptions(props.configs?.options).map((option) => (
            <label class="fk-radio" key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                disabled={props.editable || props.disabled}
                onChange={(event) => {
                  const checked = (event.target as HTMLInputElement).checked;
                  const next = checked
                    ? [...selected, option]
                    : selected.filter((value) => value !== option);
                  props.onDataChange?.(next.length ? next : undefined);
                }}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {props.error ? <span class="fk-field__error">{props.error}</span> : null}
      </div>
    );
  },
});

export const tagsBrick = createBrick({
  type: 'input',
  dataType: 'array',
  id: 'tags',
  name: 'Tags',
  category: 'Inputs',
  defaultConfigs: { label: 'Tags' },
  render: (props) => {
    const tags = Array.isArray(props.data) ? (props.data as string[]) : [];

    return field(
      props,
      'Tags',
      <div class="fk-tags">
        {tags.map((tag) => (
          <span class="fk-tags__chip" key={tag}>
            {tag}
            <button
              type="button"
              class="fk-tags__remove"
              disabled={props.editable || props.disabled}
              onClick={() => {
                const next = tags.filter((value) => value !== tag);
                props.onDataChange?.(next.length ? next : undefined);
              }}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          class="fk-tags__input"
          type="text"
          placeholder="Add a tag…"
          disabled={props.editable || props.disabled}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();

            const input = event.target as HTMLInputElement;
            const value = input.value.trim();
            if (!value || tags.includes(value)) return;

            props.onDataChange?.([...tags, value]);
            input.value = '';
          }}
        />
      </div>
    );
  },
});

export const signatureBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'signature',
  name: 'Signature',
  category: 'Inputs',
  defaultConfigs: { label: 'Signature' },
  render: (props) =>
    field(
      props,
      'Signature',
      <fk-signature-input
        value={(props.data as string) ?? undefined}
        disabled={props.editable || props.disabled}
        onSignatureChange={(event: CustomEvent<string | undefined>) => {
          event.stopPropagation();
          props.onDataChange?.(event.detail);
        }}
      />
    ),
});

export const tabsBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'tabs',
  name: 'Tabs',
  category: 'Layout',
  render: (props) => {
    const labels = (props.brickSpec?.children ?? []).map(
      (child, index) =>
        (child.configs?.label as string) ?? child.name ?? `Tab ${index + 1}`
    );

    return (
      <fk-tabs
        tabLabels={labels}
        editable={props.editable}
        style={asInlineStyle(props.styles)}
      >
        {props.children as VNode}
      </fk-tabs>
    );
  },
});

export const radioBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'radio',
  name: 'Radio',
  category: 'Inputs',
  defaultConfigs: { label: 'Radio', options: 'Option 1\nOption 2' },
  render: (props) => (
    <div class="fk-field" style={asInlineStyle(props.styles)}>
      <span class="fk-field__label">{labelOf(props, 'Radio')}</span>
      <div class="fk-radio-group" role="radiogroup">
        {String(props.configs?.options ?? '')
          .split('\n')
          .map((option) => option.trim())
          .filter(Boolean)
          .map((option) => (
            <label class="fk-radio" key={option}>
              <input
                type="radio"
                name={props.configs?.key ?? props.path}
                checked={props.data === option}
                disabled={props.editable || props.disabled}
                onChange={() => props.onDataChange?.(option)}
              />
              <span>{option}</span>
            </label>
          ))}
      </div>
      {props.error ? <span class="fk-field__error">{props.error}</span> : null}
    </div>
  ),
});

export const hiddenBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'hidden',
  name: 'Hidden',
  category: 'Data',
  defaultConfigs: {},
  render: (props) =>
    props.editable ? (
      <div class="fk-hidden-chip">hidden: {props.configs?.key}</div>
    ) : (
      <input type="hidden" value={(props.data as string) ?? ''} />
    ),
});

export const contentBrick = createBrick({
  type: 'output',
  dataType: 'void',
  id: 'content',
  name: 'Content',
  category: 'Layout',
  defaultConfigs: { content: 'Some text…' },
  render: (props) => (
    <div class="fk-content" style={asInlineStyle(props.styles)}>
      {String(props.configs?.content ?? '')
        .split('\n')
        .map((line) => (
          <p class="fk-content__line">{line}</p>
        ))}
    </div>
  ),
});

export const stepperBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'stepper',
  name: 'Stepper',
  category: 'Layout',
  render: (props) => {
    const labels = (props.brickSpec?.children ?? []).map(
      (child, index) =>
        (child.configs?.label as string) ?? child.name ?? `Step ${index + 1}`
    );

    return (
      <fk-stepper
        stepLabels={labels}
        editable={props.editable}
        style={asInlineStyle(props.styles)}
      >
        {props.children as VNode}
      </fk-stepper>
    );
  },
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
        disabled={props.editable || props.disabled}
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
    radioBrick,
    selectBoxesBrick,
    checkboxBrick,
    tagsBrick,
    signatureBrick,
    hiddenBrick,
    contentBrick,
    groupBrick,
    rowBrick,
    columnBrick,
    stepperBrick,
    tabsBrick,
  ]);
}
