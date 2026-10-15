import { Text, TextInput, View } from 'react-native'
import { fkT, parseMrz } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

const inputStyle = (theme: ReturnType<typeof useFkTheme>, error?: string) => ({
  borderWidth: 1,
  borderColor: error ? theme.colorDanger : theme.colorBorder,
  borderRadius: theme.radius,
  paddingHorizontal: theme.spacing,
  paddingVertical: theme.spacing * 0.75,
  color: theme.colorText,
})

function NationalIdControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  return (
    <Field label={props.configs.label} error={props.error} required={props.validations?.some((v) => v.validator === 'required')}>
      <TextInput
        value={props.data === undefined || props.data === null ? '' : String(props.data)}
        editable={!props.disabled}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="characters"
        placeholder={props.configs.placeholder ? String(props.configs.placeholder) : undefined}
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) => props.onDataChange(text === '' ? undefined : text)}
        style={inputStyle(theme, props.error)}
      />
    </Field>
  )
}

type MrzValue = { raw: string; valid: boolean; errors: string[]; format?: string; documentNumber?: string; surname?: string; givenNames?: string; birthDate?: string | null; expiryDate?: string | null }

function MrzControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = props.data as MrzValue | undefined
  const parsed = value && value.format ? value : undefined
  return (
    <Field label={props.configs.label} error={props.error} required={props.validations?.some((v) => v.validator === 'required')}>
      <TextInput
        value={value?.raw ?? ''}
        editable={!props.disabled}
        multiline
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={fkT('mrz.placeholder')}
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) => {
          if (!text.trim()) return props.onDataChange(undefined)
          props.onDataChange(parseMrz(text) ?? { raw: text, valid: false, errors: ['format'] })
        }}
        style={{ ...inputStyle(theme, props.error), minHeight: 72, fontFamily: 'Menlo' }}
      />
      {value && !parsed ? <Text style={{ fontSize: 12, color: theme.colorDanger }}>{fkT('mrz.unreadable')}</Text> : null}
      {parsed ? (
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, color: theme.colorText }}>
            {parsed.surname} {parsed.givenNames} · {parsed.documentNumber}
          </Text>
          <Text style={{ fontSize: 12, color: parsed.valid ? theme.colorMuted : theme.colorDanger }}>
            {parsed.valid ? `${parsed.birthDate ?? ''} → ${parsed.expiryDate ?? ''}` : `${fkT('mrz.invalid')} ${parsed.errors.join(', ')}`}
          </Text>
        </View>
      ) : null}
    </Field>
  )
}

export const nationalIdBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'national-id', render: (props) => <NationalIdControl {...props} /> })
export const mrzBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'mrz', render: (props) => <MrzControl {...props} /> })
