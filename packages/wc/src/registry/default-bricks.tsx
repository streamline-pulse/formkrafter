import { h } from '@stencil/core';
import type { VNode } from '@stencil/core';
import { createBrick } from './create-brick';
import { getBrick, registerBricks } from './registry';
import { asInlineStyle } from '../utils/style';
import { normalizeOptions } from '../utils/options';
import { applyMask } from '../utils/mask';
import { fkT, fkTOr } from '../i18n/i18n';
import {
  collectRecapItems,
  resolveLocalizedText,
} from '@streamline-pulse/formkrafter-core';
import type { BrickSpec, RecapItem } from '@streamline-pulse/formkrafter-core';
import type { WcBrickProps } from './create-brick';

const labelOf = (props: WcBrickProps, fallback: string): string =>
  (props.configs?.label as string) ?? props.configs?.key ?? fallback;

const isRequired = (props: WcBrickProps): boolean =>
  props.validations?.some((validation) => validation.validator === 'required') ===
  true;

const labelNode = (props: WcBrickProps, fallback: string): VNode =>
  isRequired(props) ? (
    <span class="fk-field__label">
      {labelOf(props, fallback)}
      <span class="fk-field__required" aria-hidden="true">
        *
      </span>
      <span class="fk-visually-hidden">{fkT('field.required')}</span>
    </span>
  ) : (
    <span class="fk-field__label">{labelOf(props, fallback)}</span>
  );

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

const fieldError = (props: WcBrickProps): VNode | null =>
  props.error ? (
    <span class="fk-field__error" role="alert">
      {props.error}
    </span>
  ) : null;

const lock = (
  props: WcBrickProps,
  readonlyCapable: boolean
): Record<string, unknown> => {
  if (props.editable) return { disabled: true };

  if (props.readOnly) {
    return readonlyCapable
      ? { readOnly: true, 'aria-readonly': 'true' }
      : { disabled: true, 'aria-readonly': 'true' };
  }

  return { disabled: props.disabled === true };
};

const invalidAttr = (
  props: WcBrickProps
): { 'aria-invalid'?: string; 'aria-required'?: string } => ({
  ...(props.error ? { 'aria-invalid': 'true' } : {}),
  ...(isRequired(props) ? { 'aria-required': 'true' } : {}),
});

const isFlagged = (props: WcBrickProps): boolean =>
  props.review ? props.review.value.incorrect === true : props.annotation?.incorrect === true;

const fieldClass = (props: WcBrickProps, extra = ''): string =>
  ['fk-field', extra, isFlagged(props) ? 'fk-field--flagged' : ''].filter(Boolean).join(' ');

// Under a field: the reviewer's controls (review mode), or the note left for
// whoever corrects the value (annotated render). Nothing when neither applies.
const previousNote = (props: WcBrickProps): VNode | null => {
  const note = props.note;
  if (!note || (note.incorrect !== true && !note.comment)) return null;
  return (
    <div class="fk-review fk-review--previous" role="note">
      <span class="fk-review__badge">{fkT('review.previous')}</span>
      {note.comment ? <p class="fk-review__text">{note.comment}</p> : null}
    </div>
  );
};

const fieldNote = (props: WcBrickProps): VNode | null => {
  const inner = fieldNoteInner(props);
  const previous = previousNote(props);
  if (!inner && !previous) return null;
  return (
    <div class="fk-field__notes">
      {previous}
      {inner}
    </div>
  );
};

