import { Children, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
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
    <View style={{ gap: theme.spacing * 2 }}>
      {/* Numbered circles joined by connector lines; done steps fill in. */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {labels.map((label, index) => {
          const current = index === active
          const done = index < active
          return (
            <View key={`${index}-${label}`} style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'stretch',
                }}
              >
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor:
                      index === 0
                        ? 'transparent'
                        : done || current
                          ? theme.colorPrimary
                          : theme.colorBorder,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: current }}
                  accessibilityLabel={label}
                  onPress={() => goToStep(index)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderColor:
                      done || current ? theme.colorPrimary : theme.colorBorder,
                    backgroundColor: done
                      ? theme.colorPrimary
                      : current
                        ? `${theme.colorPrimary}18`
                        : theme.colorSurface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: done
                        ? '#ffffff'
                        : current
                          ? theme.colorPrimary
                          : theme.colorMuted,
                    }}
                  >
                    {done ? '✓' : index + 1}
                  </Text>
                </Pressable>
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor:
                      index === labels.length - 1
                        ? 'transparent'
                        : done
                          ? theme.colorPrimary
                          : theme.colorBorder,
                  }}
                />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: current ? '700' : '500',
                  color: current ? theme.colorPrimary : theme.colorMuted,
                }}
              >
                {label}
              </Text>
            </View>
          )
        })}
      </View>

      {steps[active] ?? null}

      {steps.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing, alignItems: 'center' }}>
          {active > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setActive(Math.max(active - 1, 0))}
              style={{
                paddingHorizontal: theme.spacing * 2,
                paddingVertical: theme.spacing * 1.5,
                borderRadius: theme.radius,
                borderWidth: 1,
                borderColor: theme.colorBorder,
              }}
            >
              <Text style={{ color: theme.colorText, fontWeight: '500' }}>
                {fkT('stepper.back')}
              </Text>
            </Pressable>
          ) : null}
          {active < last ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => gate(active) && setActive(Math.min(active + 1, last))}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing * 1.5,
                borderRadius: theme.radius,
                backgroundColor: theme.colorPrimary,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                {fkT('stepper.next')}
              </Text>
            </Pressable>
          ) : null}
          {showSubmit ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => gate(active) && props.engine.submit()}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: theme.spacing * 1.5,
                borderRadius: theme.radius,
                backgroundColor: theme.colorPrimary,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
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
