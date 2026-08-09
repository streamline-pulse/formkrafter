import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { createNativeBrick } from '../registry.js'
import type { NativeBrick, NativeBrickProps } from '../registry.js'
import { useFkTheme } from '../theme.js'
import { Field } from './field.js'

function TagsControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [draft, setDraft] = useState('')
  const tags = Array.isArray(props.data) ? (props.data as string[]) : []

  const commit = () => {
    const value = draft.trim()
    setDraft('')
    if (!value || tags.includes(value)) return
    props.onDataChange([...tags, value])
  }

  return (
    <Field label={props.configs.label} error={props.error}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: theme.spacing / 2,
          borderWidth: 1,
          borderColor: props.error ? theme.colorDanger : theme.colorBorder,
          borderRadius: theme.radius,
          backgroundColor: theme.colorSurface,
          padding: theme.spacing / 2,
        }}
      >
        {tags.map((tag) => (
          <View
            key={tag}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              borderRadius: 999,
              backgroundColor: `${theme.colorPrimary}24`,
              paddingHorizontal: theme.spacing,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colorPrimary }}>
              {tag}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${tag}`}
              disabled={props.disabled}
              onPress={() => props.onDataChange(tags.filter((value) => value !== tag))}
            >
              <Text style={{ fontSize: 12, color: theme.colorPrimary }}>✕</Text>
            </Pressable>
          </View>
        ))}
        <TextInput
          value={draft}
          editable={!props.disabled}
          placeholder={props.configs.placeholder ? String(props.configs.placeholder) : undefined}
          placeholderTextColor={theme.colorMuted}
          accessibilityLabel={props.configs.label ? String(props.configs.label) : undefined}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          submitBehavior="submit"
          style={{
            flexGrow: 1,
            minWidth: 120,
            fontSize: 15,
            color: theme.colorText,
            paddingHorizontal: theme.spacing / 2,
            paddingVertical: theme.spacing / 2,
          }}
        />
      </View>
    </Field>
  )
}

export const tagsBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'tags',
  render: (props) => <TagsControl {...props} />,
})