const fieldNoteInner = (props: WcBrickProps): VNode | null => {
  const review = props.review;
  if (review) {
    const flagged = review.value.incorrect === true;
    return (
      <div class="fk-review">
        <label class="fk-review__flag">
          <input
            type="checkbox"
            class="fk-field__checkbox"
            checked={flagged}
            onChange={(event) =>
              review.onChange({
                ...review.value,
                incorrect: (event.target as HTMLInputElement).checked,
              })
            }
          />
          <span>{fkT('review.incorrect')}</span>
        </label>
        {flagged ? (
          <textarea
            class="fk-field__input fk-review__comment"
            rows={2}
            placeholder={fkT('review.comment')}
            aria-label={fkT('review.comment')}
            value={review.value.comment ?? ''}
            onInput={(event) =>
              review.onChange({
                ...review.value,
                comment: (event.target as HTMLTextAreaElement).value,
              })
            }
          />
        ) : null}
      </div>
    );
  }

  const annotation = props.annotation;
  if (!annotation || (annotation.incorrect !== true && !annotation.comment)) return null;
  return (
    <div class="fk-review fk-review--note" role="note">
      {annotation.incorrect === true ? (
        <span class="fk-review__badge">{fkT('review.flagged')}</span>
      ) : null}
      {annotation.comment ? <p class="fk-review__text">{annotation.comment}</p> : null}
    </div>
  );
};

const fieldBlock = (props: WcBrickProps, fallback: string, control: VNode): VNode => (
  <div class={fieldClass(props)} style={asInlineStyle(props.styles)}>
    {labelNode(props, fallback)}
    {control}
    {fieldError(props)}
    {fieldNote(props)}
  </div>
);

// A <label> may wrap one control only: with a note, the label shrinks to the
// control and the note sits beside it.
const field = (props: WcBrickProps, fallback: string, control: VNode): VNode => {
  const note = fieldNote(props);
  if (!note)
    return (
      <label class={fieldClass(props)} style={asInlineStyle(props.styles)}>
        {labelNode(props, fallback)}
        {control}
        {fieldError(props)}
      </label>
    );
  return (
    <div class={fieldClass(props)} style={asInlineStyle(props.styles)}>
      <label class="fk-field__main">
        {labelNode(props, fallback)}
        {control}
      </label>
      {fieldError(props)}
      {note}
    </div>
  );
};

// Variables de gabarit (`{{name}}`) proposees pendant la saisie quand le
// contexte du formulaire en fournit (`_variables`) ; `variables: false` sur
// la brique les coupe.
const withVariables = (props: WcBrickProps, control: VNode): VNode => {
  const variables = props.dataMap?.['_variables'];
  if (!Array.isArray(variables) || variables.length === 0 || props.configs?.variables === false || props.readOnly)
    return control;
  return (
    <div class="fk-variables">
      {control}
      <fk-variable-picker
        variables={variables as { name: string; label?: string }[]}
        onVariablePick={(event: CustomEvent<string>) => props.onDataChange?.(event.detail)}
      ></fk-variable-picker>
    </div>
  );
};

const createTextVariant = (params: {
  id: string;
  name: string;
  inputType: string;
  maskable?: boolean;
}) =>
  createBrick({
    type: 'input',
    dataType: 'string',
    id: params.id,
    name: params.name,
    category: 'Inputs',
    defaultConfigs: params.maskable
      ? { label: params.name, mask: '' }
      : { label: params.name },
    render: (props) =>
      field(
        props,
        params.name,
        adorned(
          props,
          (params.inputType === 'password' ? (control: VNode) => control : (control: VNode) => withVariables(props, control))(
          <input
          {...invalidAttr(props)}
          class="fk-field__input fk-adorned__input"
          type={params.inputType}
          value={(props.data as string) ?? ''}
          placeholder={props.configs?.placeholder as string}
          {...lock(props, true)}
          onInput={(event) => {
            const input = event.target as HTMLInputElement;
            const mask = props.configs?.mask as string | undefined;
            const next = mask ? applyMask(input.value, mask) : input.value;
            if (next !== input.value) input.value = next;
            props.onDataChange?.(next);
          }}
          />
          )
        )
      ),
  });

