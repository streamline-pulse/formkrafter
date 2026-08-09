import { Switch, Text, View } from 'react-native'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

function CheckboxControl(props: {
  label?: unknown
  value: boolean
  disabled: boolean
  error?: string
  onChange: (value: boolean) => void
}) {
  const theme = useFkTheme()

  return (
    <Field error={props.error}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing }}>
        <Switch
          value={props.value}
          disabled={props.disabled}
          onValueChange={props.onChange}
          accessibilityLabel={props.label ? String(props.label) : undefined}
          trackColor={{ true: theme.colorPrimary }}
        />
        {props.label !== undefined && props.label !== '' ? (
          <Text style={{ fontSize: 15, color: theme.colorText, flexShrink: 1 }}>
            {String(props.label)}
          </Text>
        ) : null}
      </View>
    </Field>
  )
}

export const checkboxBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'checkbox',
  render: (props) => (
    <CheckboxControl
      label={props.configs.label}
      value={props.data === true}
      disabled={props.disabled}
      error={props.error}
      onChange={props.onDataChange}
    />
  ),
})
