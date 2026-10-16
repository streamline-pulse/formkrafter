import { Pressable, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import { fkT, parseDocumentFields, services } from '@streamline-pulse/formkrafter-core'
import type { DocumentReading } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

const required = (props: NativeBrickProps) => props.validations?.some((v) => v.validator === 'required')

type DocumentValue = DocumentReading & { name?: string }

// Sans capture native : le document lu sur le web s'affiche, ses champs se corrigent.
function DocumentControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = props.data as DocumentValue | undefined
  const wanted = parseDocumentFields(props.configs.fields)
  const label = (key: string) => wanted.find((field) => field.key === key)?.label ?? key
  const fields = value?.fields ?? {}
  const update = (key: string, text: string) => {
    if (!value) return
    props.onDataChange({ ...value, fields: { ...fields, [key]: text || null } })
  }
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  // Avec un selecteur installe par l'hote (camera, documents), la lecture se fait aussi ici.
  const picker = services.filePickerService
  const pick = async (capture: boolean) => {
    if (!picker) return
    setError(undefined)
    try {
      const file = await picker.pick({ accept: typeof props.configs.accept === 'string' ? props.configs.accept : 'image/*,.pdf', capture })
      if (!file) return
      setReading(true)
      const context = Object.fromEntries(Object.entries(props.dataMap ?? {}).filter(([key]) => key.startsWith('_')))
      const read = await services.documentReaderService.read(file, {
        url: typeof props.configs.readUrl === 'string' && props.configs.readUrl ? props.configs.readUrl : undefined,
        fields: wanted,
        language: typeof props.configs.language === 'string' && props.configs.language ? props.configs.language : undefined,
        context,
      })
      const readFields = wanted.length ? Object.fromEntries(wanted.map((field) => [field.key, read.fields?.[field.key] ?? null])) : read.fields
      props.onDataChange({ name: file.name, type: file.type, size: file.size, ...read, ...(readFields ? { fields: readFields } : {}), readAt: new Date().toISOString() })
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : fkT('document.failed'))
    } finally {
      setReading(false)
    }
  }
  const locked = props.disabled || !picker
  return (
    <Field label={props.configs.label} error={props.error ?? error} required={required(props)}>
      <Text style={{ fontSize: 14, color: value ? theme.colorText : theme.colorMuted }}>
        {reading ? fkT('document.reading') : value ? `${value.name ?? ''} · ${fkT('document.read')}` : fkT('document.none')}
      </Text>
      {!locked && !reading ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing, marginTop: theme.spacing * 0.5 }}>
          <Pressable onPress={() => pick(false)} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colorBorder, borderRadius: theme.radius, paddingHorizontal: theme.spacing, paddingVertical: theme.spacing * 0.5 }}>
            <Text style={{ fontSize: 13, color: theme.colorText }}>{fkT('document.choose')}</Text>
          </Pressable>
          {props.configs.capture !== false ? (
            <Pressable onPress={() => pick(true)} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colorBorder, borderRadius: theme.radius, paddingHorizontal: theme.spacing, paddingVertical: theme.spacing * 0.5 }}>
              <Text style={{ fontSize: 13, color: theme.colorText }}>{fkT('document.capture')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {Object.entries(fields).map(([key, raw]) => (
        <View key={key} style={{ gap: 4, marginTop: theme.spacing * 0.5 }}>
          <Text style={{ fontSize: 12, color: theme.colorMuted }}>{label(key)}</Text>
          <TextInput
            value={raw === null || raw === undefined ? '' : String(raw)}
            editable={!props.disabled}
            placeholder={fkT('document.notFound')}
            placeholderTextColor={theme.colorMuted}
            onChangeText={(text) => update(key, text)}
            style={{
              borderWidth: 1,
              borderColor: theme.colorBorder,
              borderRadius: theme.radius,
              paddingHorizontal: theme.spacing,
              paddingVertical: theme.spacing * 0.75,
              color: theme.colorText,
            }}
          />
        </View>
      ))}
      {value?.text ? (
        <Text numberOfLines={6} style={{ fontSize: 12, color: theme.colorMuted, marginTop: theme.spacing * 0.5 }}>
          {value.text}
        </Text>
      ) : null}
    </Field>
  )
}

export const documentBrick: NativeBrick = createNativeBrick({ type: 'input', id: 'document', render: (props) => <DocumentControl {...props} /> })
