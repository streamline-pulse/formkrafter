import { Text, View } from 'react-native'
import { collectRecapItems } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'

function ContentControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  return (
    <View>
      {String(props.configs.content ?? '')
        .split('\n')
        .map((line, index) => (
          <Text
            key={index}
            style={{ fontSize: 15, lineHeight: 22, color: theme.colorText }}
          >
            {line}
          </Text>
        ))}
    </View>
  )
}

/**
 * The recap walks the root spec through core's collectRecapItems — the same
 * summarization as the web brick. Collections render as stacked cards
 * rather than tables: phone screens have no width for columns.
 */
function RecapControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const items = collectRecapItems(
    props.engine.effectiveSpec(),
    props.dataMap,
    props.locale,
    props.configs.showEmpty === true,
    props.configs.groupBySections === true,
  )

  if (!items.length) {
    return <Text style={{ color: theme.colorMuted }}>—</Text>
  }

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colorBorder,
        borderRadius: theme.radius,
        padding: theme.spacing * 1.5,
        gap: theme.spacing,
      }}
    >
      {items.map((item, index) => {
        if (item.kind === 'section') {
          return (
            <Text
              key={`s-${index}`}
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: theme.colorMuted,
                marginTop: index === 0 ? 0 : theme.spacing / 2,
              }}
            >
              {item.label.toUpperCase()}
            </Text>
          )
        }

        if (item.kind === 'collection') {
          return (
            <View key={`c-${index}`} style={{ gap: theme.spacing / 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colorMuted }}>
                {item.label} ({item.rows.length})
              </Text>
              {item.rows.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colorBorder,
                    borderRadius: theme.radius,
                    padding: theme.spacing,
                    gap: 2,
                  }}
                >
                  {row.map((cell, cellIndex) => (
                    <View key={cellIndex} style={{ flexDirection: 'row', gap: theme.spacing }}>
                      <Text style={{ fontSize: 13, color: theme.colorMuted, flexShrink: 0 }}>
                        {item.columns[cellIndex]}
                      </Text>
                      <Text
                        style={{ fontSize: 13, color: theme.colorText, flexShrink: 1 }}
                      >
                        {cell}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )
        }

        return (
          <View
            key={`f-${index}`}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing }}
          >
            <Text style={{ fontSize: 14, color: theme.colorMuted, flexShrink: 0 }}>
              {item.label}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colorText,
                flexShrink: 1,
                textAlign: 'right',
              }}
            >
              {item.value}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export const contentBrick: NativeBrick = createNativeBrick({
  type: 'output',
  id: 'content',
  render: (props) => <ContentControl {...props} />,
})

export const recapBrick: NativeBrick = createNativeBrick({
  type: 'output',
  id: 'recap',
  render: (props) => <RecapControl {...props} />,
})

// The value flows through the engine's data whether or not anything renders;
// a hidden field simply has nothing to show.
export const hiddenBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'hidden',
  render: () => null,
})
