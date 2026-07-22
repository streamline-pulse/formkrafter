import { Component, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { services } from '@streamline-pulse/formkrafter-core';
import type { UploadedFile } from '@streamline-pulse/formkrafter-core';
import { fkT } from '../../i18n/i18n';

@Component({
  tag: 'fk-file-input',
  styleUrl: 'fk-file-input.css',
  scoped: true,
})
export class FkFileInput {
  @Prop() value?: UploadedFile;
  @Prop() disabled = false;
  @Prop() accept?: string;
  @Prop() uploadUrl?: string;

  @Event() fileValueChange!: EventEmitter<UploadedFile | undefined>;

  @State() uploading = false;
  @State() removing = false;
  @State() uploadError?: string;

  private inputEl?: HTMLInputElement;

  private formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private handleFile = async (event: globalThis.Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.uploadError = undefined;

    try {
      const uploaded = await services.fileUploadService.upload(file, {
        url: this.uploadUrl,
      });
      this.fileValueChange.emit(uploaded);
    } catch (error) {
      this.uploadError =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.uploading = false;
      input.value = '';
    }
  };

  private handleRemove = async (event: globalThis.Event) => {
    event.preventDefault();
    const current = this.value;
    if (!current) return;

    this.removing = true;
    this.uploadError = undefined;

    try {
      await services.fileUploadService.remove?.(current, { url: this.uploadUrl });
    } catch (error) {
      this.uploadError = error instanceof Error ? error.message : String(error);
    } finally {
      this.removing = false;
      this.fileValueChange.emit(undefined);
    }
  };

  render() {
    return (
      <div class="fk-file">
        {this.value ? (
          <div class="fk-file__selected">
            <span class="fk-file__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <span class="fk-file__meta">
              <span class="fk-file__name" title={this.value.name}>
                {this.value.name}
              </span>
              <span class="fk-file__size">
                {this.formatSize(this.value.size)}
              </span>
            </span>
            <button
              type="button"
              class="fk-file__remove"
              title={fkT('file.remove')}
              disabled={this.disabled || this.removing}
              onClick={this.handleRemove}
            >
              {this.removing ? '…' : '✕'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            class="fk-file__choose"
            disabled={this.disabled || this.uploading}
            onClick={(event) => {
              event.preventDefault();
              this.inputEl?.click();
            }}
          >
            {this.uploading ? fkT('file.uploading') : fkT('file.choose')}
          </button>
        )}

        <input
          class="fk-file__native"
          type="file"
          accept={this.accept}
          disabled={this.disabled}
          ref={(element) => (this.inputEl = element)}
          onChange={this.handleFile}
        />

        {this.uploadError ? (
          <span class="fk-field__error">{this.uploadError}</span>
        ) : null}
      </div>
    );
  }
}
