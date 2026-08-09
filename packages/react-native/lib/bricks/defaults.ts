import { getNativeBrick, registerNativeBrick } from '../registry'
import { textBricks } from './text'
import { checkboxBrick } from './checkbox'
import { multiSelectBrick, selectBrick } from './select'
import { radioBrick } from './radio'
import { stepperBrick } from './stepper'
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

  const defaults = [
    ...textBricks,
    checkboxBrick,
    selectBrick,
    multiSelectBrick,
    radioBrick,
    stepperBrick,
    ...layoutBricks,
  ]
  for (const brick of defaults) {
    if (!getNativeBrick(brick.type, brick.id)) registerNativeBrick(brick)
  }
}
