import { Children, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { resolveLocalizedText } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { stepKeys, stepValid } from './stepper-logic.js'

function TabsControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [active, setActive] = useState(0)

  const paneSpecs = props.spec.children ?? []
  const panes = Children.toArray(props.children)

  const labels = paneSpecs.map((child, index) => {
    const resolved = resolveLocalizedText(child.configs?.label, props.locale)
    return typeof resolved === 'string' ? resolved : (child.name ?? `Tab ${index + 1}`)
  })

  const goToTab = (index: number) => {
    if (index === active) return
    if (props.spec.configs?.validateTabs === true) {
      const current = paneSpecs[active]
      if (current && !stepValid(current, active, props.dataMap, props.locale)) {
        props.engine.touch(stepKeys(current))
        return
      }
    }
    setActive(index)
  }

  return (
    <View style={{ gap: theme.spacing * 1.5 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme.colorBorder,
          }}
        >
          {labels.map((label, index) => {
            const current = index === active
            return (
              <Pressable
                key={`${index}-${label}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: current }}
                onPress={() => goToTab(index)}
                style={{
                  paddingHorizontal: theme.spacing * 1.5,
                  paddingVertical: theme.spacing,
                  borderBottomWidth: 2,
                  borderBottomColor: current ? theme.colorPrimary : 'transparent',
                  marginBottom: -1,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: current ? '600' : '500',
                    color: current ? theme.colorPrimary : theme.colorMuted,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {panes[active] ?? null}
    </View>
  )
}

export const tabsBrick: NativeBrick = createNativeBrick({
  type: 'panel',
  id: 'tabs',
  render: (props) => <TabsControl {...props} />,
})
