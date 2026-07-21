import { Component, Event, Prop, State, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { services } from '@streamline-pulse/formkrafter-core';
import type { BrickSpec, Effect, Rule } from '@streamline-pulse/formkrafter-core';
import {
  OPERATORS,
  buildLogic,
  formatValue,
  parseLogic,
  parseValueInput,
} from '../../utils/rule-condition';
import type { OperatorId } from '../../utils/rule-condition';
import type { BrickRulesChangeDetail } from '../../utils/events';

const EFFECT_TARGETS = ['hidden', 'disabled', 'required', 'value'] as const;

type RuleMode = 'simple' | 'json' | 'javaScript';

@Component({
  tag: 'fk-rules-editor',
  styleUrl: 'fk-rules-editor.css',
  scoped: true,
})
export class FkRulesEditor {
  @Prop() brick!: BrickSpec;
  @Prop() fields: string[] = [];

  @Event() brickRulesChange!: EventEmitter<BrickRulesChangeDetail>;

  @State() forcedModes: Record<number, RuleMode> = {};
  @State() jsonErrors: Record<number, string> = {};
  @State() codeErrors: Record<number, string> = {};

  private rules(): Rule[] {
    return this.brick.rules ?? [];
  }

  private commit(rules: Rule[]) {
    const uid = this.brick.configs?.uid;
    if (!uid) return;

    this.brickRulesChange.emit({ rules, uid });
  }

  private updateRule(index: number, patch: Partial<Rule>) {
    this.commit(
      this.rules().map((rule, i) => (i === index ? { ...rule, ...patch } : rule))
    );
  }

  private addRule = () => {
    this.commit([
      ...this.rules(),
      {
        name: `Rule ${this.rules().length + 1}`,
        type: 'jsonLogic',
        logic: buildLogic({
          field: this.fields[0] ?? '',
          operator: 'equals',
          value: '',
        }),
        effects: [{ property: { target: 'hidden', type: 'boolean' }, boolean: true }],
      },
    ]);
  };

  private removeRule(index: number) {
    this.commit(this.rules().filter((_, i) => i !== index));
    this.forcedModes = { ...this.forcedModes, [index]: undefined } as Record<
      number,
      RuleMode
    >;
  }

  private modeOf(index: number, rule: Rule): RuleMode {
    if (rule.type === 'javaScript') return 'javaScript';
    if (this.forcedModes[index]) return this.forcedModes[index];

    return parseLogic(rule.logic) ? 'simple' : 'json';
  }

  private setMode(index: number, rule: Rule, mode: RuleMode) {
    this.forcedModes = { ...this.forcedModes, [index]: mode };
    this.jsonErrors = { ...this.jsonErrors, [index]: '' };
    this.codeErrors = { ...this.codeErrors, [index]: '' };

    if (mode === 'javaScript' && rule.type !== 'javaScript') {
      this.updateRule(index, { type: 'javaScript', code: rule.code ?? 'return true;' });
      return;
    }

    if (mode !== 'javaScript' && rule.type !== 'jsonLogic') {
      this.updateRule(index, {
        type: 'jsonLogic',
        logic:
          rule.logic ??
          buildLogic({ field: this.fields[0] ?? '', operator: 'equals', value: '' }),
      });
    }
  }

  private updateCondition(index: number, rule: Rule, patch: Record<string, unknown>) {
    const current = parseLogic(rule.logic) ?? {
      field: this.fields[0] ?? '',
      operator: 'equals' as OperatorId,
      value: '',
    };

    this.updateRule(index, {
      logic: buildLogic({ ...current, ...patch }),
    });
  }

  private commitJson(index: number, raw: string) {
    try {
      const logic = JSON.parse(raw);
      this.jsonErrors = { ...this.jsonErrors, [index]: '' };
      this.updateRule(index, { logic });
    } catch (error) {
      this.jsonErrors = {
        ...this.jsonErrors,
        [index]: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private commitCode(index: number, code: string) {
    const validation = services.jsRunnerService.validateJs(`(() => {${code}})();`);
    this.codeErrors = {
      ...this.codeErrors,
      [index]: validation.valide ? '' : (validation.error?.message ?? 'Invalid code'),
    };
    this.updateRule(index, { code });
  }

  private updateEffect(ruleIndex: number, effectIndex: number, effect: Effect) {
    const rule = this.rules()[ruleIndex];
    const effects = (rule.effects ?? []).map((current, i) =>
      i === effectIndex ? effect : current
    );
    this.updateRule(ruleIndex, { effects });
  }

  private addEffect(ruleIndex: number) {
    const rule = this.rules()[ruleIndex];
    this.updateRule(ruleIndex, {
      effects: [
        ...(rule.effects ?? []),
        { property: { target: 'hidden', type: 'boolean' }, boolean: true },
      ],
    });
  }

  private removeEffect(ruleIndex: number, effectIndex: number) {
    const rule = this.rules()[ruleIndex];
    this.updateRule(ruleIndex, {
      effects: (rule.effects ?? []).filter((_, i) => i !== effectIndex),
    });
  }

  private renderCondition(index: number, rule: Rule) {
    const condition = parseLogic(rule.logic) ?? {
      field: this.fields[0] ?? '',
      operator: 'equals' as OperatorId,
      value: '',
    };
    const needsValue =
      condition.operator !== 'isEmpty' && condition.operator !== 'isNotEmpty';

    return (
      <div class="fk-rule__condition">
        <span class="fk-rule__keyword">When</span>
        <select
          class="fk-rule__control"
          onChange={(event) =>
            this.updateCondition(index, rule, {
              field: (event.target as HTMLSelectElement).value,
            })
          }
        >
          {this.fields.map((field) => (
            <option value={field} selected={field === condition.field}>
              {field}
            </option>
          ))}
        </select>
        <select
          class="fk-rule__control"
          onChange={(event) =>
            this.updateCondition(index, rule, {
              operator: (event.target as HTMLSelectElement).value as OperatorId,
            })
          }
        >
          {OPERATORS.map((operator) => (
            <option value={operator.id} selected={operator.id === condition.operator}>
              {operator.label}
            </option>
          ))}
        </select>
        {needsValue ? (
          <input
            class="fk-rule__control"
            type="text"
            value={formatValue(condition.value)}
            onChange={(event) =>
              this.updateCondition(index, rule, {
                value: parseValueInput((event.target as HTMLInputElement).value),
              })
            }
          />
        ) : null}
      </div>
    );
  }

  private renderEffect(ruleIndex: number, effect: Effect, effectIndex: number) {
    const target = effect.property?.target ?? 'hidden';
    const type = effect.property?.type ?? 'boolean';

    return (
      <div class="fk-rule__effect">
        <select
          class="fk-rule__control"
          onChange={(event) =>
            this.updateEffect(ruleIndex, effectIndex, {
              ...effect,
              property: {
                target: (event.target as HTMLSelectElement).value,
                type: type as 'boolean' | 'string',
              },
            })
          }
        >
          {EFFECT_TARGETS.map((candidate) => (
            <option value={candidate} selected={candidate === target}>
              {candidate}
            </option>
          ))}
        </select>
        <select
          class="fk-rule__control"
          onChange={(event) => {
            const nextType = (event.target as HTMLSelectElement).value as
              | 'boolean'
              | 'string';
            this.updateEffect(ruleIndex, effectIndex, {
              property: { target, type: nextType },
              ...(nextType === 'boolean' ? { boolean: true } : { string: '' }),
            });
          }}
        >
          <option value="boolean" selected={type === 'boolean'}>
            boolean
          </option>
          <option value="string" selected={type === 'string'}>
            string
          </option>
        </select>
        {type === 'boolean' ? (
          <select
            class="fk-rule__control"
            onChange={(event) =>
              this.updateEffect(ruleIndex, effectIndex, {
                ...effect,
                boolean: (event.target as HTMLSelectElement).value === 'true',
              })
            }
          >
            <option value="true" selected={effect.boolean !== false}>
              true
            </option>
            <option value="false" selected={effect.boolean === false}>
              false
            </option>
          </select>
        ) : (
          <input
            class="fk-rule__control"
            type="text"
            value={effect.string ?? ''}
            onChange={(event) =>
              this.updateEffect(ruleIndex, effectIndex, {
                ...effect,
                string: (event.target as HTMLInputElement).value,
              })
            }
          />
        )}
        <button
          type="button"
          class="fk-rule__remove"
          title="Remove effect"
          onClick={() => this.removeEffect(ruleIndex, effectIndex)}
        >
          ✕
        </button>
      </div>
    );
  }

  render() {
    return (
      <div class="fk-rules">
        {this.rules().map((rule, index) => {
          const mode = this.modeOf(index, rule);

          return (
            <article class="fk-rule">
              <header class="fk-rule__header">
                <input
                  class="fk-rule__name"
                  type="text"
                  value={rule.name}
                  onChange={(event) =>
                    this.updateRule(index, {
                      name: (event.target as HTMLInputElement).value,
                    })
                  }
                />
                <button
                  type="button"
                  class="fk-rule__remove"
                  title="Remove rule"
                  onClick={() => this.removeRule(index)}
                >
                  ✕
                </button>
              </header>

              <div class="fk-rule__modes">
                {(['simple', 'json', 'javaScript'] as RuleMode[]).map((candidate) => (
                  <button
                    type="button"
                    class={{
                      'fk-rule__mode': true,
                      'fk-rule__mode--active': mode === candidate,
                    }}
                    onClick={() => this.setMode(index, rule, candidate)}
                  >
                    {candidate === 'javaScript' ? 'JS' : candidate}
                  </button>
                ))}
              </div>

              {mode === 'simple' ? this.renderCondition(index, rule) : null}

              {mode === 'json' ? (
                <div class="fk-rule__advanced">
                  <textarea
                    class="fk-rule__code"
                    onChange={(event) =>
                      this.commitJson(index, (event.target as HTMLTextAreaElement).value)
                    }
                  >
                    {JSON.stringify(rule.logic ?? null, null, 2)}
                  </textarea>
                  {this.jsonErrors[index] ? (
                    <p class="fk-rule__error">{this.jsonErrors[index]}</p>
                  ) : null}
                </div>
              ) : null}

              {mode === 'javaScript' ? (
                <div class="fk-rule__advanced">
                  <textarea
                    class="fk-rule__code"
                    placeholder="return dataMap.country === 'BJ';"
                    onChange={(event) =>
                      this.commitCode(index, (event.target as HTMLTextAreaElement).value)
                    }
                  >
                    {rule.code ?? ''}
                  </textarea>
                  {this.codeErrors[index] ? (
                    <p class="fk-rule__error">{this.codeErrors[index]}</p>
                  ) : null}
                </div>
              ) : null}

              <div class="fk-rule__effects">
                <span class="fk-rule__keyword">Then</span>
                {(rule.effects ?? []).map((effect, effectIndex) =>
                  this.renderEffect(index, effect, effectIndex)
                )}
                <button
                  type="button"
                  class="fk-rule__add"
                  onClick={() => this.addEffect(index)}
                >
                  + Effect
                </button>
              </div>
            </article>
          );
        })}

        <button type="button" class="fk-rule__add" onClick={this.addRule}>
          + Add rule
        </button>
      </div>
    );
  }
}
