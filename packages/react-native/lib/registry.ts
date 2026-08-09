import type { ReactNode } from 'react'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import type { FormEngine } from './engine/form-engine.js'

export interface NativeBrickProps {
  spec: BrickSpec
  /** Configs with localized text already resolved for the current locale. */
  configs: Record<string, unknown>
  data: unknown
  dataMap: Record<string, unknown>
  error?: string
  disabled: boolean
  locale?: string
  engine: FormEngine
  children?: ReactNode
  onDataChange: (value: unknown) => void
}

export interface NativeBrick {
  type: string
  id: string
  render: (props: NativeBrickProps) => ReactNode
}

export const createNativeBrick = (brick: NativeBrick): NativeBrick => brick

// Same global-singleton pattern as the wc registry: the store survives the
// package being bundled more than once.
const REGISTRY_KEY = Symbol.for('formkrafter.native.registry')
const globalStore = globalThis as unknown as Record<
  symbol,
  Map<string, NativeBrick> | undefined
>
const registry = (globalStore[REGISTRY_KEY] ??= new Map())

const keyOf = (type: string, id: string): string => `${type}:${id}`

export function registerNativeBrick(brick: NativeBrick): void {
  registry.set(keyOf(brick.type, brick.id), brick)
}

export function registerNativeBricks(bricks: NativeBrick[]): void {
  for (const brick of bricks) registerNativeBrick(brick)
}

export function getNativeBrick(type: string, id: string): NativeBrick | undefined {
  return registry.get(keyOf(type, id))
}
