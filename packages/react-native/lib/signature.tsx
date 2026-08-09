/**
 * The signature brick, on a separate entry point on purpose: it needs
 * react-native-svg, a native module Metro resolves statically.
 * Applications that want it install the module and call
 * registerNativeSignatureBrick(); everyone else never resolves it.
 *
 * The stored value is a data URL, like the web brick — image/svg+xml here
 * where the canvas-based web brick produces image/png.
 */
import { useRef, useState } from 'react'
import { PanResponder, Pressable, Text, View } from 'react-native'
import Svg, { Path, SvgXml } from 'react-native-svg'
import { fkT } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick, registerNativeBrick } from './registry.js'
import type { NativeBrick, NativeBrickProps } from './registry.js'
import { useFkTheme } from './theme.js'
import { Field } from './bricks/field.js'

const HEIGHT = 160

const toDataUrl = (paths: string[], width: number, stroke: string): string => {
  const body = paths
    .map((d) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('')
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}">${body}</svg>`
  const encode = (globalThis as { btoa?: (raw: string) => string }).btoa
  if (!encode) throw new Error('No base64 encoder available')
  return `data:image/svg+xml;base64,${encode(xml)}`
}

const fromDataUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const prefix = 'data:image/svg+xml;base64,'
  if (!value.startsWith(prefix)) return undefined
  const decode = (globalThis as { atob?: (raw: string) => string }).atob
  if (!decode) return undefined
  try {
    return decode(value.slice(prefix.length))
  } catch {
    return undefined
  }
}

function SignatureControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [paths, setPaths] = useState<string[]>([])
  const [current, setCurrent] = useState<string>()
  const [width, setWidth] = useState(0)
  const live = useRef({ paths: [] as string[], current: '', width: 0 })
  live.current.paths = paths
  live.current.width = width

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !props.disabled,
      onMoveShouldSetPanResponder: () => !props.disabled,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent
        live.current.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`
        setCurrent(live.current.current)
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent
        live.current.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`
        setCurrent(live.current.current)
      },
      onPanResponderRelease: () => {
        const next = [...live.current.paths, live.current.current]
        setPaths(next)
        setCurrent(undefined)
        props.onDataChange(toDataUrl(next, live.current.width || 300, '#1c2b33'))
      },
    }),
  ).current

  // A value that arrived from outside (initial data, another device) has no
  // local stroke state — re-render it straight from the stored SVG.
  const external = paths.length === 0 && !current ? fromDataUrl(props.data) : undefined

  const clear = () => {
    setPaths([])
    setCurrent(undefined)
    props.onDataChange(undefined)
  }

  return (
    <Field label={props.configs.label} error={props.error}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        {...pan.panHandlers}
        style={{
          height: HEIGHT,
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {external ? (
          <SvgXml xml={external} width="100%" height="100%" />
        ) : (
          <Svg width="100%" height="100%">
            {[...paths, ...(current ? [current] : [])].map((d, index) => (
              <Path
                key={index}
                d={d}
                fill="none"
                stroke="#1c2b33"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
        )}
      </View>
      {paths.length > 0 || external ? (
        <Pressable
          accessibilityRole="button"
          disabled={props.disabled}
          onPress={clear}
          style={{ alignSelf: 'flex-start', paddingVertical: theme.spacing / 2 }}
        >
          <Text style={{ color: theme.colorMuted, fontSize: 13 }}>
            {fkT('signature.clear')}
          </Text>
        </Pressable>
      ) : null}
    </Field>
  )
}

export const signatureBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'signature',
  render: (props) => <SignatureControl {...props} />,
})

export function registerNativeSignatureBrick(): void {
  registerNativeBrick(signatureBrick)
}
