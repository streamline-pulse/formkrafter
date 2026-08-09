import { Pressable, Text, View } from 'react-native'
import { normalizeOptions } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

function SelectBoxesControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const selected = Array.isArray(props.data) ? (props.data as string[]) : []
  const options = normalizeOptions(
    props.configs.options,
    typeof props.configs.labelKey === 'string' ? props.configs.labelKey : 'label',
    typeof props.configs.valueKey === 'string' ? props.configs.valueKey : 'value',
  )

  return (
    <Field label={props.configs.label} error={props.error}>
      <View style={{ gap: theme.spacing / 2 }}>
        {options.map((option) => {
          const checked = selected.includes(option.value)
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked, disabled: props.disabled }}
              disabled={props.disabled}
              onPress={() =>
                props.onDataChange(
                  checked
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value],
                )
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing,
                paddingVertical: theme.spacing / 2,
                opacity: props.disabled ? 0.6 : 1,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: checked ? theme.colorPrimary : theme.colorBorder,
                  backgroundColor: checked ? theme.colorPrimary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked ? (
                  <Text style={{ color: theme.colorSurface, fontSize: 13, fontWeight: '700' }}>✓</Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 15, color: theme.colorText, flexShrink: 1 }}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </Field>
  )
}

export const selectBoxesBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'select-boxes',
  render: (props) => <SelectBoxesControl {...props} />,
})
