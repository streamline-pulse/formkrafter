import { Pressable, Text, View } from 'react-native'
import {
  Field,
  createNativeBrick,
  registerNativeBrick,
  useFkTheme,
} from '@streamline-pulse/formkrafter-react-native'
import type { NativeBrickProps } from '@streamline-pulse/formkrafter-react-native'

function Stars(props: NativeBrickProps) {
  const theme = useFkTheme()
  const value = typeof props.data === 'number' ? props.data : 0

  return (
    <Field label={props.configs.label} error={props.error}>
      <View style={{ flexDirection: 'row', gap: theme.spacing }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} / 5`}
            disabled={props.disabled}
            onPress={() => props.onDataChange(star)}
          >
            <Text
              style={{
                fontSize: 30,
                color: star <= value ? theme.colorPrimary : theme.colorMuted,
              }}
            >
              {star <= value ? '★' : '☆'}
            </Text>
          </Pressable>
        ))}
      </View>
    </Field>
  )
}

// Registered before the first render — the defaults never clobber it.
export function registerRatingBrick(): void {
  registerNativeBrick(
    createNativeBrick({
      type: 'input',
      id: 'rating',
      render: (props) => <Stars {...props} />,
    }),
  )
}
