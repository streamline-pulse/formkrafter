import { getNativeBrick, registerNativeBrick } from '../registry.js'
import { textBricks } from './text.js'
import { checkboxBrick } from './checkbox.js'
import { multiSelectBrick, selectBrick } from './select.js'
import { radioBrick } from './radio.js'
import { selectBoxesBrick } from './select-boxes.js'
import { tagsBrick } from './tags.js'
import { addressBrick } from './address.js'
import { stepperBrick } from './stepper.js'
import { tabsBrick } from './tabs.js'
import { contentBrick, hiddenBrick, recapBrick } from './output.js'
import { dataGridBrick } from './data-grid.js'
import { layoutBricks } from './layout.js'

const DEFAULTS_KEY = Symbol.for('formkrafter.native.defaultBricksRegistered')
const globalFlags = globalThis as unknown as Record<symbol, boolean | undefined>

export function registerDefaultNativeBricks(): void {
  if (globalFlags[DEFAULTS_KEY]) return
  globalFlags[DEFAULTS_KEY] = true

  const defaults = [
    ...textBricks,
    checkboxBrick,
    selectBrick,
    multiSelectBrick,
    radioBrick,
    selectBoxesBrick,
    tagsBrick,
    addressBrick,
    stepperBrick,
    tabsBrick,
    contentBrick,
    hiddenBrick,
    recapBrick,
    dataGridBrick,
    ...layoutBricks,
  ]
  for (const brick of defaults) {
    if (!getNativeBrick(brick.type, brick.id)) registerNativeBrick(brick)
  }
}
