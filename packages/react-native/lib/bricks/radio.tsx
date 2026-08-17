import { Pressable, Text, View } from 'react-native'
import { normalizeOptions } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

function RadioControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const options = normalizeOptions(
    props.configs.options,
    typeof props.configs.labelKey === 'string' ? props.configs.labelKey : 'label',
    typeof props.configs.valueKey === 'string' ? props.configs.valueKey : 'value',
  )

  return (
    <Field label={props.configs.label} error={props.error}
      required={props.validations?.some((v) => v.validator === 'required')}>
      <View accessibilityRole="radiogroup" style={{ gap: theme.spacing / 2 }}>
        {options.map((option) => {
          const checked = option.value === props.data
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked, disabled: props.disabled }}
              disabled={props.disabled}
              onPress={() => props.onDataChange(option.value)}
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
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: checked ? theme.colorPrimary : theme.colorBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: theme.colorPrimary,
                    }}
                  />
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

export const radioBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'radio',
  render: (props) => <RadioControl {...props} />,
})
