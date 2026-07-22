import { Component, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { services } from '@streamline-pulse/formkrafter-core';
import type { UploadedFile } from '@streamline-pulse/formkrafter-core';
import { fkT, fkTOr } from '../../i18n/i18n';

@Component({
  tag: 'fk-file-input',
  styleUrl: 'fk-file-input.css',
  scoped: true,
})
export class FkFileInput {
  @Prop() value?: UploadedFile | UploadedFile[];
  @Prop() disabled = false;
  @Prop() accept?: string;
  @Prop() uploadUrl?: string;
  @Prop() multiple = false;

  @Event() fileValueChange!: EventEmitter<
    UploadedFile | UploadedFile[] | undefined
  >;

  @State() uploading = false;
  @State() removingUrl?: string;
  @State() uploadError?: string;

  private inputEl?: HTMLInputElement;

  private get files(): UploadedFile[] {
    if (Array.isArray(this.value)) return this.value;
    return this.value ? [this.value] : [];
  }

  private emitFiles(files: UploadedFile[]) {
    if (this.multiple) {
      this.fileValueChange.emit(files.length ? files : undefined);
    } else {
      this.fileValueChange.emit(files[0]);
    }
  }

  private formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private handleFile = async (event: globalThis.Event) => {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    if (!selected.length) return;

    this.uploading = true;
    this.uploadError = undefined;

    try {
      const uploaded: UploadedFile[] = [];
      for (const file of this.multiple ? selected : selected.slice(0, 1)) {
        uploaded.push(
          await services.fileUploadService.upload(file, { url: this.uploadUrl })
        );
      }
      this.emitFiles(this.multiple ? [...this.files, ...uploaded] : uploaded);
    } catch (error) {
      this.uploadError =
        error instanceof Error ? error.message : String(error);
    } finally {
      this.uploading = false;
      input.value = '';
    }
  };

  private handleRemove = async (file: UploadedFile) => {
    this.removingUrl = file.url;
    this.uploadError = undefined;

    try {
      await services.fileUploadService.remove?.(file, { url: this.uploadUrl });
    } catch (error) {
      this.uploadError = error instanceof Error ? error.message : String(error);
    } finally {
      this.removingUrl = undefined;
      this.emitFiles(this.files.filter((item) => item !== file));
    }
  };

  private renderFile(file: UploadedFile) {
    const removing = this.removingUrl !== undefined && this.removingUrl === file.url;

    return (
      <div class="fk-file__selected" key={`${file.url}:${file.name}`}>
        <span class="fk-file__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </span>
        <span class="fk-file__meta">
          <span class="fk-file__name" title={file.name}>
            {file.name}
          </span>
          <span class="fk-file__size">{this.formatSize(file.size)}</span>
        </span>
        <button
          type="button"
          class="fk-file__remove"
          title={fkT('file.remove')}
          disabled={this.disabled || removing}
          onClick={(event) => {
            event.preventDefault();
            void this.handleRemove(file);
          }}
        >
          {removing ? '…' : '✕'}
        </button>
      </div>
    );
  }

  render() {
    const files = this.files;
    const showChoose = this.multiple || files.length === 0;

    return (
      <div class="fk-file">
        {files.map((file) => this.renderFile(file))}

        {showChoose ? (
          <button
            type="button"
            class="fk-file__choose"
            disabled={this.disabled || this.uploading}
            onClick={(event) => {
              event.preventDefault();
              this.inputEl?.click();
            }}
          >
            {this.uploading
              ? fkT('file.uploading')
              : this.multiple && files.length
                ? fkTOr('file.addAnother', '+ Add a file')
                : fkT('file.choose')}
          </button>
        ) : null}

        <input
          class="fk-file__native"
          type="file"
          accept={this.accept}
          multiple={this.multiple}
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
