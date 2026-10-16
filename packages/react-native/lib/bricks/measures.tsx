import { Pressable, Text, TextInput, View } from 'react-native'
import { fkT, measureFamilyOf, measureUnits, measureValue } from '@streamline-pulse/formkrafter-core'
import type { MeasureValue } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

const required = (props: NativeBrickProps) => props.validations?.some((v) => v.validator === 'required')

// Mesure : nombre + unite choisie parmi celles de la famille ; la valeur garde l'equivalent en unite de base.
function MeasureControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const family = measureFamilyOf(props.configs.family)
  const units = measureUnits(family, props.configs.units)
  const value = props.data as MeasureValue | undefined
  const fallback = typeof props.configs.unit === 'string' && units.some((u) => u.id === props.configs.unit) ? String(props.configs.unit) : units[0].id
  const unit = value?.unit && units.some((u) => u.id === value.unit) ? value.unit : fallback
  const emit = (raw: string, nextUnit: string) => {
    if (raw.trim() === '') return props.onDataChange(undefined)
    const number = Number(raw.replace(',', '.'))
    if (Number.isNaN(number)) return
    props.onDataChange(measureValue(family, number, nextUnit))
  }
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <View style={{ flexDirection: 'row', gap: theme.spacing, alignItems: 'center' }}>
        <TextInput
          value={value?.value === undefined ? '' : String(value.value)}
          editable={!props.disabled}
          keyboardType="decimal-pad"
          placeholder={props.configs.placeholder ? String(props.configs.placeholder) : fkT('measure.value')}
          placeholderTextColor={theme.colorMuted}
          onChangeText={(text) => emit(text, unit)}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: props.error ? theme.colorDanger : theme.colorBorder,
            borderRadius: theme.radius,
            paddingHorizontal: theme.spacing,
            paddingVertical: theme.spacing * 0.75,
            color: theme.colorText,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {units.map((item) => (
            <Pressable
              key={item.id}
              disabled={props.disabled}
              onPress={() => (value ? props.onDataChange(measureValue(family, value.value, item.id)) : undefined)}
              style={{
                borderWidth: 1,
                borderColor: item.id === unit ? theme.colorPrimary : theme.colorBorder,
                backgroundColor: item.id === unit ? theme.colorPrimary : 'transparent',
                borderRadius: theme.radius,
                paddingHorizontal: theme.spacing * 0.75,
                paddingVertical: theme.spacing * 0.5,
              }}
            >
              <Text style={{ fontSize: 13, color: item.id === unit ? '#fff' : theme.colorText }}>{item.symbol}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Field>
  )
}

export const measureBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'measure', render: (props) => <MeasureControl {...props} /> })
