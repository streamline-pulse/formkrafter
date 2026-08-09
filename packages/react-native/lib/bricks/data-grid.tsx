import { useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  fkT,
  getBrickData,
  resolveLocalizedRecord,
  validateBrickSpecDataDetailed,
  wrapBrickData,
} from '@streamline-pulse/formkrafter-core'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick, getNativeBrick } from '../registry'
import type { NativeBrick, NativeBrickProps } from '../registry'
import { useFkTheme } from '../theme'
import { Field } from './field'

type Row = Record<string, unknown>

/**
 * Rows render as cards — the collection's child bricks re-rendered against
 * row-scoped data through the same registry as everything else, so a custom
 * brick inside a grid needs nothing special. Row errors surface as the row
 * is touched, mirroring the web grid.
 */
function DataGridControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [touched, setTouched] = useState<Record<number, Record<string, boolean>>>({})
  const rowSpecCache = useRef<{ source: BrickSpec; rowSpec: BrickSpec }>(undefined)

  const rows: Row[] = Array.isArray(props.data) ? (props.data as Row[]) : []
  const children = props.spec.children ?? []

  const rowSpec = (): BrickSpec => {
    if (rowSpecCache.current?.source !== props.spec) {
      rowSpecCache.current = {
        source: props.spec,
        rowSpec: {
          type: 'panel',
          id: 'grid-row',
          name: 'Row',
          configs: { key: 'row' },
          children,
        } as BrickSpec,
      }
    }
    return rowSpecCache.current.rowSpec
  }

  const rowErrors = (row: Row, index: number): Record<string, string> => {
    const present = Object.fromEntries(
      Object.entries(row).filter(
        ([, value]) => value !== '' && value !== null && value !== undefined,
      ),
    )
    const all = validateBrickSpecDataDetailed(rowSpec(), present, props.locale).errors
    const rowTouched = touched[index] ?? {}
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => rowTouched[key]),
    )
  }

  const patchRow = (index: number, patch: Row) => {
    setTouched((current) => ({
      ...current,
      [index]: {
        ...(current[index] ?? {}),
        ...Object.fromEntries(Object.keys(patch).map((key) => [key, true])),
      },
    }))
    props.onDataChange(
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  const moveRow = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    props.onDataChange(next)
  }

  const tool = (label: string, accessibility: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibility}
      disabled={disabled || props.disabled}
      onPress={onPress}
      style={{ padding: theme.spacing / 2, opacity: disabled ? 0.3 : 1 }}
    >
      <Text style={{ color: theme.colorMuted, fontSize: 14 }}>{label}</Text>
    </Pressable>
  )

  return (
    <Field label={props.configs.label} error={props.error}>
      <View style={{ gap: theme.spacing }}>
        {rows.length === 0 ? (
          <Text style={{ color: theme.colorMuted, fontSize: 14 }}>
            {fkT('grid.empty')}
          </Text>
        ) : null}

        {rows.map((row, index) => {
          const errors = rowErrors(row, index)
          return (
            <View
              key={index}
              style={{
                borderWidth: 1,
                borderColor: theme.colorBorder,
                borderRadius: theme.radius,
                padding: theme.spacing * 1.5,
                gap: theme.spacing,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colorMuted }}>
                  #{index + 1}
                </Text>
                <View style={{ flexDirection: 'row', gap: theme.spacing / 2 }}>
                  {tool('↑', fkT('grid.moveUp'), () => moveRow(index, -1), index === 0)}
                  {tool('↓', fkT('grid.moveDown'), () => moveRow(index, 1), index === rows.length - 1)}
                  {tool('✕', fkT('grid.removeRow'), () =>
                    props.onDataChange(rows.filter((_, i) => i !== index)),
                  )}
                </View>
              </View>

              {children.map((child) => {
                const brick = getNativeBrick(child.type, child.id)
                if (!brick) {
                  return (
                    <Text key={child.configs?.uid} style={{ color: theme.colorDanger }}>
                      {`Brick ${child.type}:${child.id} has no native renderer`}
                    </Text>
                  )
                }
                const key = child.configs?.key
                return (
                  <View key={child.configs?.uid ?? key}>
                    {brick.render({
                      spec: child,
                      configs: resolveLocalizedRecord(child.configs, props.locale) ?? {},
                      locale: props.locale,
                      data: getBrickData(child, row),
                      dataMap: { ...props.dataMap, ...row },
                      error: key ? errors[key] : undefined,
                      disabled: props.disabled,
                      engine: props.engine,
                      onDataChange: (value) => {
                        const wrapped = wrapBrickData(child, value)
                        if (wrapped !== undefined) patchRow(index, wrapped)
                      },
                    })}
                  </View>
                )
              })}
            </View>
          )
        })}

        <Pressable
          accessibilityRole="button"
          disabled={props.disabled}
          onPress={() => props.onDataChange([...rows, {}])}
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: theme.spacing * 1.5,
            paddingVertical: theme.spacing,
            borderRadius: theme.radius,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: theme.colorPrimary,
          }}
        >
          <Text style={{ color: theme.colorPrimary, fontWeight: '600' }}>
            {fkT('grid.addRow')}
          </Text>
        </Pressable>
      </View>
    </Field>
  )
}

export const dataGridBrick: NativeBrick = createNativeBrick({
  type: 'collection',
  id: 'data-grid',
  render: (props) => <DataGridControl {...props} />,
})
