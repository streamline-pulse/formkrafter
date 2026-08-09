import { useEffect, useState } from 'react'
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import {
  frFkTranslations,
  setFkTranslations,
} from '@streamline-pulse/formkrafter-core'
import {
  FkThemeProvider,
  fkDarkTheme,
  fkLightTheme,
} from '@streamline-pulse/formkrafter-react-native'
import { registerNativeDateBricks } from '@streamline-pulse/formkrafter-react-native/date'
import { FormScreen } from './screens/FormScreen'
import { registerRatingBrick } from './rating-brick'
import { customSpec, dataSpec, recapSpec, simpleSpec, wizardSpec } from './spec'

registerNativeDateBricks()
registerRatingBrick()

const SCREENS = [
  {
    key: 'wizard',
    tab: 'Wizard',
    title: 'Wizard',
    subtitle:
      'Three steps with per-step validation, a date picker, radio, multi-select and a rule.',
    spec: wizardSpec,
    showValidateButton: false,
  },
  {
    key: 'bricks',
    tab: 'Bricks',
    title: 'Bricks',
    subtitle: 'Content, tags, select boxes, address and a hidden field.',
    spec: simpleSpec,
    initialData: { source: 'expo-example' },
    showValidateButton: true,
  },
  {
    key: 'data',
    tab: 'Data',
    title: 'Data',
    subtitle: 'A select fed by a public HTTP API, and an editable data grid.',
    spec: dataSpec,
    showValidateButton: true,
  },
  {
    key: 'recap',
    tab: 'Recap',
    title: 'Recap',
    subtitle: 'Fill the order, then review the live summary before submitting.',
    spec: recapSpec,
    showValidateButton: false,
  },
  {
    key: 'custom',
    tab: 'Custom',
    title: 'Custom brick',
    subtitle: 'An app-registered star rating, driving a rule like any built-in.',
    spec: customSpec,
    showValidateButton: true,
  },
] as const

export default function App() {
  const scheme = useColorScheme()
  const [mode, setMode] = useState<'system' | 'light' | 'dark'>('system')
  const [locale, setLocale] = useState<'en' | 'fr'>('en')
  const [active, setActive] = useState<(typeof SCREENS)[number]['key']>('wizard')

  const dark = mode === 'system' ? scheme === 'dark' : mode === 'dark'
  const theme = dark ? fkDarkTheme : fkLightTheme
  const screen = SCREENS.find((entry) => entry.key === active) ?? SCREENS[0]

  // The chrome strings (stepper buttons, grid actions, select search…) come
  // from the shared translation store; the field labels resolve through the
  // locale prop.
  useEffect(() => {
    setFkTranslations(locale === 'fr' ? frFkTranslations : {})
  }, [locale])

  return (
    <FkThemeProvider theme={theme}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colorSurface }]}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <View style={[styles.header, { borderBottomColor: theme.colorBorder }]}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.colorText }}>
            FormKrafter
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle language"
              onPress={() => setLocale(locale === 'en' ? 'fr' : 'en')}
              style={[styles.chip, { borderColor: theme.colorBorder }]}
            >
              <Text style={{ fontWeight: '700', color: theme.colorPrimary }}>
                {locale.toUpperCase()}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle theme"
              onPress={() => setMode(dark ? 'light' : 'dark')}
              style={[styles.chip, { borderColor: theme.colorBorder }]}
            >
              <Text style={{ color: theme.colorText }}>{dark ? '☀️' : '🌙'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <FormScreen
            key={`${screen.key}-${locale}`}
            title={screen.title}
            subtitle={screen.subtitle}
            spec={screen.spec}
            locale={locale}
            initialData={'initialData' in screen ? screen.initialData : undefined}
            showValidateButton={screen.showValidateButton}
          />
        </View>

        <View style={[styles.tabs, { borderTopColor: theme.colorBorder }]}>
          {SCREENS.map((entry) => {
            const current = entry.key === active
            return (
              <Pressable
                key={entry.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: current }}
                onPress={() => setActive(entry.key)}
                style={styles.tab}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: current ? '700' : '400',
                    color: current ? theme.colorPrimary : theme.colorMuted,
                  }}
                >
                  {entry.tab}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </SafeAreaView>
    </FkThemeProvider>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  body: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
})
