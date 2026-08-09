import { Children, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { fkT, resolveLocalizedText } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'
import { stepKeys, stepValid } from './stepper-logic'

function StepperControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [active, setActive] = useState(0)

  const stepSpecs = props.spec.children ?? []
  const steps = Children.toArray(props.children)
  const last = Math.max(steps.length - 1, 0)

  const labels = stepSpecs.map((child, index) => {
    const resolved = resolveLocalizedText(child.configs?.label, props.locale)
    return typeof resolved === 'string' ? resolved : (child.name ?? `Step ${index + 1}`)
  })

  const config = (name: string, fallback: boolean): boolean => {
    const raw = props.spec.configs?.[name]
    return typeof raw === 'boolean' ? raw : fallback
  }

  const gate = (index: number): boolean => {
    if (!config('validateSteps', false)) return true
    const step = stepSpecs[index]
    if (!step || stepValid(step, index, props.dataMap, props.locale)) return true
    props.engine.touch(stepKeys(step))
    return false
  }

  const goToStep = (index: number) => {
    if (index <= active) return setActive(index)
    if (!config('allowStepClick', true)) return
    for (let i = active; i < index; i++) {
      if (!gate(i)) return setActive(i)
    }
    setActive(index)
  }

  const showSubmit = config('showSubmit', false) && active === last

  return (
    <View style={{ gap: theme.spacing * 1.5 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: theme.spacing }}>
          {labels.map((label, index) => {
            const current = index === active
            const done = index < active
            return (
              <Pressable
                key={`${index}-${label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                onPress={() => goToStep(index)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing / 2,
                  paddingHorizontal: theme.spacing * 1.5,
                  paddingVertical: theme.spacing,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: current ? theme.colorPrimary : theme.colorBorder,
                  backgroundColor: current ? `${theme.colorPrimary}18` : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: current || done ? theme.colorPrimary : theme.colorMuted,
                  }}
                >
                  {done ? '✓' : index + 1}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: current ? '600' : '400',
                    color: current ? theme.colorPrimary : theme.colorText,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {steps[active] ?? null}

      {steps.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing }}>
          <Pressable
            accessibilityRole="button"
            disabled={active === 0}
            onPress={() => setActive(Math.max(active - 1, 0))}
            style={{
              opacity: active === 0 ? 0.4 : 1,
              paddingHorizontal: theme.spacing * 2,
              paddingVertical: theme.spacing * 1.25,
              borderRadius: theme.radius,
              borderWidth: 1,
              borderColor: theme.colorBorder,
            }}
          >
            <Text style={{ color: theme.colorText }}>{fkT('stepper.back')}</Text>
          </Pressable>
          {active < last ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => gate(active) && setActive(Math.min(active + 1, last))}
              style={{
                paddingHorizontal: theme.spacing * 2,
                paddingVertical: theme.spacing * 1.25,
                borderRadius: theme.radius,
                backgroundColor: theme.colorPrimary,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                {fkT('stepper.next')}
              </Text>
            </Pressable>
          ) : null}
          {showSubmit ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => gate(active) && props.engine.submit()}
              style={{
                paddingHorizontal: theme.spacing * 2,
                paddingVertical: theme.spacing * 1.25,
                borderRadius: theme.radius,
                backgroundColor: theme.colorPrimary,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600' }}>
                {fkT('stepper.submit')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

export const stepperBrick: NativeBrick = createNativeBrick({
  type: 'panel',
  id: 'stepper',
  render: (props) => <StepperControl {...props} />,
})
