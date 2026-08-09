import { Text, View } from 'react-native'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'

function Column(props: NativeBrickProps) {
  const theme = useFkTheme()
  return <View style={{ gap: theme.spacing }}>{props.children}</View>
}

function Row(props: NativeBrickProps) {
  const theme = useFkTheme()
  // Phone screens are too narrow for real columns; the row keeps its
  // children side by side but lets them wrap.
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing }}>
      {props.children}
    </View>
  )
}

function Group(props: NativeBrickProps) {
  const theme = useFkTheme()
  const label = props.configs.label ?? props.configs.legend

  return (
    <View
      style={{
        gap: theme.spacing,
        padding: theme.spacing * 1.5,
        borderWidth: 1,
        borderColor: theme.colorBorder,
        borderRadius: theme.radius,
      }}
    >
      {label !== undefined && label !== '' ? (
        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colorMuted }}>
          {String(label)}
        </Text>
      ) : null}
      {props.children}
    </View>
  )
}

export const layoutBricks: NativeBrick[] = [
  createNativeBrick({ type: 'panel', id: 'column', render: (props) => <Column {...props} /> }),
  createNativeBrick({ type: 'panel', id: 'row', render: (props) => <Row {...props} /> }),
  createNativeBrick({ type: 'panel', id: 'group', render: (props) => <Group {...props} /> }),
]
