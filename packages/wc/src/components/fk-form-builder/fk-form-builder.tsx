import { Component, Event, Listen, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import {
  SpecHistory,
  addBrick,
  duplicateBrick,
  getBrickAt,
  iterateBricks,
  moveBrick,
  removeBrick,
  updateBrickConfigs,
  updateBrickRules,
  updateBrickStyles,
  updateBrickValidations,
} from '@streamline-pulse/formkrafter-core';
import type { BrickSpec, SpecUpdate } from '@streamline-pulse/formkrafter-core';
import {
  getBrickMolds,
  newBrickSpec,
} from '../../registry/registry';
import { registerDefaultBricks } from '../../registry/default-bricks';
import { fkT } from '../../i18n/i18n';
import type {
  BrickConfigsChangeDetail,
  BrickDropDetail,
  BrickPathDetail,
  BrickRulesChangeDetail,
  BrickStylesChangeDetail,
  BrickValidationsChangeDetail,
  DataChangeDetail,
  SpecChangeDetail,
} from '../../utils/events';

@Component({
  tag: 'fk-form-builder',
  styleUrl: 'fk-form-builder.css',
  scoped: true,
})
export class FkFormBuilder {
  @Prop() spec?: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() locales: string[] = [];

  @Event() specChange!: EventEmitter<SpecChangeDetail>;

  @State() currentSpec?: BrickSpec;
  @State() currentData: Record<string, unknown> = {};
  @State() selectedUid?: string;
  @State() copied = false;
  @State() editLocale?: string;

  private history = new SpecHistory();

  componentWillLoad() {
    if (getBrickMolds().length === 0) registerDefaultBricks();
    this.editLocale = this.locales[0];

    this.currentSpec = this.spec;
    this.currentData = { ...this.data };
  }

  @Watch('spec')
  syncSpec(next?: BrickSpec) {
    this.currentSpec = next;
    this.history.clear();
  }

  @Listen('brickDrop')
  handleBrickDrop(event: CustomEvent<BrickDropDetail>) {
    event.stopPropagation();
    const { source, mold, from, parentPath, index } = event.detail;

    if (source === 'new' && mold) {
      const brickSpec = newBrickSpec(mold.type, mold.id);
      if (!brickSpec) return;

      if (!this.currentSpec) {
        this.setRootSpec(
          brickSpec.type === 'panel'
            ? brickSpec
            : this.wrapInRootGroup(brickSpec)
        );
        return;
      }

      this.applyUpdate(addBrick(this.currentSpec, brickSpec, parentPath, index));
      return;
    }

    if (source === 'move' && from && this.currentSpec) {
      if (parentPath === from || parentPath.startsWith(`${from}.`)) return;

      const parent = getBrickAt(this.currentSpec, parentPath);
      if (!parent) return;

      const count = parent.children?.length ?? 0;
      const fromSegments = from.split('.');
      const fromParent = fromSegments.slice(0, -1).join('.');
      const fromIndex = Number(fromSegments[fromSegments.length - 1]);
      const targetIndex = index ?? count;

      if (
        fromParent === parentPath &&
        (targetIndex === fromIndex || targetIndex === fromIndex + 1)
      ) {
        return;
      }

      this.applyUpdate(
        moveBrick(this.currentSpec, from, `${parentPath}.${targetIndex}`)
      );
    }
  }

  @Listen('brickRemove')
  handleBrickRemove(event: CustomEvent<BrickPathDetail>) {
    event.stopPropagation();
    if (!this.currentSpec) return;

    if (event.detail.path === '0') {
      this.setRootSpec(undefined);
      return;
    }

    this.applyUpdate(removeBrick(this.currentSpec, event.detail.path));
  }

  @Listen('brickDuplicate')
  handleBrickDuplicate(event: CustomEvent<BrickPathDetail>) {
    event.stopPropagation();
    if (!this.currentSpec) return;

    this.applyUpdate(duplicateBrick(this.currentSpec, event.detail.path));
  }

  @Listen('brickConfigsChange')
  handleConfigsChange(event: CustomEvent<BrickConfigsChangeDetail>) {
    event.stopPropagation();
    if (!this.currentSpec || !event.detail.uid) return;

    this.applyUpdate(
      updateBrickConfigs(this.currentSpec, event.detail.uid, event.detail.configs)
    );
  }

  @Listen('brickStylesChange')
  handleStylesChange(event: CustomEvent<BrickStylesChangeDetail>) {
    event.stopPropagation();
    if (!this.currentSpec || !event.detail.uid) return;

    this.applyUpdate(
      updateBrickStyles(this.currentSpec, event.detail.uid, event.detail.styles)
    );
  }

  @Listen('brickValidationsChange')
  handleValidationsChange(event: CustomEvent<BrickValidationsChangeDetail>) {
    event.stopPropagation();
    if (!this.currentSpec || !event.detail.uid) return;

    this.applyUpdate(
      updateBrickValidations(
        this.currentSpec,
        event.detail.uid,
        event.detail.validations
      )
    );
  }

  @Listen('brickRulesChange')
  handleRulesChange(event: CustomEvent<BrickRulesChangeDetail>) {
    event.stopPropagation();
    if (!this.currentSpec || !event.detail.uid) return;

    this.applyUpdate(
      updateBrickRules(this.currentSpec, event.detail.uid, event.detail.rules)
    );
  }

  @Listen('formDataChange')
  handleDataChange(event: CustomEvent<DataChangeDetail>) {
    this.currentData = event.detail.data;
  }

  @Listen('brickSelect')
  handleBrickSelect(event: CustomEvent<BrickPathDetail>) {
    event.stopPropagation();
    if (!this.currentSpec) return;

    this.selectedUid = getBrickAt(this.currentSpec, event.detail.path)?.configs?.uid;
  }

  private findSelected(): { brick: BrickSpec; path: string } | undefined {
    if (!this.currentSpec || !this.selectedUid) return undefined;

    for (const { brick, path } of iterateBricks(this.currentSpec)) {
      if (brick.configs?.uid === this.selectedUid) return { brick, path };
    }

    return undefined;
  }

  private inputFieldKeys(): string[] {
    const keys: string[] = [];

    for (const { brick } of iterateBricks(this.currentSpec)) {
      const key = brick.configs?.key;
      if (brick.type === 'input' && key) keys.push(key);
    }

    return keys;
  }

  private wrapInRootGroup(brickSpec: BrickSpec): BrickSpec {
    const root = newBrickSpec('panel', 'column');
    if (!root) return brickSpec;

    return { ...root, name: 'Form', children: [brickSpec] };
  }

  private setRootSpec(spec?: BrickSpec) {
    this.currentSpec = spec;
    this.history.clear();
    this.specChange.emit({ spec, patches: [], inverse: [] });
  }

  private applyUpdate(update: SpecUpdate) {
    this.history.record(update);
    this.currentSpec = update.spec;
    this.specChange.emit({
      spec: update.spec,
      patches: update.patches,
      inverse: update.inverse,
    });
  }

  private specJson(): string {
    return JSON.stringify(this.currentSpec, null, 2);
  }

  private copySpec = async () => {
    if (!this.currentSpec) return;

    await navigator.clipboard.writeText(this.specJson());
    this.copied = true;
    setTimeout(() => (this.copied = false), 1500);
  };

  private downloadSpec = () => {
    if (!this.currentSpec) return;

    const blob = new Blob([this.specJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'form-spec.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  private undo = () => {
    if (!this.currentSpec) return;

    const spec = this.history.undo(this.currentSpec);
    if (spec === undefined) return;

    this.currentSpec = spec;
    this.specChange.emit({ spec, patches: [], inverse: [] });
  };

  private redo = () => {
    if (!this.currentSpec) return;

    const spec = this.history.redo(this.currentSpec);
    if (spec === undefined) return;

    this.currentSpec = spec;
    this.specChange.emit({ spec, patches: [], inverse: [] });
  };

  render() {
    return (
      <div class="fk-builder">
        <aside class="fk-builder__palette">
          <fk-brick-list />
        </aside>

        <main class="fk-builder__main">
          <div class="fk-builder__toolbar">
            <button
              type="button"
              class="fk-builder__tool"
              disabled={!this.history.canUndo}
              onClick={this.undo}
            >
              ↩ {fkT('builder.undo')}
            </button>
            <button
              type="button"
              class="fk-builder__tool"
              disabled={!this.history.canRedo}
              onClick={this.redo}
            >
              ↪ {fkT('builder.redo')}
            </button>

            <span class="fk-builder__spacer"></span>

            {this.locales.length > 1 ? (
              <select
                class="fk-builder__tool"
                onChange={(event) =>
                  (this.editLocale = (event.target as HTMLSelectElement).value)
                }
              >
                {this.locales.map((locale) => (
                  <option value={locale} selected={locale === this.editLocale}>
                    {locale.toUpperCase()}
                  </option>
                ))}
              </select>
            ) : null}

            <button
              type="button"
              class="fk-builder__tool"
              disabled={!this.currentSpec}
              onClick={this.copySpec}
            >
              ⧉ {this.copied ? fkT('builder.copied') : fkT('builder.copyJson')}
            </button>
            <button
              type="button"
              class="fk-builder__tool"
              disabled={!this.currentSpec}
              onClick={this.downloadSpec}
            >
              ⬇ {fkT('builder.downloadJson')}
            </button>
          </div>

          <div class="fk-builder__canvas">
            {this.currentSpec ? (
              <fk-form-render
                spec={this.currentSpec}
                data={this.currentData}
                editable={true}
                selectedUid={this.selectedUid}
                locale={this.editLocale}
              />
            ) : (
              [<fk-empty-form />, <fk-drop-area path="0" />]
            )}
          </div>
        </main>

        <aside class="fk-builder__inspector">
          {(() => {
            const selected = this.findSelected();
            return selected ? (
              <fk-property-panel
                brick={selected.brick}
                fields={this.inputFieldKeys()}
                locales={this.locales}
                editLocale={this.editLocale}
              />
            ) : (
              <p class="fk-builder__hint">{fkT('builder.hint')}</p>
            );
          })()}
        </aside>
      </div>
    );
  }
}
