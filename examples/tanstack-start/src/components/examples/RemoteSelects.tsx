import FormDemo from './FormDemo'
import { remoteSpec } from '#/examples/specs'

export default function RemoteSelects() {
  return <FormDemo spec={remoteSpec} showValidate={false} />
}
