import { Brick } from '@streamline-pulse/formkrafter-core';
import type {
  BrickBaseConfigs,
  BrickProps,
  BrickSpec,
  BrickType,
  JSONSchemaType,
  Validator,
} from '@streamline-pulse/formkrafter-core';
import type { VNode } from '@stencil/core';

export type WcBrickConfigs = BrickBaseConfigs & Record<string, unknown>;
export type WcBrickProps = BrickProps<unknown, WcBrickConfigs, Record<string, unknown>>;
export type BrickRenderFn = (props: WcBrickProps) => VNode;

export function createBrick(params: {
  type: BrickType;
  dataType: JSONSchemaType;
  id: string;
  name: string;
  category?: string;
  configsForm?: BrickSpec;
  styles?: Record<string, unknown>;
  validators?: Validator[];
  unWrapData?: boolean;
  isPrivate?: boolean;
  render: BrickRenderFn;
  renderBuilder?: BrickRenderFn;
}) {
  return new (class extends Brick<unknown, WcBrickConfigs, Record<string, unknown>> {
    constructor() {
      super({
        type: params.type,
        dataType: params.dataType,
        id: params.id,
        name: params.name,
        category: params.category,
        configsForm: params.configsForm,
        styles: params.styles ?? {},
        validators: params.validators,
        unWrapData: params.unWrapData,
        isPrivate: params.isPrivate,
      });
    }

    render(props: WcBrickProps): VNode {
      return params.render(props);
    }

    renderBuilder(props: WcBrickProps): VNode {
      return (params.renderBuilder ?? params.render)(props);
    }

    getComponent(props: WcBrickProps): VNode {
      return this.render(props);
    }

    getComponentWithActions(props: WcBrickProps): VNode {
      return this.renderBuilder(props);
    }
  })();
}