export const textInputBrick = createTextVariant({
  id: 'text',
  name: 'Text',
  inputType: 'text',
  maskable: true,
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
  maskable: true,
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
      withVariables(
        props,
        <textarea
          {...invalidAttr(props)}
          class="fk-field__input fk-field__input--textarea"
          value={(props.data as string) ?? ''}
          placeholder={props.configs?.placeholder as string}
          {...lock(props, true)}
          onInput={(event) =>
            props.onDataChange?.((event.target as HTMLTextAreaElement).value)
          }
        ></textarea>
      )
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
        {...invalidAttr(props)}
        class="fk-field__input fk-adorned__input"
        type="number"
        value={props.data == null ? '' : String(props.data)}
        placeholder={props.configs?.placeholder as string}
        {...lock(props, true)}
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
        {...invalidAttr(props)}
        class="fk-field__input"
        type="date"
        value={(props.data as string) ?? ''}
        {...lock(props, true)}
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
    fieldBlock(
      props,
      'Select',
      <fk-select-input
        configs={props.configs}
        accessibleLabel={labelOf(props, 'Select')}
        value={(props.data as string) ?? ''}
        {...lock(props, false)}
        invalid={!!props.error}
        dataMap={props.dataMap}
        onSelectValueChange={(
          event: CustomEvent<string | string[] | undefined>
        ) => {
          event.stopPropagation();
          props.onDataChange?.(event.detail);
        }}
      />
    ),
});

