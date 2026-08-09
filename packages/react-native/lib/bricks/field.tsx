import { Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { useFkTheme } from '../theme.js'

/** The native counterpart of the web build's .fk-field wrapper. */
export function Field(props: {
  label?: unknown
  error?: string
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
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colorText }}>
          {label}
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
