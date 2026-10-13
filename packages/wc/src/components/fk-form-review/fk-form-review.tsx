import { Component, Event, Listen, Prop, State, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { flaggedKeys } from '@streamline-pulse/formkrafter-core';
import type { BrickSpec, FieldAnnotations } from '@streamline-pulse/formkrafter-core';
import type { BrickReviewChangeDetail, ReviewChangeDetail } from '../../utils/events';

/**
 * A filled form, read-only, where a reviewer flags fields as incorrect and
 * comments them. Rendering is delegated to fk-form-render; this element only
 * holds the review map and emits it.
 */
@Component({
  tag: 'fk-form-review',
  shadow: false,
})
export class FkFormReview {
  @Prop() spec!: BrickSpec;
  @Prop() data?: Record<string, unknown>;
  @Prop() context?: Record<string, unknown>;
  @Prop() locale?: string;
  /** Existing annotations to start from (by brick key). */
  @Prop() reviews?: FieldAnnotations;

  @Event() reviewChange!: EventEmitter<ReviewChangeDetail>;

  @State() current: FieldAnnotations = {};

  componentWillLoad() {
    this.current = { ...(this.reviews ?? {}) };
  }

  @Watch('reviews')
  syncReviews(next?: FieldAnnotations) {
    this.current = { ...(next ?? {}) };
  }

  @Listen('brickReviewChange')
  handleBrickReviewChange(event: CustomEvent<BrickReviewChangeDetail>) {
    event.stopPropagation();
    const { key, annotation } = event.detail;
    const next = { ...this.current };
    if (annotation.incorrect !== true && !annotation.comment) delete next[key];
    else next[key] = annotation;
    this.current = next;
    this.reviewChange.emit({ reviews: next, flagged: flaggedKeys(next) });
  }

  render() {
    if (!this.spec) return null;
    return (
      <fk-form-render
        class="fk-form--review"
        spec={this.spec}
        data={this.data}
        context={this.context}
        locale={this.locale}
        readOnly={true}
        reviewable={true}
        annotations={this.current}
      />
    );
  }
}
