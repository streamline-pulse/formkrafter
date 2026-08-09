import { registerNativeBricks } from '../registry'
import { textBricks } from './text'
import { checkboxBrick } from './checkbox'
import { selectBrick } from './select'
import { layoutBricks } from './layout'

// Same idempotency pattern as the wc registry — registering must never
// clobber bricks an application registered before the first render.
const DEFAULTS_KEY = Symbol.for('formkrafter.native.defaultBricksRegistered')
const globalFlags = globalThis as unknown as Record<symbol, boolean | undefined>

export function registerDefaultNativeBricks(): void {
  if (globalFlags[DEFAULTS_KEY]) return
  globalFlags[DEFAULTS_KEY] = true

  registerNativeBricks([...textBricks, checkboxBrick, selectBrick, ...layoutBricks])
}
