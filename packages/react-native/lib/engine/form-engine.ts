import {
  expandSpec,
  getAffectedProperties,
  hasNestedForms,
  iterateBricks,
  validateBrickSpecDataDetailed,
} from '@streamline-pulse/formkrafter-core'
import type {
  BrickSpec,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core'

export interface FormEngineSnapshot {
  data: Record<string, unknown>
  errors: Record<string, string>
  spec: BrickSpec
  expanding: boolean
  expandError?: string
}

export interface FormEngineCallbacks {
  onDataChange?: (
    data: Record<string, unknown>,
    isValid: boolean,
    errors: Record<string, string>,
  ) => void
  onSubmit?: (
    data: Record<string, unknown>,
    isValid: boolean,
    errors: Record<string, string>,
  ) => void
}

export interface FormEngineOptions extends FormEngineCallbacks {
  spec: BrickSpec
  data?: Record<string, unknown>
  locale?: string
}

/**
 * The renderer's brain, ported from fk-form-render: data state, touched
 * tracking, nested-form expansion, value effects from rules, and validation.
 * It is a plain class with a subscribe/snapshot surface so React consumes it
 * through useSyncExternalStore and tests consume it with no framework at all.
 */
export class FormEngine {
  callbacks: FormEngineCallbacks

  private spec: BrickSpec
  private locale?: string
  private data: Record<string, unknown>
  private touched: Record<string, boolean> = {}
  private expandedSpec?: BrickSpec
  private expanding = false
  private expandError?: string

  private listeners = new Set<() => void>()
  private snapshot!: FormEngineSnapshot

  constructor(options: FormEngineOptions) {
    this.spec = options.spec
    this.locale = options.locale
    this.data = { ...options.data }
    this.callbacks = { onDataChange: options.onDataChange, onSubmit: options.onSubmit }
    this.rebuildSnapshot()
    void this.runExpansion()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): FormEngineSnapshot => this.snapshot

  setSpec(spec: BrickSpec): void {
    if (spec === this.spec) return
    this.spec = spec
    this.notify()
    void this.runExpansion()
  }

  setLocale(locale?: string): void {
    if (locale === this.locale) return
    this.locale = locale
    this.notify()
  }

  setData(data?: Record<string, unknown>): void {
    this.data = { ...data }
    this.notify()
  }

  /** A brick reported a value; mirrors the brickDataChange path. */
  setValues(partial: Record<string, unknown>): void {
    this.data = this.applyValueEffects({ ...this.data, ...partial })
    for (const key of Object.keys(partial)) this.touched[key] = true

    const { valid, errors } = this.runValidation()
    this.notify()
    this.callbacks.onDataChange?.(this.publicData(), valid, errors)
  }

  touch(keys: string[]): void {
    for (const key of keys) this.touched[key] = true
    this.notify()
  }

  /** Touches every key so all errors become visible, then validates. */
  validate(): ValidationResult {
    for (const { brick } of iterateBricks(this.effectiveSpec())) {
      const key = brick.configs?.key
      if (key) this.touched[key] = true
    }

    const result = this.runValidation()
    this.notify()
    this.callbacks.onDataChange?.(this.publicData(), result.valid, result.errors)
    return result
  }

  submit(): ValidationResult {
    const result = this.validate()
    this.callbacks.onSubmit?.(this.publicData(), result.valid, result.errors)
    return result
  }

  effectiveSpec(): BrickSpec {
    return this.expandedSpec ?? this.spec
  }

  publicData(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.data).filter(([key]) => !key.startsWith('_')),
    )
  }

  currentLocale(): string | undefined {
    return this.locale
  }

  private async runExpansion(): Promise<void> {
    this.expandError = undefined

    if (!hasNestedForms(this.spec)) {
      this.expandedSpec = undefined
      this.notify()
      return
    }

    const source = this.spec
    this.expanding = true
    this.notify()

    try {
      const expanded = await expandSpec(source)
      if (this.spec === source) this.expandedSpec = expanded
    } catch (error) {
      if (this.spec === source) {
        this.expandedSpec = undefined
        this.expandError = error instanceof Error ? error.message : String(error)
      }
    } finally {
      if (this.spec === source) {
        this.expanding = false
        this.notify()
      }
    }
  }

  private applyValueEffects(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    let result = data

    for (const { brick } of iterateBricks(this.effectiveSpec())) {
      const key = brick.configs?.key
      if (!key || !brick.rules?.length) continue

      const affected = getAffectedProperties(brick.rules, result)
      if (affected.value !== undefined && result[key] !== affected.value) {
        result = { ...result, [key]: affected.value }
      }
    }

    return result
  }

  private runValidation(): ValidationResult {
    const presentData = Object.fromEntries(
      Object.entries(this.data).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined,
      ),
    )

    return validateBrickSpecDataDetailed(this.effectiveSpec(), presentData, this.locale)
  }

  private visibleErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const [key, message] of Object.entries(this.runValidation().errors)) {
      if (this.touched[key]) errors[key] = message
    }
    return errors
  }

  private rebuildSnapshot(): void {
    this.snapshot = {
      data: this.data,
      errors: this.visibleErrors(),
      spec: this.effectiveSpec(),
      expanding: this.expanding,
      expandError: this.expandError,
    }
  }

  private notify(): void {
    this.rebuildSnapshot()
    for (const listener of this.listeners) listener()
  }
}
