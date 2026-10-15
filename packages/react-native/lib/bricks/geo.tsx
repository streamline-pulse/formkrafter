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

type AddressFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] } | null
  properties: { label: string; [key: string]: unknown }
}

// Pas de geocodage natif : l'adresse se saisit en texte, un point deja
// obtenu sur le web est conserve tant que le libelle ne change pas.
function GeoAddressControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = props.data as AddressFeature | undefined
  const label = value?.properties?.label ?? ''
  return (
    <Field
      label={props.configs.label}
      error={props.error}
      required={props.validations?.some((v) => v.validator === 'required')}
    >
      <TextInput
        value={label}
        editable={!props.disabled}
        placeholder={props.configs.placeholder ? String(props.configs.placeholder) : fkT('address.search')}
        placeholderTextColor={theme.colorMuted}
        onChangeText={(text) =>
          props.onDataChange(
            text.trim()
              ? text === label
                ? value
                : { type: 'Feature', geometry: null, properties: { label: text } }
              : undefined
          )
        }
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          paddingHorizontal: theme.spacing,
          paddingVertical: theme.spacing * 0.75,
          color: theme.colorText,
        }}
      />
      {value?.geometry ? (
        <Text style={{ fontSize: 12, color: theme.colorMuted }}>
          {value.geometry.coordinates[1]}, {value.geometry.coordinates[0]}
        </Text>
      ) : null}
    </Field>
  )
}

export const geoAddressBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'geo-address',
  render: (props) => <GeoAddressControl {...props} />,
})

type Zone = { code: string; name: string }

// Pas de couche cartographique native : les zones choisies sur le web se lisent.
function GeoLayerControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const raw = props.data
  const zones: Zone[] = Array.isArray(raw)
    ? (raw as Zone[])
    : raw && typeof raw === 'object' && 'code' in (raw as object)
      ? [raw as Zone]
      : []
  return (
    <Field
      label={props.configs.label}
      error={props.error}
      required={props.validations?.some((v) => v.validator === 'required')}
    >
      <Text style={{ fontSize: 14, color: zones.length ? theme.colorText : theme.colorMuted }}>
        {zones.length ? zones.map((zone) => zone.name).join(', ') : fkT('layer.pick')}
      </Text>
      <Text style={{ fontSize: 12, color: theme.colorMuted }}>{fkT('geo.nativeReadOnly')}</Text>
    </Field>
  )
}

export const geoLayerBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'geo-layer',
  render: (props) => <GeoLayerControl {...props} />,
})
