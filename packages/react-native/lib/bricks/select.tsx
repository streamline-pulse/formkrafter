import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, View } from 'react-native'
import { fkT, normalizeOptions } from '@streamline-pulse/formkrafter-core'
import type { SelectOption } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'
import { Field } from './field'

/**
 * A select rendered as a full-screen sheet — there is no native <select> on
 * mobile. In multiple mode the sheet stays open and rows toggle. Static
 * options only for now; remote/catalog sources arrive with the services
 * integration.
 */
function SelectControl(props: NativeBrickProps & { multiple?: boolean }) {
  const theme = useFkTheme()
  const [open, setOpen] = useState(false)

  const options: SelectOption[] = normalizeOptions(
    props.configs.options,
    typeof props.configs.labelKey === 'string' ? props.configs.labelKey : 'label',
    typeof props.configs.valueKey === 'string' ? props.configs.valueKey : 'value',
  )
  const values = props.multiple
    ? Array.isArray(props.data)
      ? (props.data as string[])
      : []
    : []
  const selected = options.find((option) => option.value === props.data)
  const summary = props.multiple
    ? options
        .filter((option) => values.includes(option.value))
        .map((option) => option.label)
        .join(', ')
    : selected?.label

  return (
    <Field label={props.configs.label} error={props.error}>
      <Pressable
        disabled={props.disabled}
        accessibilityRole="button"
        accessibilityLabel={props.configs.label ? String(props.configs.label) : undefined}
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          backgroundColor: theme.colorSurface,
          paddingHorizontal: theme.spacing * 1.5,
          paddingVertical: theme.spacing * 1.25,
          opacity: props.disabled ? 0.6 : 1,
        }}
      >
        <Text style={{ color: summary ? theme.colorText : theme.colorMuted, fontSize: 15 }}>
          {summary || (props.configs.placeholder ? String(props.configs.placeholder) : ' ')}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: theme.colorSurface,
              borderTopLeftRadius: theme.radius * 2,
              borderTopRightRadius: theme.radius * 2,
              maxHeight: '60%',
              paddingVertical: theme.spacing,
            }}
          >
            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              ListEmptyComponent={
                <Text style={{ color: theme.colorMuted, padding: theme.spacing * 2 }}>
                  {fkT('select.empty')}
                </Text>
              }
              renderItem={({ item }) => {
                const active = props.multiple
                  ? values.includes(item.value)
                  : item.value === props.data
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      if (!props.multiple) {
                        props.onDataChange(item.value)
                        return setOpen(false)
                      }
                      props.onDataChange(
                        active
                          ? values.filter((value) => value !== item.value)
                          : [...values, item.value],
                      )
                    }}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: theme.spacing * 2,
                      paddingVertical: theme.spacing * 1.5,
                      backgroundColor: active ? `${theme.colorPrimary}22` : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: active ? theme.colorPrimary : theme.colorText,
                        fontWeight: active ? '600' : '400',
                      }}
                    >
                      {item.label}
                    </Text>
                    {props.multiple && active ? (
                      <Text style={{ color: theme.colorPrimary, fontWeight: '700' }}>✓</Text>
                    ) : null}
                  </Pressable>
                )
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </Field>
  )
}

export const selectBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'select',
  render: (props) => <SelectControl {...props} />,
})

export const multiSelectBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'multi-select',
  render: (props) => <SelectControl {...props} multiple />,
})
