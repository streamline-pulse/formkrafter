import { Text, TextInput, View } from 'react-native'
import { fkT } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'
import { Field } from './field'

const ADDRESS_PARTS = [
  { key: 'street', label: () => fkT('address.street'), full: true },
  { key: 'city', label: () => fkT('address.city'), full: false },
  { key: 'zip', label: () => fkT('address.zip'), full: false },
  { key: 'country', label: () => fkT('address.country'), full: false },
]

function AddressControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = (props.data ?? {}) as Record<string, unknown>

  return (
    <Field label={props.configs.label} error={props.error}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing }}>
        {ADDRESS_PARTS.map((part) => (
          <View
            key={part.key}
            style={{
              gap: 4,
              flexBasis: part.full ? '100%' : '30%',
              flexGrow: 1,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colorMuted }}>
              {part.label()}
            </Text>
            <TextInput
              value={typeof value[part.key] === 'string' ? (value[part.key] as string) : ''}
              editable={!props.disabled}
              accessibilityLabel={part.label()}
              onChangeText={(text) =>
                props.onDataChange({ ...value, [part.key]: text })
              }
              style={{
                borderWidth: 1,
                borderColor: theme.colorBorder,
                borderRadius: theme.radius,
                backgroundColor: theme.colorSurface,
                color: theme.colorText,
                paddingHorizontal: theme.spacing,
                paddingVertical: theme.spacing * 0.75,
                fontSize: 15,
              }}
            />
          </View>
        ))}
      </View>
    </Field>
  )
}

export const addressBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'address',
  render: (props) => <AddressControl {...props} />,
})
