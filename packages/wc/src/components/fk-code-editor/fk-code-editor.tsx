import { Component, Element, Event, Prop, Watch } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';

@Component({
  tag: 'fk-code-editor',
  styleUrl: 'fk-code-editor.css',
  scoped: true,
})
export class FkCodeEditor {
  @Element() host!: HTMLElement;

  @Prop() value = '';
  @Prop() placeholder = '';

  @Event() codeChange!: EventEmitter<string>;

  private view?: EditorView;

  componentDidLoad() {
    this.view = new EditorView({
      parent: this.host,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript(),
          syntaxHighlighting(defaultHighlightStyle),
          cmPlaceholder(this.placeholder),
          EditorView.domEventHandlers({
            blur: () => this.emitIfChanged(),
          }),
        ],
      }),
    });
  }

  @Watch('value')
  syncValue(next: string) {
    if (!this.view || this.view.hasFocus) return;

    const current = this.view.state.doc.toString();
    if (current !== next) {
      this.view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
      });
    }
  }

  private emitIfChanged() {
    if (!this.view) return;

    const doc = this.view.state.doc.toString();
    if (doc !== this.value) this.codeChange.emit(doc);
  }

  disconnectedCallback() {
    this.view?.destroy();
    this.view = undefined;
  }

  render() {
    return null;
  }
}
