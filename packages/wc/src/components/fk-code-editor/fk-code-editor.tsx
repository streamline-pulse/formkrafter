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
    import('@codemirror/autocomplete'),
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
  @Prop() completions: string[] = [];

  @Event() codeChange!: EventEmitter<string>;

  private view?: EditorView;
  private disconnected = false;

  async componentDidLoad() {
    const [
      { EditorState },
      { EditorView: View, keymap, lineNumbers, placeholder: cmPlaceholder },
      { defaultKeymap, history, historyKeymap },
      { defaultHighlightStyle, syntaxHighlighting },
      { javascript, javascriptLanguage },
      { oneDark },
      { autocompletion, completionKeymap },
    ] = await loadCodeMirror();

    if (this.disconnected) return;

    const isDark = !!this.host.closest('.dark, [data-fk-theme="dark"]');

    const variableSource = (context: {
      pos: number;
      explicit: boolean;
      matchBefore: (
        expr: RegExp
      ) => { from: number; to: number; text: string } | null;
    }) => {
      const propertyAccess = context.matchBefore(/dataMap\s*\.\s*\w*/);
      if (propertyAccess) {
        const dotIndex = propertyAccess.text.lastIndexOf('.');
        return {
          from: propertyAccess.from + dotIndex + 1,
          options: this.completions.map((name) => ({
            label: name,
            type: 'property',
          })),
        };
      }

      const word = context.matchBefore(/\w+/);
      if (!word && !context.explicit) return null;

      return {
        from: word ? word.from : context.pos,
        options: [
          { label: 'dataMap', type: 'variable' },
          { label: 'value', type: 'variable' },
          ...this.completions.map((name) => ({
            label: name,
            type: 'variable',
          })),
        ],
      };
    };

    this.view = new View({
      parent: this.host,
      state: EditorState.create({
        doc: this.value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap]),
          javascript(),
          autocompletion(),
          javascriptLanguage.data.of({ autocomplete: variableSource }),
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
