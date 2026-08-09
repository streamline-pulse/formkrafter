import { useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { FormRenderer, useFkTheme } from '@streamline-pulse/formkrafter-react-native'
import type { FormRendererHandle } from '@streamline-pulse/formkrafter-react-native'
import type { BrickSpec } from '@streamline-pulse/formkrafter-core'

export function FormScreen(props: {
  title: string
  subtitle: string
  spec: BrickSpec
  initialData?: Record<string, unknown>
  showValidateButton?: boolean
}) {
  const theme = useFkTheme()
  const form = useRef<FormRendererHandle>(null)
  const [data, setData] = useState<Record<string, unknown>>({})
  const [verdict, setVerdict] = useState('—')

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colorText }]}>{props.title}</Text>
      <Text style={[styles.subtitle, { color: theme.colorMuted }]}>
        {props.subtitle}
      </Text>

      <FormRenderer
        ref={form}
        spec={props.spec}
        data={props.initialData}
        onDataChange={(next) => setData(next)}
        onSubmit={(_next, isValid, errors) =>
          setVerdict(
            isValid ? 'submitted ✓' : `invalid — ${Object.keys(errors).join(', ')}`,
          )
        }
      />

      {props.showValidateButton ? (
        <Pressable
          style={[styles.button, { backgroundColor: theme.colorPrimary }]}
          onPress={() => {
            const result = form.current?.validate()
            if (!result) return
            setVerdict(
              result.valid
                ? 'valid ✓'
                : `invalid — ${Object.keys(result.errors).join(', ')}`,
            )
          }}
        >
          <Text style={styles.buttonText}>Validate</Text>
        </Pressable>
      ) : null}

      <View style={[styles.panel, { borderColor: theme.colorBorder }]}>
        <Text style={[styles.panelTitle, { color: theme.colorMuted }]}>LIVE DATA</Text>
        <Text style={[styles.mono, { color: theme.colorText }]}>
          {JSON.stringify(data, null, 2)}
        </Text>
        <Text style={[styles.panelTitle, { color: theme.colorMuted }]}>VERDICT</Text>
        <Text style={[styles.mono, { color: theme.colorText }]}>{verdict}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  button: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  panel: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  panelTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  mono: { fontFamily: 'Menlo', fontSize: 12 },
})
