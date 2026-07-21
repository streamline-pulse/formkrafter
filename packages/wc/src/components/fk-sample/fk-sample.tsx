import { Component, Prop, h } from '@stencil/core'

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
