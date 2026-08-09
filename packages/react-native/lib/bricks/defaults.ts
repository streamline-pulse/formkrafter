import { getNativeBrick, registerNativeBrick } from '../registry'
import { textBricks } from './text'
import { checkboxBrick } from './checkbox'
import { selectBrick } from './select'
import { layoutBricks } from './layout'

const DEFAULTS_KEY = Symbol.for('formkrafter.native.defaultBricksRegistered')
const globalFlags = globalThis as unknown as Record<symbol, boolean | undefined>

/**
 * Registered lazily by FormRenderer. A default must never clobber anything:
 * an application that registered its own `input:text` — a gluestack or
 * NativeBase skin, say — before the first render keeps it, regardless of
 * registration order.
 */
export function registerDefaultNativeBricks(): void {
  if (globalFlags[DEFAULTS_KEY]) return
  globalFlags[DEFAULTS_KEY] = true

  for (const brick of [...textBricks, checkboxBrick, selectBrick, ...layoutBricks]) {
    if (!getNativeBrick(brick.type, brick.id)) registerNativeBrick(brick)
  }
}
