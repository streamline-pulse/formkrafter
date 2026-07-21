import { Component, Event, Listen, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { validateBrickSpecData } from '@streamline-pulse/formkrafter-core';
import type { BrickSpec, Utils } from '@streamline-pulse/formkrafter-core';
import type { DataChangeDetail } from '../../utils/events';

@Component({
  tag: 'fk-form-render',
  styleUrl: 'fk-form-render.css',
  scoped: true,
})
export class FkFormRender {
  @Prop() spec!: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() editable: boolean = false;
  @Prop() selectedUid?: string;

  @Event() formDataChange!: EventEmitter<DataChangeDetail>;

  @State() currentData: Record<string, unknown> = {};

  componentWillLoad() {
    this.currentData = { ...this.data };
  }

  @Watch('data')
  syncData(next?: Record<string, unknown>) {
    this.currentData = { ...next };
  }

  @Listen('brickDataChange')
  handleBrickDataChange(event: CustomEvent<Record<string, unknown>>) {
    event.stopPropagation();

    this.currentData = { ...this.currentData, ...event.detail };
    this.formDataChange.emit({
      data: this.currentData,
      isValid: validateBrickSpecData(this.spec, this.currentData),
    });
  }

  private utils: Utils = {
    validateForm: () => ({
      isValid: validateBrickSpecData(this.spec, this.currentData),
    }),
  };

  render() {
    if (!this.spec) return null;

    return (
      <form class="fk-form" onSubmit={(event) => event.preventDefault()}>
        <fk-brick-render
          brickSpec={this.spec}
          data={this.currentData}
          dataMap={this.currentData}
          path="0"
          editable={this.editable}
          selectedUid={this.selectedUid}
          utils={this.utils}
        />
      </form>
    );
  }
}
