import { useState } from 'react'
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
  FkThemeProvider,
  fkDarkTheme,
  fkLightTheme,
} from '@streamline-pulse/formkrafter-react-native'
import { registerNativeDateBricks } from '@streamline-pulse/formkrafter-react-native/date'
import { FormScreen } from './screens/FormScreen'
import { recapSpec, simpleSpec, wizardSpec } from './spec'

registerNativeDateBricks()

const SCREENS = [
  {
    key: 'wizard',
    tab: 'Wizard',
    title: 'FormKrafter — Wizard',
    subtitle:
      'Three steps with per-step validation, a date picker, radio, multi-select and a rule.',
    spec: wizardSpec,
    showValidateButton: false,
  },
  {
    key: 'bricks',
    tab: 'Bricks',
    title: 'FormKrafter — Bricks',
    subtitle: 'Content, tags, select boxes, address and a hidden field.',
    spec: simpleSpec,
    initialData: { source: 'expo-example' },
    showValidateButton: true,
  },
  {
    key: 'recap',
    tab: 'Recap',
    title: 'FormKrafter — Recap',
    subtitle: 'Fill the order, then review the live summary before submitting.',
    spec: recapSpec,
    showValidateButton: false,
  },
] as const

export default function App() {
  const scheme = useColorScheme()
  const theme = scheme === 'dark' ? fkDarkTheme : fkLightTheme
  const [active, setActive] = useState<(typeof SCREENS)[number]['key']>('wizard')
  const screen = SCREENS.find((entry) => entry.key === active) ?? SCREENS[0]

  return (
    <FkThemeProvider theme={theme}>
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colorSurface }]}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.body}>
          <FormScreen
            key={screen.key}
            title={screen.title}
            subtitle={screen.subtitle}
            spec={screen.spec}
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
                    fontSize: 14,
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
  body: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 4 },
})
