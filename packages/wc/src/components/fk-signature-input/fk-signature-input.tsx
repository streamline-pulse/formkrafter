import { Component, Event, Prop, Watch, h } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';

@Component({
  tag: 'fk-signature-input',
  styleUrl: 'fk-signature-input.css',
  scoped: true,
})
export class FkSignatureInput {
  @Prop() value?: string;
  @Prop() disabled = false;

  @Event() signatureChange!: EventEmitter<string | undefined>;

  private canvas?: HTMLCanvasElement;
  private drawing = false;
  private lastEmitted?: string;

  componentDidLoad() {
    this.restore();
  }

  @Watch('value')
  onValueChange(next?: string) {
    if (next === this.lastEmitted) return;
    this.restore();
  }

  private context(): CanvasRenderingContext2D | undefined {
    return this.canvas?.getContext('2d') ?? undefined;
  }

  private restore() {
    const ctx = this.context();
    if (!ctx || !this.canvas) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.value) return;

    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0);
    image.src = this.value;
  }

  private position(event: PointerEvent): [number, number] {
    const rect = this.canvas!.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) * this.canvas!.width) / rect.width,
      ((event.clientY - rect.top) * this.canvas!.height) / rect.height,
    ];
  }

  private start = (event: PointerEvent) => {
    if (this.disabled || !this.canvas) return;

    this.drawing = true;
    this.canvas.setPointerCapture(event.pointerId);

    const ctx = this.context();
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = getComputedStyle(this.canvas).color;
    ctx.beginPath();
    ctx.moveTo(...this.position(event));
  };

  private move = (event: PointerEvent) => {
    if (!this.drawing) return;

    const ctx = this.context();
    if (!ctx) return;

    ctx.lineTo(...this.position(event));
    ctx.stroke();
  };

  private end = () => {
    if (!this.drawing || !this.canvas) return;

    this.drawing = false;
    this.lastEmitted = this.canvas.toDataURL('image/png');
    this.signatureChange.emit(this.lastEmitted);
  };

  private clear = () => {
    const ctx = this.context();
    if (!ctx || !this.canvas) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.lastEmitted = undefined;
    this.signatureChange.emit(undefined);
  };

  render() {
    return (
      <div class={{ 'fk-signature': true, 'fk-signature--disabled': this.disabled }}>
        <canvas
          class="fk-signature__canvas"
          width={480}
          height={140}
          ref={(element) => (this.canvas = element)}
          onPointerDown={this.start}
          onPointerMove={this.move}
          onPointerUp={this.end}
          onPointerLeave={this.end}
        ></canvas>
        <button
          type="button"
          class="fk-signature__clear"
          disabled={this.disabled}
          onClick={this.clear}
        >
          Clear
        </button>
      </div>
    );
  }
}
