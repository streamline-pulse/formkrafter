import { forwardRef, useImperativeHandle } from 'react'
import { Text, View } from 'react-native'
import { fkT } from '@streamline-pulse/formkrafter-core'
import type {
  BrickSpec,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core'
import { useFormEngine } from '../engine/use-form-engine'
import type { FormEngineCallbacks } from '../engine/form-engine'
import { registerDefaultNativeBricks } from '../bricks/defaults'
import { BrickRenderer } from './brick-renderer'
import { useFkTheme } from '../theme'

export interface FormRendererProps extends FormEngineCallbacks {
  spec: BrickSpec
  data?: Record<string, unknown>
  locale?: string
}

export interface FormRendererHandle {
  validate: () => ValidationResult
  submit: () => ValidationResult
}

export const FormRenderer = forwardRef<FormRendererHandle, FormRendererProps>(
  function FormRenderer(props, ref) {
    registerDefaultNativeBricks()
    const theme = useFkTheme()
    const { engine, spec, data, errors, expanding, expandError } =
      useFormEngine(props)

    useImperativeHandle(ref, () => ({
      validate: () => engine.validate(),
      submit: () => engine.submit(),
    }), [engine])

    if (expanding) {
      return <Text style={{ color: theme.colorMuted }}>{fkT('nestedForm.loading')}</Text>
    }

    return (
      <View style={{ gap: theme.spacing }}>
        {expandError ? (
          <Text accessibilityRole="alert" style={{ color: theme.colorDanger }}>
            {expandError}
          </Text>
        ) : null}
        <BrickRenderer
          spec={spec}
          data={data}
          errors={errors}
          locale={props.locale}
          engine={engine}
        />
      </View>
    )
  },
)
