import { Switch, Text, TextInput, View } from 'react-native'
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { fkT } from '@streamline-pulse/formkrafter-core'
import type { FieldAnnotation } from '@streamline-pulse/formkrafter-core'
import { useFkTheme } from '../theme.js'
import { FieldReviewContext } from '../renderer/review-context.js'

export function Field(props: {
  label?: unknown
  error?: string
  required?: boolean
  inline?: boolean
  children: ReactNode
  /** Override what the renderer provides; custom bricks may pass their own. */
  annotation?: FieldAnnotation
  note?: FieldAnnotation
  review?: { value: FieldAnnotation; onChange: (next: FieldAnnotation) => void }
}) {
  const theme = useFkTheme()
  const fromRenderer = useContext(FieldReviewContext)
  const annotation = props.annotation ?? fromRenderer.annotation
  const note = props.note ?? fromRenderer.note
  const review = props.review ?? fromRenderer.review
  const flagged = review ? review.value.incorrect === true : annotation?.incorrect === true
  const label =
    props.label === undefined || props.label === '' ? undefined : String(props.label)

  const notes = (
    <>
      {note && (note.incorrect === true || note.comment) ? (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.colorMuted,
            paddingHorizontal: theme.spacing,
            paddingVertical: theme.spacing / 2,
            gap: theme.spacing / 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colorMuted }}>
            {fkT('review.previous')}
          </Text>
          {note.comment ? (
            <Text style={{ fontSize: 13, color: theme.colorText }}>{note.comment}</Text>
          ) : null}
        </View>
      ) : null}
      {review ? (
        <View style={{ gap: theme.spacing / 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing }}>
            <Switch
              value={flagged}
              accessibilityLabel={fkT('review.incorrect')}
              onValueChange={(value) => review.onChange({ ...review.value, incorrect: value })}
            />
            <Text style={{ fontSize: 13, color: theme.colorMuted }}>{fkT('review.incorrect')}</Text>
          </View>
          {flagged ? (
            <TextInput
              multiline
              value={review.value.comment ?? ''}
              placeholder={fkT('review.comment')}
              placeholderTextColor={theme.colorMuted}
              accessibilityLabel={fkT('review.comment')}
              onChangeText={(text) => review.onChange({ ...review.value, comment: text })}
              style={{
                borderWidth: 1,
                borderColor: theme.colorBorder,
                borderRadius: theme.radius,
                backgroundColor: theme.colorSurface,
                color: theme.colorText,
                paddingHorizontal: theme.spacing * 1.5,
                paddingVertical: theme.spacing,
                fontSize: 14,
                minHeight: 56,
              }}
            />
          ) : null}
        </View>
      ) : annotation && (annotation.incorrect === true || annotation.comment) ? (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.colorDanger,
            paddingHorizontal: theme.spacing,
            paddingVertical: theme.spacing / 2,
            gap: theme.spacing / 4,
          }}
        >
          {annotation.incorrect === true ? (
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colorDanger }}>
              {fkT('review.flagged')}
            </Text>
          ) : null}
          {annotation.comment ? (
            <Text style={{ fontSize: 13, color: theme.colorText }}>{annotation.comment}</Text>
          ) : null}
        </View>
      ) : null}
    </>
  )

  return (
    <View
      style={
        props.inline
          ? {
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing,
            }
          : { gap: theme.spacing / 2 }
      }
    >
      {label ? (
        <Text
          accessibilityLabel={
            props.required ? `${label} ${fkT('field.required')}` : undefined
          }
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: flagged ? theme.colorDanger : theme.colorText,
          }}
        >
          {label}
          {props.required ? (
            <Text style={{ color: theme.colorDanger }}> *</Text>
          ) : null}
        </Text>
      ) : null}
      {props.children}
      {props.error ? (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: 12, color: theme.colorDanger }}
        >
          {props.error}
        </Text>
      ) : null}
      {notes}
    </View>
  )
}
