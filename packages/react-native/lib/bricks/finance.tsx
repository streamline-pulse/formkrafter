import { Text, TextInput, View } from 'react-native'
import { fkT, formatIban } from '@streamline-pulse/formkrafter-core'
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

const required = (props: NativeBrickProps) => props.validations?.some((v) => v.validator === 'required')

function TextControl(props: NativeBrickProps & { numeric?: boolean; upper?: boolean; onBlurFormat?: (value: string) => string }) {
  const theme = useFkTheme()
  const value = props.data === undefined || props.data === null ? '' : String(props.data)
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <TextInput
        value={value}
        editable={!props.disabled}
        keyboardType={props.numeric ? 'numbers-and-punctuation' : 'default'}
        autoCapitalize={props.upper ? 'characters' : 'none'}
        autoCorrect={false}
        placeholder={props.configs.placeholder ? String(props.configs.placeholder) : undefined}
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) => props.onDataChange(text === '' ? undefined : props.upper ? text.toUpperCase() : text)}
        onBlur={() => {
          if (props.onBlurFormat && value) props.onDataChange(props.onBlurFormat(value))
        }}
        style={inputStyle(theme, props.error)}
      />
    </Field>
  )
}

type MoneyValue = { amount: number; currency: string }

function MoneyControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = props.data as MoneyValue | undefined
  const raw = props.configs.currencies
  const currencies = (typeof raw === 'string' ? raw.split(',') : []).map((c) => c.trim().toUpperCase()).filter(Boolean)
  const fallback = typeof props.configs.currency === 'string' && props.configs.currency ? props.configs.currency.toUpperCase() : (currencies[0] ?? 'XOF')
  const currency = value?.currency ?? fallback
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <View style={{ flexDirection: 'row', gap: theme.spacing }}>
        <TextInput
          value={value ? String(value.amount) : ''}
          editable={!props.disabled}
          keyboardType="decimal-pad"
          placeholder={fkT('money.amount')}
          placeholderTextColor={theme.colorMuted}
          onChangeText={(text) => {
            if (text === '') return props.onDataChange(undefined)
            const amount = Number(text)
            if (!Number.isNaN(amount)) props.onDataChange({ amount, currency })
          }}
          style={{ ...inputStyle(theme, props.error), flex: 1 }}
        />
        <TextInput
          value={currency}
          editable={!props.disabled}
          autoCapitalize="characters"
          placeholder={fkT('money.currency')}
          placeholderTextColor={theme.colorMuted}
          onChangeText={(text) => {
            if (value) props.onDataChange({ ...value, currency: text.toUpperCase() })
          }}
          style={{ ...inputStyle(theme, props.error), width: 80 }}
        />
      </View>
      {currencies.length > 1 ? (
        <Text style={{ fontSize: 12, color: theme.colorMuted }}>{currencies.join(' · ')}</Text>
      ) : null}
    </Field>
  )
}

export const taxIdBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'tax-id', render: (props) => <TextControl {...props} numeric /> })
export const ibanBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'iban', render: (props) => <TextControl {...props} upper onBlurFormat={formatIban} /> })
export const moneyBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'money', render: (props) => <MoneyControl {...props} /> })
