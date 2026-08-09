/**
 * The file brick, on a separate entry point on purpose: it needs
 * expo-document-picker, a native module Metro resolves statically.
 * Applications that want it install the picker and call
 * registerNativeFileBrick(); everyone else never resolves it.
 *
 * Uploads go through core's fileUploadService — the same injection point
 * as the web brick — and the stored value has the same UploadedFile shape.
 */
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { fkT, services } from '@streamline-pulse/formkrafter-core'
import type { FileLike, UploadedFile } from '@streamline-pulse/formkrafter-core'
import { createNativeBrick, registerNativeBrick } from './registry.js'
import type { NativeBrick, NativeBrickProps } from './registry.js'
import { useFkTheme } from './theme.js'
import { Field } from './bricks/field.js'

const asFileLike = (asset: DocumentPicker.DocumentPickerAsset): FileLike => ({
  name: asset.name,
  type: asset.mimeType ?? 'application/octet-stream',
  size: asset.size ?? 0,
  arrayBuffer: () => fetch(asset.uri).then((response) => response.arrayBuffer()),
})

function FileControl(props: NativeBrickProps) {
  const theme = useFkTheme()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>()

  const multiple = props.configs.multiple === true
  const files: UploadedFile[] = Array.isArray(props.data)
    ? (props.data as UploadedFile[])
    : props.data
      ? [props.data as UploadedFile]
      : []

  const emit = (next: UploadedFile[]) => {
    props.onDataChange(multiple ? next : (next[0] ?? undefined))
  }

  const pick = async () => {
    const accept =
      typeof props.configs.accept === 'string' && props.configs.accept
        ? props.configs.accept.split(',').map((type) => type.trim())
        : undefined
    const picked = await DocumentPicker.getDocumentAsync({
      multiple,
      type: accept,
      copyToCacheDirectory: true,
    })
    if (picked.canceled) return

    setUploading(true)
    setError(undefined)
    try {
      const uploadUrl =
        typeof props.configs.uploadUrl === 'string' && props.configs.uploadUrl
          ? props.configs.uploadUrl
          : undefined
      const uploaded: UploadedFile[] = []
      for (const asset of picked.assets) {
        uploaded.push(
          await services.fileUploadService.upload(asFileLike(asset), {
            url: uploadUrl,
          }),
        )
      }
      emit(multiple ? [...files, ...uploaded] : uploaded)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field label={props.configs.label} error={props.error ?? error}>
      <View style={{ gap: theme.spacing / 2 }}>
        {files.map((file) => (
          <View
            key={file.url ?? file.name}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing,
              borderWidth: 1,
              borderColor: theme.colorBorder,
              borderRadius: theme.radius,
              paddingHorizontal: theme.spacing * 1.5,
              paddingVertical: theme.spacing,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ flexShrink: 1, fontSize: 14, color: theme.colorText }}
            >
              {file.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={fkT('file.remove')}
              disabled={props.disabled}
              onPress={() => emit(files.filter((entry) => entry !== file))}
            >
              <Text style={{ color: theme.colorMuted }}>✕</Text>
            </Pressable>
          </View>
        ))}

        {uploading ? (
          <ActivityIndicator style={{ alignSelf: 'flex-start', padding: theme.spacing }} />
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={props.disabled}
            onPress={pick}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: theme.spacing * 1.5,
              paddingVertical: theme.spacing,
              borderRadius: theme.radius,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.colorPrimary,
              opacity: props.disabled ? 0.5 : 1,
            }}
          >
            <Text style={{ color: theme.colorPrimary, fontWeight: '600' }}>
              {files.length && multiple ? fkT('file.addAnother') : fkT('file.choose')}
            </Text>
          </Pressable>
        )}
      </View>
    </Field>
  )
}

export const fileBrick: NativeBrick = createNativeBrick({
  type: 'input',
  id: 'file',
  render: (props) => <FileControl {...props} />,
})

export function registerNativeFileBrick(): void {
  registerNativeBrick(fileBrick)
}
