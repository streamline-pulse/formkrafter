import { Component, Element, Event, Prop, Watch } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import type { EditorView } from '@codemirror/view';

const fetchCodeMirror = () =>
  Promise.all([
    import('@codemirror/state'),
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('@codemirror/language'),
    import('@codemirror/lang-javascript'),
    import('@codemirror/theme-one-dark'),
  ]);

let codeMirrorModules: ReturnType<typeof fetchCodeMirror> | undefined;

const loadCodeMirror = () => (codeMirrorModules ??= fetchCodeMirror());

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
  private disconnected = false;

  async componentDidLoad() {
    const [
      { EditorState },
      { EditorView: View, keymap, lineNumbers, placeholder: cmPlaceholder },
      { defaultKeymap, history, historyKeymap },
      { defaultHighlightStyle, syntaxHighlighting },
      { javascript },
      { oneDark },
    ] = await loadCodeMirror();

    if (this.disconnected) return;

    const isDark = !!this.host.closest('.dark, [data-fk-theme="dark"]');

    this.view = new View({
      parent: this.host,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript(),
          ...(isDark
            ? [oneDark]
            : [syntaxHighlighting(defaultHighlightStyle)]),
          cmPlaceholder(this.placeholder),
          View.domEventHandlers({
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
    this.disconnected = true;
    this.view?.destroy();
    this.view = undefined;
  }

  render() {
    return null;
  }
}
