import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
} from 'react-native'
import {
  appendSearchParam,
  evalBrickCode,
  fkT,
  interpolateTemplate,
  normalizeOptions,
  parseHeaderLines,
  services,
} from '@streamline-pulse/formkrafter-core'
import type { SelectOption } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

type Props = NativeBrickProps & { multiple?: boolean }

function useOptions(props: Props, query: string, open: boolean) {
  const source = (props.configs.optionsSource as string) ?? 'static'
  const labelKey =
    typeof props.configs.labelKey === 'string' ? props.configs.labelKey : 'label'
  const valueKey =
    typeof props.configs.valueKey === 'string' ? props.configs.valueKey : 'value'

  const [remote, setRemote] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const signature = useRef<string>('')

  const searchParam =
    typeof props.configs.searchParam === 'string' ? props.configs.searchParam : ''

  let url: string | undefined
  if (source === 'remote' && typeof props.configs.optionsUrl === 'string') {
    url = interpolateTemplate(props.configs.optionsUrl, props.dataMap)
    if (searchParam) url = appendSearchParam(url, searchParam, query.trim())
  }
  const headers = parseHeaderLines(props.configs.optionsHeaders, props.dataMap)
  const ref = typeof props.configs.optionsRef === 'string' ? props.configs.optionsRef : ''

  useEffect(() => {
    if (!open) return
    if (source !== 'remote' && source !== 'catalog') return

    const key = source === 'remote' ? `${url}|${JSON.stringify(headers ?? {})}` : ref
    if (!key || key === signature.current) return

    const timer = setTimeout(async () => {
      signature.current = key
      setLoading(true)
      setError(undefined)
      try {
        const raw =
          source === 'remote'
            ? await services.dataSourceService.fetchOptions(url!, {
                ...(headers ? { headers } : {}),
                ...(props.configs.optionsPath
                  ? { path: props.configs.optionsPath as string }
                  : {}),
              })
            : await services.optionSourceService.fetchOptions(ref)
        setRemote(normalizeOptions(raw, labelKey, valueKey))
      } catch (cause) {
        setRemote([])
        setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        setLoading(false)
      }
    }, searchParam ? 250 : 0)

    return () => clearTimeout(timer)
  })

  let options: SelectOption[]
  switch (source) {
    case 'remote':
    case 'catalog':
      options = remote
      break
    case 'dataMap': {
      const path = props.configs.optionsPath
      options = normalizeOptions(
        typeof path === 'string' ? props.dataMap?.[path] : [],
        labelKey,
        valueKey,
      )
      break
    }
    case 'js': {
      const code = props.configs.optionsCode
      if (typeof code !== 'string' || !code) {
        options = []
        break
      }
      const result = evalBrickCode(code, props.dataMap)
      options =
        result instanceof Error ? [] : normalizeOptions(result, labelKey, valueKey)
      if (result instanceof Error) setError(result.message)
      break
    }
    default:
      options = normalizeOptions(props.configs.options, labelKey, valueKey)
  }

  const filtered =
    query && !(source === 'remote' && searchParam)
      ? options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options

  return { options, filtered, loading, error }
}

function SelectControl(props: Props) {
  const theme = useFkTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { options, filtered, loading, error } = useOptions(props, query, open)

  const values = props.multiple
    ? Array.isArray(props.data)
      ? (props.data as string[])
      : []
    : []
  const selected = options.find((option) => option.value === props.data)
  const summary = props.multiple
    ? options
        .filter((option) => values.includes(option.value))
        .map((option) => option.label)
        .join(', ')
    : selected?.label

  const close = () => {
    setOpen(false)
    setQuery('')
  }

  return (
    <Field
      label={props.configs.label}
      error={props.error ?? error}
      required={props.validations?.some((v) => v.validator === 'required')}
    >
      <Pressable
        disabled={props.disabled}
        accessibilityRole="button"
        accessibilityLabel={props.configs.label ? String(props.configs.label) : undefined}
        onPress={() => setOpen(true)}
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
        <Text style={{ color: summary ? theme.colorText : theme.colorMuted, fontSize: 15 }}>
          {summary ||
            (props.configs.placeholder ? String(props.configs.placeholder) : ' ')}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          onPress={close}
        >
          <Pressable
            style={{
              backgroundColor: theme.colorSurface,
              borderTopLeftRadius: theme.radius * 2,
              borderTopRightRadius: theme.radius * 2,
              maxHeight: '70%',
              paddingVertical: theme.spacing,
            }}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={fkT('select.search')}
              placeholderTextColor={theme.colorMuted}
              accessibilityLabel={fkT('select.search')}
              style={{
                marginHorizontal: theme.spacing * 2,
                marginBottom: theme.spacing,
                borderWidth: 1,
                borderColor: theme.colorBorder,
                borderRadius: theme.radius,
                paddingHorizontal: theme.spacing * 1.5,
                paddingVertical: theme.spacing,
                fontSize: 15,
                color: theme.colorText,
              }}
            />
            {loading ? (
              <ActivityIndicator style={{ padding: theme.spacing * 2 }} />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(option) => option.value}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={{ color: theme.colorMuted, padding: theme.spacing * 2 }}>
                    {error ?? fkT('select.empty')}
                  </Text>
                }
                renderItem={({ item }) => {
                  const active = props.multiple
                    ? values.includes(item.value)
                    : item.value === props.data
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => {
                        if (!props.multiple) {
                          props.onDataChange(item.value)
                          return close()
                        }
                        props.onDataChange(
                          active
                            ? values.filter((value) => value !== item.value)
                            : [...values, item.value],
                        )
                      }}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: theme.spacing * 2,
                        paddingVertical: theme.spacing * 1.5,
                        backgroundColor: active ? `${theme.colorPrimary}22` : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: active ? theme.colorPrimary : theme.colorText,
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {item.label}
                      </Text>
                      {props.multiple && active ? (
                        <Text style={{ color: theme.colorPrimary, fontWeight: '700' }}>✓</Text>
                      ) : null}
                    </Pressable>
                  )
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Field>
  )
}

export const selectBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'select',
  render: (props) => <SelectControl {...props} />,
})

export const multiSelectBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'multi-select',
  render: (props) => <SelectControl {...props} multiple />,
})
