import FormDemo from './FormDemo'
import { wizardSpec } from '#/examples/specs'

export default function WizardDemo() {
  return <FormDemo spec={wizardSpec} showValidate={false} />
}