export const multiSelectBrick = createBrick({
  type: 'input',
  dataType: 'array',
  id: 'multi-select',
  name: 'Multi select',
  category: 'Inputs',
  defaultConfigs: {
    label: 'Multi select',
    optionsSource: 'static',
    options: 'Option 1\nOption 2\nOption 3',
  },
  render: (props) =>
    fieldBlock(
      props,
      'Multi select',
      <fk-select-input
        configs={props.configs}
        accessibleLabel={labelOf(props, 'Multi select')}
        value={Array.isArray(props.data) ? (props.data as string[]) : []}
        multiple={true}
        {...lock(props, false)}
        invalid={!!props.error}
        dataMap={props.dataMap}
        onSelectValueChange={(
          event: CustomEvent<string | string[] | undefined>
        ) => {
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

const staticOptions = (props: {
  configs?: Record<string, unknown>;
}): { label: string; value: string }[] =>
  normalizeOptions(
    props.configs?.options,
    typeof props.configs?.labelKey === 'string' ? props.configs.labelKey : 'label',
    typeof props.configs?.valueKey === 'string' ? props.configs.valueKey : 'value'
  );

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
      <div class={fieldClass(props)} style={asInlineStyle(props.styles)}>
        <span class="fk-field__label">{labelOf(props, 'Select boxes')}</span>
        <div class="fk-radio-group">
          {staticOptions(props).map((option) => (
            <label class="fk-radio" key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                {...lock(props, false)}
                onChange={(event) => {
                  const checked = (event.target as HTMLInputElement).checked;
                  const next = checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value);
                  props.onDataChange?.(next.length ? next : undefined);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {props.error ? <span class="fk-field__error">{props.error}</span> : null}
        {fieldNote(props)}
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
              {...lock(props, false)}
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
          {...lock(props, true)}
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
        {...lock(props, false)}
        onSignatureChange={(event: CustomEvent<string | undefined>) => {
          event.stopPropagation();
          props.onDataChange?.(event.detail);
        }}
      />
    ),
});

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// "lat, lng" dans les configs du builder -> [lat, lng] pour la carte.
const parseCenter = (raw: unknown): [number, number] | undefined => {
  if (Array.isArray(raw) && raw.length === 2 && raw.every((n) => typeof n === 'number')) return [raw[0], raw[1]];
  if (typeof raw !== 'string') return undefined;
  const parts = raw.split(',').map((part) => Number(part.trim()));
  return parts.length === 2 && parts.every((n) => !Number.isNaN(n)) ? [parts[0], parts[1]] : undefined;
};

const geoNumber = (raw: unknown, fallback: number): number => {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback;
};

const geoMap = (props: WcBrickProps, mode: 'point' | 'polygon' | 'line'): VNode => (
  <fk-geo-map
    mode={mode}
    value={(props.data as Record<string, unknown> | undefined) as never}
    center={parseCenter(props.configs?.center)}
    zoom={geoNumber(props.configs?.zoom, 6)}
    height={geoNumber(props.configs?.height, 320)}
    tileUrl={typeof props.configs?.tileUrl === 'string' && props.configs.tileUrl ? props.configs.tileUrl : OSM_TILES}
    manual={props.configs?.manual !== false}
    readOnly={props.readOnly === true}
    disabled={props.editable === true || props.disabled === true}
    onGeoChange={(event: CustomEvent<unknown>) => {
      event.stopPropagation();
      props.onDataChange?.(event.detail);
    }}
  ></fk-geo-map>
);

export const geoPointBrick = createBrick({
  type: 'input',
  dataType: 'object',
  id: 'geo-point',
  name: 'Map point',
  category: 'Geo',
  defaultConfigs: { label: 'Location', center: '', zoom: 6, height: 320, tileUrl: OSM_TILES, manual: true },
  // Pas de <label> autour : un clic sur la carte activerait son premier bouton.
  render: (props) => fieldBlock(props, 'Location', geoMap(props, 'point')),
});

export const geoAreaBrick = createBrick({
  type: 'input',
  dataType: 'object',
  id: 'geo-area',
  name: 'Map area',
  category: 'Geo',
  defaultConfigs: { label: 'Area', shape: 'polygon', center: '', zoom: 6, height: 320, tileUrl: OSM_TILES },
  render: (props) => fieldBlock(props, 'Area', geoMap(props, props.configs?.shape === 'line' ? 'line' : 'polygon')),
});

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q={q}';

type AddressValue = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] } | null;
  properties: { label: string; [key: string]: unknown };
};

// Une adresse cherchee chez un geocodeur, stockee avec son point ; la carte
// en dessous permet d'ajuster le point sans perdre l'adresse normalisee.
export const geoAddressBrick = createBrick({
  type: 'input',
  dataType: 'object',
  id: 'geo-address',
  name: 'Address search',
  category: 'Geo',
  defaultConfigs: {
    label: 'Address',
    searchUrl: NOMINATIM_SEARCH,
    countryCodes: '',
    showMap: true,
    center: '',
    zoom: 15,
    height: 220,
    tileUrl: OSM_TILES,
  },
  render: (props) => {
    const value = (props.data ?? undefined) as AddressValue | undefined;
    const showMap = props.configs?.showMap !== false;
    return fieldBlock(
      props,
      'Address',
      <div class="fk-geo-address">
        <fk-address-search
          value={value as never}
          searchUrl={typeof props.configs?.searchUrl === 'string' && props.configs.searchUrl ? props.configs.searchUrl : NOMINATIM_SEARCH}
          countryCodes={typeof props.configs?.countryCodes === 'string' && props.configs.countryCodes ? props.configs.countryCodes : undefined}
          language={props.locale}
          placeholder={props.configs?.placeholder as string | undefined}
          readOnly={props.readOnly === true}
          disabled={props.editable === true || props.disabled === true}
          onAddressChange={(event: CustomEvent<unknown>) => {
            event.stopPropagation();
            props.onDataChange?.(event.detail as AddressValue | undefined);
          }}
        ></fk-address-search>
        {showMap && value?.geometry ? (
          <fk-geo-map
            mode="point"
            value={value.geometry as never}
            manual={false}
            zoom={geoNumber(props.configs?.zoom, 15)}
            height={geoNumber(props.configs?.height, 220)}
            tileUrl={typeof props.configs?.tileUrl === 'string' && props.configs.tileUrl ? props.configs.tileUrl : OSM_TILES}
            readOnly={props.readOnly === true}
            disabled={props.editable === true || props.disabled === true}
            onGeoChange={(event: CustomEvent<unknown>) => {
              event.stopPropagation();
              // Le point se deplace, l'adresse normalisee reste.
              props.onDataChange?.({ ...value, geometry: (event.detail ?? null) as AddressValue['geometry'] });
            }}
          ></fk-geo-map>
        ) : null}
      </div>
    );
  },
});

export const tabsBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'tabs',
  name: 'Tabs',
  category: 'Layout',
  defaultConfigs: { validateTabs: false },
  render: (props) => {
    const labels = (props.brickSpec?.children ?? []).map((child, index) => {
      const resolved = resolveLocalizedText(child.configs?.label, props.locale);
      return typeof resolved === 'string'
        ? resolved
        : (child.name ?? `Tab ${index + 1}`);
    });

    return (
      <fk-tabs
        tabLabels={labels}
        editable={props.editable}
        spec={props.brickSpec}
        dataMap={props.dataMap}
        locale={props.locale}
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
    <div class={fieldClass(props)} style={asInlineStyle(props.styles)}>
      <span class="fk-field__label">{labelOf(props, 'Radio')}</span>
      <div class="fk-radio-group" role="radiogroup" {...invalidAttr(props)}>
        {staticOptions(props).map((option) => (
          <label class="fk-radio" key={option.value}>
            <input
              type="radio"
              name={props.configs?.key ?? props.path}
              checked={props.data === option.value}
              {...lock(props, false)}
              onChange={() => props.onDataChange?.(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {props.error ? <span class="fk-field__error">{props.error}</span> : null}
      {fieldNote(props)}
    </div>
  ),
});

const ADDRESS_PARTS = [
  { key: 'street', label: () => fkT('address.street'), full: true },
  { key: 'city', label: () => fkT('address.city'), full: false },
  { key: 'zip', label: () => fkT('address.zip'), full: false },
  { key: 'country', label: () => fkT('address.country'), full: false },
];

export const addressBrick = createBrick({
  type: 'input',
  dataType: 'object',
  id: 'address',
  name: 'Address',
  category: 'Inputs',
  defaultConfigs: { label: 'Address' },
  render: (props) => {
    const value = (props.data ?? {}) as Record<string, unknown>;

    return fieldBlock(
      props,
      'Address',
      <div class="fk-address">
        {ADDRESS_PARTS.map((part) => (
          <label
            class={{ 'fk-address__part': true, 'fk-address__part--full': part.full }}
            key={part.key}
          >
            <span class="fk-address__label">{part.label()}</span>
            <input
              class="fk-field__input"
              type="text"
              value={(value[part.key] as string) ?? ''}
              {...lock(props, true)}
              onInput={(event) => {
                const raw = (event.target as HTMLInputElement).value;
                const next = { ...value, [part.key]: raw || undefined };
                const cleaned = Object.fromEntries(
                  Object.entries(next).filter(([, entry]) => entry !== undefined)
                );
                props.onDataChange?.(
                  Object.keys(cleaned).length ? cleaned : undefined
                );
              }}
            />
          </label>
        ))}
      </div>
    );
  },
});

export const fileBrick = createBrick({
  type: 'input',
  dataType: 'object',
  id: 'file',
  name: 'File',
  category: 'Data',
  defaultConfigs: { label: 'File', accept: '', uploadUrl: '', multiple: false },
  render: (props) =>
    fieldBlock(
      props,
      'File',
      <fk-file-input
        value={props.data as never}
        accept={props.configs?.accept as string}
        uploadUrl={props.configs?.uploadUrl as string}
        multiple={props.configs?.multiple === true}
        {...lock(props, false)}
        onFileValueChange={(event: CustomEvent<unknown>) => {
          event.stopPropagation();
          props.onDataChange?.(event.detail);
        }}
      />
    ),
});

export const dataGridBrick = createBrick({
  type: 'collection',
  dataType: 'array',
  id: 'data-grid',
  name: 'Data grid',
  category: 'Data',
  defaultConfigs: { label: 'Data grid' },
  render: (props) =>
    props.editable || !props.brickSpec ? (
      fieldBlock(
        props,
        'Data grid',
        <div class="fk-grid-template">
          <span class="fk-grid-template__hint">{fkT('grid.columns')}</span>
          {props.children as VNode}
        </div>
      )
    ) : (
      fieldBlock(
        props,
        'Data grid',
        <fk-data-grid
          spec={props.brickSpec}
          value={props.data}
          disabled={props.disabled === true || props.readOnly === true}
          readOnly={props.readOnly === true}
          locale={props.locale}
          utils={props.utils}
          annotations={props.annotations}
          notes={props.notes}
          reviewable={props.reviewable === true}
          editableKeys={props.editableKeys}
          onGridValueChange={(
            event: CustomEvent<Array<Record<string, unknown>> | undefined>
          ) => {
            event.stopPropagation();
            props.onDataChange?.(event.detail);
          }}
        />
      )
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
  defaultConfigs: {
    validateSteps: false,
    allowStepClick: true,
    showSubmit: false,
  },
  render: (props) => {
    const labels = (props.brickSpec?.children ?? []).map((child, index) => {
      const resolved = resolveLocalizedText(child.configs?.label, props.locale);
      return typeof resolved === 'string'
        ? resolved
        : (child.name ?? `Step ${index + 1}`);
    });

    return (
      <fk-stepper
        stepLabels={labels}
        editable={props.editable}
        readOnly={props.readOnly === true || props.disabled === true}
        spec={props.brickSpec}
        dataMap={props.dataMap}
        locale={props.locale}
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
  render: (props) => {
    const control = (
      <label class="fk-field--inline fk-field__main">
        <input
          class="fk-field__checkbox"
          type="checkbox"
          checked={props.data === true}
          {...lock(props, false)}
          onChange={(event) =>
            props.onDataChange?.((event.target as HTMLInputElement).checked)
          }
        />
        <span class="fk-field__label">{labelOf(props, 'Checkbox')}</span>
      </label>
    );
    const note = fieldNote(props);
    if (!note)
      return (
        <label class={fieldClass(props, 'fk-field--inline')} style={asInlineStyle(props.styles)}>
          <input
            class="fk-field__checkbox"
            type="checkbox"
            checked={props.data === true}
            {...lock(props, false)}
            onChange={(event) =>
              props.onDataChange?.((event.target as HTMLInputElement).checked)
            }
          />
          <span class="fk-field__label">{labelOf(props, 'Checkbox')}</span>
          {props.error ? <span class="fk-field__error">{props.error}</span> : null}
        </label>
      );
    return (
      <div class={fieldClass(props)} style={asInlineStyle(props.styles)}>
        {control}
        {props.error ? <span class="fk-field__error">{props.error}</span> : null}
        {note}
      </div>
    );
  },
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

export const recapBrick = createBrick({
  type: 'output',
  dataType: 'void',
  id: 'recap',
  name: 'Recap',
  category: 'Layout',
  defaultConfigs: { label: 'Recap', showEmpty: false, groupBySections: false },
  render: (props) => {
    const items = collectRecapItems(
      props.rootSpec,
      props.dataMap,
      props.locale,
      props.configs?.showEmpty === true,
      props.configs?.groupBySections === true
    );

    const blocks: VNode[] = [];
    let fields: Extract<RecapItem, { kind: 'field' }>[] = [];

    const flushFields = () => {
      if (!fields.length) return;
      blocks.push(
        <dl class="fk-recap__list">
          {fields.map((field) => (
            <div class="fk-recap__row" key={field.label}>
              <dt class="fk-recap__term">{field.label}</dt>
              <dd class="fk-recap__value">{field.value}</dd>
            </div>
          ))}
        </dl>
      );
      fields = [];
    };

    for (const item of items) {
      if (item.kind === 'field') {
        fields.push(item);
        continue;
      }
      flushFields();
      if (item.kind === 'section') {
        blocks.push(
          <span class="fk-recap__group-title" key={`section:${item.label}`}>
            {item.label}
          </span>
        );
        continue;
      }
      blocks.push(
        <section class="fk-recap__section" key={item.label}>
          <span class="fk-recap__section-title">{item.label}</span>
          {item.rows.length ? (
            <div class="fk-recap__table-wrap">
              <table class="fk-recap__table">
                <thead>
                  <tr>
                    <th class="fk-recap__index-cell">#</th>
                    {item.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {item.rows.map((row, index) => (
                    <tr key={index}>
                      <td class="fk-recap__index-cell">{index + 1}</td>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p class="fk-recap__empty">
              {fkTOr('recap.empty', 'Nothing to summarize yet.')}
            </p>
          )}
        </section>
      );
    }
    flushFields();

    return (
      <div class="fk-field fk-recap" style={asInlineStyle(props.styles)}>
        <span class="fk-field__label">{labelOf(props, 'Recap')}</span>
        {blocks.length ? (
          blocks
        ) : (
          <p class="fk-recap__empty">
            {fkTOr('recap.empty', 'Nothing to summarize yet.')}
          </p>
        )}
      </div>
    );
  },
});

const fieldKeys = (spec?: BrickSpec): string[] => {
  if (!spec) return [];
  const keys: string[] = [];
  const walk = (brick: BrickSpec) => {
    const key = brick.configs?.key;
    if (brick.type === 'input' && key && !key.startsWith('_')) keys.push(key);
    for (const child of brick.children ?? []) walk(child);
  };
  walk(spec);
  return keys;
};

export const codeBrick = createBrick({
  type: 'input',
  dataType: 'string',
  id: 'code',
  name: 'Code',
  category: 'Inputs',
  defaultConfigs: { label: 'Code', placeholder: 'return value;' },
  render: (props) =>
    fieldBlock(
      props,
      'Code',
      props.editable || props.disabled ? (
        <pre class="fk-code-preview">
          {(props.data as string) ||
            String(props.configs?.placeholder ?? '')}
        </pre>
      ) : (
        <fk-code-editor
          value={(props.data as string) ?? ''}
          completions={fieldKeys(props.rootSpec)}
          placeholder={props.configs?.placeholder as string}
          onCodeChange={(event: CustomEvent<string>) => {
            event.stopPropagation();
            props.onDataChange?.(event.detail || undefined);
          }}
        />
      )
    ),
});

export const nestedFormBrick = createBrick({
  type: 'panel',
  dataType: 'void',
  id: 'nested-form',
  name: 'Nested form',
  category: 'Layout',
  defaultConfigs: { label: 'Nested form', specRef: '' },
  render: (props) => {
    const ref = (props.configs?.specRef as string) || '';

    return (
      <div class="fk-nested-form" style={asInlineStyle(props.styles)}>
        <span class="fk-field__label">{labelOf(props, 'Nested form')}</span>
        <p class="fk-nested-form__hint">
          {ref
            ? `${fkTOr('nestedForm.ref', 'Referenced form')}: ${ref}`
            : fkTOr('nestedForm.missing', 'Set the specRef config to reference a form.')}
        </p>
      </div>
    );
  },
});

/**
 * Tracks whether the built-in bricks are in the registry, on globalThis so
 * every bundle copy agrees (same reason the registry itself lives there).
 *
 * Callers used to guard with `getBrickMolds().length === 0`, which broke as
 * soon as an app registered a custom brick at startup — the registry was no
 * longer empty, so the 30 built-ins never registered and every spec rendered
 * "Brick panel:column not found".
 */
const DEFAULTS_KEY = Symbol.for('formkrafter.wc.defaultBricksRegistered');
const globalFlags = globalThis as unknown as Record<symbol, boolean | undefined>;

export function registerDefaultBricks(): void {
  if (globalFlags[DEFAULTS_KEY]) return;
  globalFlags[DEFAULTS_KEY] = true;

  // A default must never clobber anything: an application that registered
  // its own version of a built-in brick before the first component mounted
  // keeps it, regardless of registration order.
  registerBricks(
    defaults.filter((brick) => !getBrick(brick.type, brick.id))
  );
}

const defaults = [
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
    geoPointBrick,
    geoAreaBrick,
    geoAddressBrick,
    addressBrick,
    codeBrick,
    fileBrick,
    dataGridBrick,
    hiddenBrick,
    contentBrick,
    recapBrick,
    nestedFormBrick,
    groupBrick,
    rowBrick,
    columnBrick,
    stepperBrick,
    tabsBrick,
];
