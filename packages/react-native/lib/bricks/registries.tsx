import { TextInput } from 'react-native'
import { formatCompanyRegistry, formatPlate } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

const required = (props: NativeBrickProps) => props.validations?.some((v) => v.validator === 'required')

// Immatriculation et registre d'entreprise : texte en majuscules, mis en forme a la sortie du champ.
function RegistryControl(props: NativeBrickProps & { format: (raw: string) => string }) {
  const theme = useFkTheme()
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <TextInput
        value={props.data === undefined || props.data === null ? '' : String(props.data)}
        editable={!props.disabled}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={props.configs.placeholder ? String(props.configs.placeholder) : undefined}
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) => props.onDataChange(text === '' ? undefined : text.toUpperCase())}
        onBlur={() => {
          const raw = props.data
          if (typeof raw === 'string' && raw.trim()) props.onDataChange(props.format(raw))
        }}
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          paddingHorizontal: theme.spacing,
          paddingVertical: theme.spacing * 0.75,
          color: theme.colorText,
        }}
      />
    </Field>
  )
}

export const vehiclePlateBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'vehicle-plate',
  render: (props) => <RegistryControl {...props} format={(raw) => formatPlate(String(props.configs.plateFormat ?? 'generic'), raw)} />,
})

export const companyRegistryBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'company-registry',
  render: (props) => <RegistryControl {...props} format={(raw) => formatCompanyRegistry(String(props.configs.registryFormat ?? 'generic'), raw)} />,
})
