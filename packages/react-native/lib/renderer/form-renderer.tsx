import { forwardRef, useImperativeHandle } from 'react'
import { Text, View } from 'react-native'
import { fkT } from '@streamline-pulse/formkrafter-core'
import type {
  BrickSpec,
  FieldAnnotation,
  FieldAnnotations,
  ValidationResult,
} from '@streamline-pulse/formkrafter-core'
import { useFormEngine } from '../engine/use-form-engine.js'
import type { FormEngineCallbacks } from '../engine/form-engine.js'
import { registerDefaultNativeBricks } from '../bricks/defaults.js'
import { BrickRenderer } from './brick-renderer.js'
import { useFkTheme } from '../theme.js'

export interface FormRendererProps extends FormEngineCallbacks {
  spec: BrickSpec
  data?: Record<string, unknown>
  context?: Record<string, unknown>
  readOnly?: boolean
  locale?: string
  /** Reviewer notes shown under the matching fields (by brick key). */
  annotations?: FieldAnnotations
  /** An earlier review's verdicts, shown as muted reminders. */
  notes?: FieldAnnotations
  /** When set, only these keys stay editable; every other field is locked. */
  editableKeys?: string[]
  /** @internal Used by FormReview. */
  reviewable?: boolean
  /** @internal Used by FormReview. */
  onFieldReview?: (key: string, annotation: FieldAnnotation) => void
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

    if (!spec) return null

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
          context={props.context}
          readOnly={props.readOnly}
          errors={errors}
          locale={props.locale}
          engine={engine}
          annotations={props.annotations}
          notes={props.notes}
          editableKeys={props.editableKeys}
          reviewable={props.reviewable}
          onFieldReview={props.onFieldReview}
        />
      </View>
    )
  },
)
