import { Text, TextInput, View } from 'react-native'
import { fkT } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

type Point = { type: 'Point'; coordinates: [number, number] }

const isPoint = (value: unknown): value is Point =>
  !!value &&
  typeof value === 'object' &&
  (value as Point).type === 'Point' &&
  Array.isArray((value as Point).coordinates) &&
  (value as Point).coordinates.length === 2

// Sans carte native : un point se saisit par ses coordonnees, une zone se
// lit seulement (son dessin se fait sur le web).
function GeoPointControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const point = isPoint(props.data) ? props.data : undefined
  const update = (axis: 'lat' | 'lng', text: string) => {
    const lat = axis === 'lat' ? Number(text) : point?.coordinates[1]
    const lng = axis === 'lng' ? Number(text) : point?.coordinates[0]
    if (text === '' || lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) {
      if (text === '') props.onDataChange(undefined)
      return
    }
    props.onDataChange({ type: 'Point', coordinates: [lng, lat] })
  }
  const input = (axis: 'lat' | 'lng') => (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontSize: 12, color: theme.colorMuted }}>
        {fkT(axis === 'lat' ? 'geo.latitude' : 'geo.longitude')}
      </Text>
      <TextInput
        value={point ? String(point.coordinates[axis === 'lat' ? 1 : 0]) : ''}
        editable={!props.disabled}
        keyboardType="numbers-and-punctuation"
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) => update(axis, text)}
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          paddingHorizontal: theme.spacing,
          paddingVertical: theme.spacing * 0.75,
          color: theme.colorText,
        }}
      />
    </View>
  )
  return (
    <Field
      label={props.configs.label}
      error={props.error}
      required={props.validations?.some((v) => v.validator === 'required')}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing }}>
        {input('lat')}
        {input('lng')}
      </View>
    </Field>
  )
}

function GeoAreaControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = props.data as { type?: string; coordinates?: unknown } | undefined
  const count =
    value?.type === 'Polygon' && Array.isArray(value.coordinates)
      ? Math.max(((value.coordinates as unknown[][])[0]?.length ?? 1) - 1, 0)
      : value?.type === 'LineString' && Array.isArray(value.coordinates)
        ? (value.coordinates as unknown[]).length
        : 0
  return (
    <Field
      label={props.configs.label}
      error={props.error}
      required={props.validations?.some((v) => v.validator === 'required')}
    >
      <Text style={{ fontSize: 14, color: theme.colorText }}>
        {count} {fkT('geo.points')}
      </Text>
      <Text style={{ fontSize: 12, color: theme.colorMuted }}>{fkT('geo.nativeReadOnly')}</Text>
    </Field>
  )
}

export const geoPointBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'geo-point',
  render: (props) => <GeoPointControl {...props} />,
})

export const geoAreaBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'geo-area',
  render: (props) => <GeoAreaControl {...props} />,
})
