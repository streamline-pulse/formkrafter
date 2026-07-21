import { Component, Event, Prop, h } from '@stencil/core';
import type { EventEmitter, VNode } from '@stencil/core';
import {
  getAffectedProperties,
} from '@streamline-pulse/formkrafter-core';
import type {
  BrickSpec,
  Utils,
  Validation,
} from '@streamline-pulse/formkrafter-core';
import { getBrick } from '../../registry/registry';
import { getBrickData, wrapBrickData } from '../../utils/brick-data';
import type { WcBrickProps } from '../../registry/create-brick';
import type {
  BrickConfigsChangeDetail,
  BrickPathDetail,
  BrickRulesChangeDetail,
  BrickStylesChangeDetail,
  BrickValidationsChangeDetail,
} from '../../utils/events';

@Component({
  tag: 'fk-brick-render',
  shadow: false,
})
export class FkBrickRender {
  @Prop() brickSpec!: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() dataMap?: Record<string, unknown>;
  @Prop() path: string = '0';
  @Prop() editable: boolean = false;
  @Prop() selectedUid?: string;
  @Prop() errors: Record<string, string> = {};
  @Prop() utils!: Utils;

  @Event() brickDataChange!: EventEmitter<Record<string, unknown>>;
  @Event() brickConfigsChange!: EventEmitter<BrickConfigsChangeDetail>;
  @Event() brickStylesChange!: EventEmitter<BrickStylesChangeDetail>;
  @Event() brickValidationsChange!: EventEmitter<BrickValidationsChangeDetail>;
  @Event() brickRulesChange!: EventEmitter<BrickRulesChangeDetail>;
  @Event() brickRemove!: EventEmitter<BrickPathDetail>;
  @Event() brickDuplicate!: EventEmitter<BrickPathDetail>;

  render() {
    const spec = this.brickSpec;
    if (!spec) return null;

    const brick = getBrick(spec.type, spec.id);
    if (!brick) {
      return <fk-brick-not-found>{`${spec.type}:${spec.id}`}</fk-brick-not-found>;
    }

    const editing = this.editable && (spec.editable ?? true);
    const affected = getAffectedProperties(spec.rules, this.dataMap);

    if (!editing && affected.hidden === true) return null;

    const isContainer = spec.type === 'panel' || spec.type === 'collection';
    const uid = spec.configs?.uid;

    const childNodes: VNode[] = (spec.children ?? []).map((childSpec, index) => (
      <fk-brick-render
        brickSpec={childSpec}
        data={this.data}
        dataMap={this.dataMap}
        errors={this.errors}
        path={`${this.path}.${index}`}
        editable={this.editable}
        selectedUid={this.selectedUid}
        utils={this.utils}
      />
    ));

    if (editing && isContainer) {
      childNodes.push(<fk-drop-area path={this.path} />);
    }

    const props: WcBrickProps = {
      brickSpec: spec,
      configsForm: spec.configsForm,
      configs: spec.configs,
      styles: spec.styles ?? {},
      data: getBrickData(spec, this.data),
      dataMap: this.dataMap,
      error: spec.configs?.key ? this.errors[spec.configs.key] : undefined,
      disabled: editing ? false : affected.disabled === true,
      path: this.path,
      editable: editing,
      children: childNodes,
      validations: spec.validations,
      rules: spec.rules,
      utils: this.utils,
      onDataChange: (value) => {
        const wrapped = wrapBrickData(spec, value);
        if (wrapped !== undefined) this.brickDataChange.emit(wrapped);
      },
      onConfigsChange: (configs, changedUid) =>
        this.brickConfigsChange.emit({ configs, uid: changedUid ?? uid }),
      onStylesChange: (styles, changedUid) =>
        this.brickStylesChange.emit({
          styles: styles as Record<string, unknown>,
          uid: changedUid ?? uid,
        }),
      onValidationsChange: (validations: Validation[], changedUid?: string) =>
        this.brickValidationsChange.emit({ validations, uid: changedUid ?? uid }),
      onRulesChange: (rules, changedUid) =>
        this.brickRulesChange.emit({ rules, uid: changedUid ?? uid }),
      onDelete: (path) => this.brickRemove.emit({ path }),
      onDuplicate: (path) => this.brickDuplicate.emit({ path }),
    };

    const node = (editing ? brick.renderBuilder(props) : brick.render(props)) as VNode;

    if (!editing || this.path === '0') return node;

    return (
      <fk-brick-actions
        path={this.path}
        selected={uid !== undefined && uid === this.selectedUid}
      >
        {node}
      </fk-brick-actions>
    );
  }
}
