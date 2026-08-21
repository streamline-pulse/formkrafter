import { Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { fkT } from '@streamline-pulse/formkrafter-core'
import { useFkTheme } from '../theme.js'

export function Field(props: {
  label?: unknown
  error?: string
  required?: boolean
  inline?: boolean
  children: ReactNode
}) {
  const theme = useFkTheme()
  const label =
    props.label === undefined || props.label === '' ? undefined : String(props.label)

  return (
    <View
      style={
        props.inline
          ? {
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing,
            }
          : { gap: theme.spacing / 2 }
      }
    >
      {label ? (
        <Text
          accessibilityLabel={
            props.required ? `${label} ${fkT('field.required')}` : undefined
          }
          style={{ fontSize: 14, fontWeight: '500', color: theme.colorText }}
        >
          {label}
          {props.required ? (
            <Text style={{ color: theme.colorDanger }}> *</Text>
          ) : null}
        </Text>
      ) : null}
      {props.children}
      {props.error ? (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: 12, color: theme.colorDanger }}
        >
          {props.error}
        </Text>
      ) : null}
    </View>
  )
}
