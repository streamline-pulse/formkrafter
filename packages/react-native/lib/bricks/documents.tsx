import { Text, TextInput, View } from 'react-native'
import { fkT, parseDocumentFields } from '@streamline-pulse/formkrafter-core'
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
  return (
    <Field label={props.configs.label} error={props.error} required={required(props)}>
      <Text style={{ fontSize: 14, color: value ? theme.colorText : theme.colorMuted }}>
        {value ? `${value.name ?? ''} · ${fkT('document.read')}` : fkT('document.none')}
      </Text>
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
