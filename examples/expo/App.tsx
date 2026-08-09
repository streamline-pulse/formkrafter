import { useRef, useState } from 'react'
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import {
  FkThemeProvider,
  FormRenderer,
  fkDarkTheme,
  fkLightTheme,
} from '@streamline-pulse/formkrafter-react-native'
import { registerNativeDateBricks } from '@streamline-pulse/formkrafter-react-native/date'
import type { FormRendererHandle } from '@streamline-pulse/formkrafter-react-native'
import { registrationSpec } from './spec'

registerNativeDateBricks()

export default function App() {
  const scheme = useColorScheme()
  const theme = scheme === 'dark' ? fkDarkTheme : fkLightTheme
  const form = useRef<FormRendererHandle>(null)
  const [data, setData] = useState<Record<string, unknown>>({})
  const [verdict, setVerdict] = useState<string>('—')

  return (
    <FkThemeProvider theme={theme}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colorSurface }]}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: theme.colorText }]}>
            FormKrafter — Expo
          </Text>
          <Text style={[styles.subtitle, { color: theme.colorMuted }]}>
            The same form spec as the web demos, rendered with native components.
          </Text>

          <FormRenderer
            ref={form}
            spec={registrationSpec}
            onDataChange={(next) => setData(next)}
            onSubmit={(_next, isValid, errors) =>
              setVerdict(
                isValid
                  ? 'submitted ✓'
                  : `invalid — ${Object.keys(errors).join(', ')}`,
              )
            }
          />

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

          <View style={[styles.panel, { borderColor: theme.colorBorder }]}>
            <Text style={[styles.panelTitle, { color: theme.colorMuted }]}>
              LIVE DATA
            </Text>
            <Text style={[styles.mono, { color: theme.colorText }]}>
              {JSON.stringify(data, null, 2)}
            </Text>
            <Text style={[styles.panelTitle, { color: theme.colorMuted }]}>
              VERDICT
            </Text>
            <Text style={[styles.mono, { color: theme.colorText }]}>{verdict}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </FkThemeProvider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  panelTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  mono: { fontFamily: 'Menlo', fontSize: 12 },
})
