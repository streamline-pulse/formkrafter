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

  @Event() fileValueChange!: EventEmitter<UploadedFile | undefined>;

  @State() uploading = false;
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
      const uploaded = await services.fileUploadService.upload(file);
      this.fileValueChange.emit(uploaded);
    } catch (error) {
      this.uploadError =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.uploading = false;
      input.value = '';
    }
  };

  render() {
    return (
      <div class="fk-file">
        {this.value ? (
          <div class="fk-file__selected">
            <span class="fk-file__name" title={this.value.name}>
              {this.value.name}
            </span>
            <span class="fk-file__size">{this.formatSize(this.value.size)}</span>
            <button
              type="button"
              class="fk-file__remove"
              title={fkT('file.remove')}
              disabled={this.disabled}
              onClick={(event) => {
                event.preventDefault();
                this.fileValueChange.emit(undefined);
              }}
            >
              ✕
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
