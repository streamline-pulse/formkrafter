import { TextInput } from 'react-native'
import type { KeyboardTypeOptions } from 'react-native'
import { createNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'
import { Field } from './field'

function TextControl(props: NativeBrickProps & {
  keyboardType?: KeyboardTypeOptions
  secure?: boolean
  multiline?: boolean
  numeric?: boolean
}) {
  const theme = useFkTheme()

  return (
    <Field label={props.configs.label} error={props.error}>
      <TextInput
        value={props.data === undefined || props.data === null ? '' : String(props.data)}
        editable={!props.disabled}
        placeholder={props.configs.placeholder ? String(props.configs.placeholder) : undefined}
        placeholderTextColor={theme.colorMuted}
        keyboardType={props.keyboardType}
        secureTextEntry={props.secure}
        multiline={props.multiline}
        accessibilityLabel={props.configs.label ? String(props.configs.label) : undefined}
        onChangeText={(text) => {
          if (!props.numeric) return props.onDataChange(text)
          if (text === '') return props.onDataChange(undefined)
          const parsed = Number(text)
          props.onDataChange(Number.isNaN(parsed) ? text : parsed)
        }}
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          backgroundColor: theme.colorSurface,
          color: theme.colorText,
          paddingHorizontal: theme.spacing * 1.5,
          paddingVertical: theme.spacing,
          fontSize: 15,
          minHeight: props.multiline ? 72 : undefined,
          opacity: props.disabled ? 0.6 : 1,
        }}
      />
    </Field>
  )
}

const variant = (
  id: string,
  extra: {
    keyboardType?: KeyboardTypeOptions
    secure?: boolean
    multiline?: boolean
    numeric?: boolean
  } = {},
): NativeBrick =>
  createNativeBrick({
    type: 'input',
    id,
    render: (props) => <TextControl {...props} {...extra} />,
  })

export const textBricks: NativeBrick[] = [
  variant('text'),
  variant('email', { keyboardType: 'email-address' }),
  variant('password', { secure: true }),
  variant('url', { keyboardType: 'url' }),
  variant('phone', { keyboardType: 'phone-pad' }),
  variant('textarea', { multiline: true }),
  variant('number', { keyboardType: 'numeric', numeric: true }),
]
