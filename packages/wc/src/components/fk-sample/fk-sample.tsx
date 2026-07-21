import { Component, Prop, h } from '@stencil/core'

/**
 * Temporary sample component validating the build pipeline
 * (Stencil build + React/Vue wrapper generation).
 * Delete it once real components are migrated.
 */
@Component({
  tag: 'fk-sample',
  shadow: true,
})
export class FkSample {
  @Prop() name = 'FormKrafter'

  render() {
    return <p>Hello {this.name}</p>
  }
}
