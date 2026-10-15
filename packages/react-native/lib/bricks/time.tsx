import { Text, TextInput, View } from 'react-native'
import { fkT } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

const required = (props: NativeBrickProps) => props.validations?.some((v) => v.validator === 'required')

type Picked = { id: string; start: string; end: string }

// Sans calendrier natif : le creneau choisi sur le web se lit.
function AppointmentControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = props.data as Picked | undefined
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <Text style={{ fontSize: 14, color: value ? theme.colorText : theme.colorMuted }}>
        {value ? `${value.start.slice(0, 10)} · ${value.start.slice(11, 16)}–${value.end.slice(11, 16)}` : fkT('slots.none')}
      </Text>
    </Field>
  )
}

type Range = { from?: string; to?: string }

function DateRangeControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = (props.data ?? {}) as Range
  const update = (patch: Range) => {
    const next = { ...value, ...patch }
    props.onDataChange(!next.from && !next.to ? undefined : next)
  }
  const input = (key: 'from' | 'to', label: string) => (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 12, color: theme.colorMuted }}>{label}</Text>
      <TextInput
        value={value[key] ?? ''}
        editable={!props.disabled}
        placeholder="AAAA-MM-JJ"
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) => update({ [key]: text || undefined })}
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          paddingHorizontal: theme.spacing,
          paddingVertical: theme.spacing * 0.75,
          color: theme.colorText,
        }}
      />
    </View>
  )
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <View style={{ flexDirection: 'row', gap: theme.spacing }}>
        {input('from', fkT('range.from'))}
        {input('to', fkT('range.to'))}
      </View>
    </Field>
  )
}

export const appointmentBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'appointment', render: (props) => <AppointmentControl {...props} /> })
export const dateRangeBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'date-range', render: (props) => <DateRangeControl {...props} /> })
