/**
 * Module hooks that stub the native-only dependencies of the react-native
 * package, so plain Node can import its published tarball and exercise the
 * exports map + file layout — none of the stubs' behavior is under test.
 */
const STUBS = new Map([
  [
    'react-native',
    `const stub = (name) => name
     export const Text = stub('Text')
     export const View = stub('View')
     export const TextInput = stub('TextInput')
     export const Switch = stub('Switch')
     export const Modal = stub('Modal')
     export const Pressable = stub('Pressable')
     export const FlatList = stub('FlatList')
     export const ScrollView = stub('ScrollView')
     export const ActivityIndicator = stub('ActivityIndicator')
     export const StyleSheet = { create: (styles) => styles }
     export const Platform = { OS: 'ios' }
     export const PanResponder = { create: () => ({ panHandlers: {} }) }`,
  ],
  [
    'expo-document-picker',
    `export const getDocumentAsync = async () => ({ canceled: true, assets: [] })`,
  ],
  [
    'react-native-svg',
    `export default 'Svg'
     export const Path = 'Path'
     export const SvgXml = 'SvgXml'`,
  ],
  [
    '@react-native-community/datetimepicker',
    `export default 'DateTimePicker'`,
  ],
])

export async function resolve(specifier, context, next) {
  if (STUBS.has(specifier)) {
    return { shortCircuit: true, url: `native-stub:${specifier}` }
  }
  return next(specifier, context)
}

export async function load(url, context, next) {
  if (url.startsWith('native-stub:')) {
    return {
      shortCircuit: true,
      format: 'module',
      source: STUBS.get(url.slice('native-stub:'.length)),
    }
  }
  return next(url, context)
}
