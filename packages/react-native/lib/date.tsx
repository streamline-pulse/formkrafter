import { createElement, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { createNativeBrick, registerNativeBricks } from './registry.js'
import type { NativeBrick, NativeBrickProps } from './registry.js'
import { useFkTheme } from './theme.js'
import { Field } from './bricks/field.js'

type Mode = 'date' | 'time' | 'datetime'

const pad = (n: number): string => String(n).padStart(2, '0')
const fmtDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtTime = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`

const format = (mode: Mode, d: Date): string =>
  mode === 'date' ? fmtDate(d) : mode === 'time' ? fmtTime(d) : `${fmtDate(d)}T${fmtTime(d)}`

const parse = (mode: Mode, raw: unknown): Date => {
  if (typeof raw !== 'string' || raw === '') return new Date()
  const value = mode === 'time' ? `${fmtDate(new Date())}T${raw}` : raw
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function WebDateControl(props: NativeBrickProps & { mode: Mode }) {
  const theme = useFkTheme()
  const value = typeof props.data === 'string' ? props.data : ''

  return (
    <Field label={props.configs.label} error={props.error}>
      {createElement('input', {
        type: props.mode === 'datetime' ? 'datetime-local' : props.mode,
        value,
        disabled: props.disabled,
        'aria-label': props.configs.label ? String(props.configs.label) : undefined,
        onChange: (event: { target: { value: string } }) =>
          props.onDataChange(event.target.value || undefined),
        style: {
          boxSizing: 'border-box',
          width: '100%',
          border: `1px solid ${props.error ? theme.colorDanger : theme.colorBorder}`,
          borderRadius: theme.radius,
          background: theme.colorSurface,
          color: theme.colorText,
          padding: `${theme.spacing * 1.25}px ${theme.spacing * 1.5}px`,
          font: 'inherit',
          fontSize: 15,
          opacity: props.disabled ? 0.6 : 1,
        },
      })}
    </Field>
  )
}

function DateControl(props: NativeBrickProps & { mode: Mode }) {
  const theme = useFkTheme()
  const [phase, setPhase] = useState<'closed' | Mode>('closed')
  const [pendingDate, setPendingDate] = useState<Date>()

  const chained = props.mode === 'datetime' && Platform.OS === 'android'
  const value = typeof props.data === 'string' && props.data !== '' ? props.data : undefined

  const openPhase = chained ? 'date' : props.mode

  const onChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === 'dismissed' || !picked) {
      setPhase('closed')
      setPendingDate(undefined)
      return
    }

    if (chained && phase === 'date') {
      setPendingDate(picked)
      setPhase('time')
      return
    }

    const result = chained
      ? new Date(
          (pendingDate ?? picked).getFullYear(),
          (pendingDate ?? picked).getMonth(),
          (pendingDate ?? picked).getDate(),
          picked.getHours(),
          picked.getMinutes(),
        )
      : picked

    if (Platform.OS === 'android') setPhase('closed')
    setPendingDate(undefined)
    props.onDataChange(format(props.mode, result))
  }

  return (
    <Field label={props.configs.label} error={props.error}>
      <Pressable
        disabled={props.disabled}
        accessibilityRole="button"
        accessibilityLabel={props.configs.label ? String(props.configs.label) : undefined}
        onPress={() => setPhase(openPhase)}
        style={{
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          backgroundColor: theme.colorSurface,
          paddingHorizontal: theme.spacing * 1.5,
          paddingVertical: theme.spacing * 1.25,
          opacity: props.disabled ? 0.6 : 1,
        }}
      >
        <Text style={{ color: value ? theme.colorText : theme.colorMuted, fontSize: 15 }}>
          {value ??
            (props.configs.placeholder ? String(props.configs.placeholder) : ' ')}
        </Text>
      </Pressable>

      {phase !== 'closed' ? (
        <View>
          <DateTimePicker
            value={phase === 'time' && pendingDate ? pendingDate : parse(props.mode, value)}
            mode={chained ? phase : props.mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPhase('closed')}
              style={{ alignSelf: 'flex-end', padding: theme.spacing }}
            >
              <Text style={{ color: theme.colorPrimary, fontWeight: '600' }}>OK</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Field>
  )
}

const brick = (id: string, mode: Mode): NativeBrick =>
  createNativeBrick({
    type: 'input',
    id,
    render: (props) =>
      Platform.OS === 'web' ? (
        <WebDateControl {...props} mode={mode} />
      ) : (
        <DateControl {...props} mode={mode} />
      ),
  })

export const dateBricks: NativeBrick[] = [
  brick('date', 'date'),
  brick('time', 'time'),
  brick('datetime', 'datetime'),
]

export function registerNativeDateBricks(): void {
  registerNativeBricks(dateBricks)
}
