/**
 * Date, time and datetime bricks, on a separate entry point on purpose:
 * they need @react-native-community/datetimepicker, a native module Metro
 * resolves statically. Applications that want them install the picker and
 * call registerNativeDateBricks(); everyone else never resolves it.
 *
 * Stored formats match the web bricks: 'YYYY-MM-DD', 'HH:mm' and
 * 'YYYY-MM-DDTHH:mm'.
 */
import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { createNativeBrick, registerNativeBricks } from './registry'
import type { NativeBrick, NativeBrickProps } from './registry'
import { useFkTheme } from './theme'
import { Field } from './bricks/field'

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

function DateControl(props: NativeBrickProps & { mode: Mode }) {
  const theme = useFkTheme()
  // Android has no datetime picker: chain a date phase then a time phase.
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

    // On iOS the spinner stays open and fires on every tick; the value
    // updates live and the OK button below closes it.
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
    render: (props) => <DateControl {...props} mode={mode} />,
  })

export const dateBricks: NativeBrick[] = [
  brick('date', 'date'),
  brick('time', 'time'),
  brick('datetime', 'datetime'),
]

export function registerNativeDateBricks(): void {
  registerNativeBricks(dateBricks)
}
