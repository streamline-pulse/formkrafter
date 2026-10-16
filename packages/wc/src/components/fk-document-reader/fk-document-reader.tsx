import { Component, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { services } from '@streamline-pulse/formkrafter-core';
import type { DocumentField, DocumentReading, UploadedFile } from '@streamline-pulse/formkrafter-core';
import { fkT } from '../../i18n/i18n';

/** The value a document brick stores: the file (when uploaded) and what was read from it. */
export interface DocumentValue extends DocumentReading {
  name: string;
  type: string;
  size: number;
  file?: UploadedFile;
  readAt?: string;
}

const TEXT_PREVIEW = 600;

/**
 * Picks a document (file or camera on mobile), sends it to the host's
 * document reader, then shows the text and the requested fields, which the
 * user can correct before the form is submitted.
 */
@Component({
  tag: 'fk-document-reader',
  styleUrl: 'fk-document-reader.css',
  scoped: true,
})
export class FkDocumentReader {
  @Prop() value?: DocumentValue;
  @Prop() accept = 'image/*,.pdf';
  /** Offers the device camera (mobile browsers) in addition to the file picker. */
  @Prop() capture = false;
  @Prop() readUrl?: string;
  /** When set, the document is also uploaded through the file upload service and kept in the value. */
  @Prop() uploadUrl?: string;
  @Prop() keepFile = true;
  @Prop() fields: DocumentField[] = [];
  @Prop() language?: string;
  /** Form context handed to the host reader (`_`-prefixed keys). */
  @Prop() context?: Record<string, unknown>;
  @Prop() disabled = false;
  @Prop() readOnly = false;

  @Event() documentChange!: EventEmitter<DocumentValue | undefined>;

  @State() reading = false;
  @State() error?: string;
  @State() showText = false;

  private inputEl?: HTMLInputElement;
  private cameraEl?: HTMLInputElement;

  private get locked(): boolean {
    return this.disabled || this.readOnly;
  }

  private handleFile = async (event: globalThis.Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.locked) return;
    this.reading = true;
    this.error = undefined;
    try {
      const reader = services.documentReaderService;
      if (!reader) throw new Error(fkT('document.noReader'));
      const [reading, uploaded] = await Promise.all([
        reader.read(file, { url: this.readUrl || undefined, fields: this.fields, language: this.language || undefined, context: this.context }),
        this.keepFile && this.uploadUrl !== undefined
          ? services.fileUploadService.upload(file, { url: this.uploadUrl || undefined })
          : Promise.resolve(undefined),
      ]);
      const fields = this.fields.length
        ? Object.fromEntries(this.fields.map((field) => [field.key, reading.fields?.[field.key] ?? null]))
        : reading.fields;
      const value: DocumentValue = {
        name: file.name,
        type: file.type,
        size: file.size,
        ...reading,
        ...(fields ? { fields } : {}),
        ...(uploaded ? { file: uploaded } : {}),
        readAt: new Date().toISOString(),
      };
      this.documentChange.emit(value);
    } catch (error) {
      this.error = error instanceof Error && error.message ? error.message : fkT('document.failed');
    } finally {
      this.reading = false;
    }
  };

  private updateField(key: string, raw: string) {
    if (!this.value) return;
    const fields = { ...(this.value.fields ?? {}), [key]: raw === '' ? null : raw };
    this.documentChange.emit({ ...this.value, fields });
  }

  private fieldLabel(key: string): string {
    return this.fields.find((field) => field.key === key)?.label ?? key;
  }

  private renderFields() {
    const fields = this.value?.fields;
    if (!fields || !Object.keys(fields).length) return null;
    return (
      <dl class="fk-document__fields">
        {Object.entries(fields).map(([key, raw]) => (
          <div class="fk-document__field" key={key}>
            <dt>{this.fieldLabel(key)}</dt>
            <dd>
              {this.locked ? (
                <span class={{ 'fk-document__missing': raw === null || raw === undefined || raw === '' }}>
                  {raw === null || raw === undefined || raw === '' ? fkT('document.notFound') : String(raw)}
                </span>
              ) : (
                <input
                  class="fk-field__input fk-document__input"
                  type="text"
                  value={raw === null || raw === undefined ? '' : String(raw)}
                  placeholder={fkT('document.notFound')}
                  aria-label={this.fieldLabel(key)}
                  onInput={(event) => this.updateField(key, (event.target as HTMLInputElement).value)}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  private renderText() {
    const text = this.value?.text?.trim();
    if (!text) return null;
    const preview = this.showText || text.length <= TEXT_PREVIEW ? text : `${text.slice(0, TEXT_PREVIEW)}…`;
    return (
      <details class="fk-document__text" open={this.showText} onToggle={(event) => (this.showText = (event.target as HTMLDetailsElement).open)}>
        <summary>
          {fkT('document.text')}
          {this.value?.pages ? <small> · {this.value.pages} p.</small> : null}
        </summary>
        <pre>{preview}</pre>
      </details>
    );
  }

  render() {
    const value = this.value;
    return (
      <div class="fk-document">
        {value ? (
          <div class="fk-document__file">
            <span class="fk-document__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="13" y2="17" />
              </svg>
            </span>
            <span class="fk-document__meta">
              <span class="fk-document__name" title={value.name}>
                {value.name}
              </span>
              <span class="fk-document__status">{fkT('document.read')}</span>
            </span>
            {!this.locked ? (
              <button type="button" class="fk-document__remove" title={fkT('document.remove')} onClick={() => this.documentChange.emit(undefined)}>
                ✕
              </button>
            ) : null}
          </div>
        ) : this.locked ? (
          <span class="fk-document__empty">{fkT('document.none')}</span>
        ) : null}
        {!this.locked && !value ? (
          <div class="fk-document__actions">
            <button type="button" class="fk-document__choose" disabled={this.reading} onClick={() => this.inputEl?.click()}>
              {this.reading ? fkT('document.reading') : fkT('document.choose')}
            </button>
            {this.capture ? (
              <button type="button" class="fk-document__choose fk-document__camera" disabled={this.reading} onClick={() => this.cameraEl?.click()}>
                {fkT('document.capture')}
              </button>
            ) : null}
          </div>
        ) : null}
        {this.reading && value ? <span class="fk-document__empty">{fkT('document.reading')}</span> : null}
        {this.renderFields()}
        {this.renderText()}
        <input class="fk-document__native" type="file" accept={this.accept} disabled={this.locked} ref={(el) => (this.inputEl = el)} onChange={this.handleFile} />
        {this.capture ? (
          <input class="fk-document__native" type="file" accept="image/*" capture="environment" disabled={this.locked} ref={(el) => (this.cameraEl = el)} onChange={this.handleFile} />
        ) : null}
        {this.error ? (
          <span class="fk-field__error" role="alert">
            {this.error}
          </span>
        ) : null}
      </div>
    );
  }
}
