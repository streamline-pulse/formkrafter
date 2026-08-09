import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, View } from 'react-native'
import { fkT, normalizeOptions } from '@streamline-pulse/formkrafter-core'
import type { SelectOption } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'
import { Field } from './field'

/**
 * A single-select rendered as a full-screen sheet — there is no native
 * <select> on mobile. Static options only for now; remote/catalog sources
 * arrive with the services integration.
 */
function SelectControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [open, setOpen] = useState(false)

  const options: SelectOption[] = normalizeOptions(
    props.configs.options,
    typeof props.configs.labelKey === 'string' ? props.configs.labelKey : 'label',
    typeof props.configs.valueKey === 'string' ? props.configs.valueKey : 'value',
  )
  const selected = options.find((option) => option.value === props.data)

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
        <Text style={{ color: selected ? theme.colorText : theme.colorMuted, fontSize: 15 }}>
          {selected?.label ?? (props.configs.placeholder ? String(props.configs.placeholder) : ' ')}
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
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    props.onDataChange(item.value)
                    setOpen(false)
                  }}
                  style={{
                    paddingHorizontal: theme.spacing * 2,
                    paddingVertical: theme.spacing * 1.5,
                    backgroundColor:
                      item.value === props.data
                        ? `${theme.colorPrimary}22`
                        : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: item.value === props.data ? theme.colorPrimary : theme.colorText,
                      fontWeight: item.value === props.data ? '600' : '400',
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
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
