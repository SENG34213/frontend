import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  inject,
  PLATFORM_ID,
  NgZone
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type BlinkingSquaresDirection = 'right' | 'left' | 'top' | 'bottom';

interface ActiveSquare {
  x: number;
  y: number;
  size: number;
  phase: number;
  freq: number;
}

function parseColor(color: string): { r: number; g: number; b: number } {
  if (!color) return { r: 96, g: 165, b: 250 }; // #60a5fa (--gc-primary-light)

  if (typeof window !== 'undefined' && color.startsWith('var(')) {
    const varName = color.slice(4, -1).trim();
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (resolved) {
      color = resolved;
    }
  }

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(hex, 16);
    if (!isNaN(num)) {
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }
  }

  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return {
      r: parseInt(match[0], 10),
      g: parseInt(match[1], 10),
      b: parseInt(match[2], 10)
    };
  }

  return { r: 96, g: 165, b: 250 };
}

function hash2D(x: number, y: number, seed = 0): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

@Component({
  selector: 'gc-blinking-squares',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blinking-squares.component.html',
  styleUrl: './blinking-squares.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlinkingSquaresComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  @ViewChild('containerRef') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() direction: BlinkingSquaresDirection = 'left';
  @Input() gridSize = 72;
  @Input() squareSize = 0.28;
  @Input() fadeStart = 0.05;
  @Input() fadeEnd = 0.85;
  @Input() falloff = 1.1;
  @Input() minBrightness = 0.18;
  @Input() twinkleSpeed = 1.2;
  @Input() twinkleStrength = 0.92;
  @Input() intensity = 1.0;
  @Input() opacity = 0.25;
  @Input() squareColor = '#60a5fa';
  @Input() backgroundColor = 'transparent';
  @Input() dpr = 1.5;

  private ctx: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animFrameId: number | null = null;
  private activeSquares: ActiveSquare[] = [];
  private parsedRgb = { r: 96, g: 165, b: 250 };
  private width = 0;
  private height = 0;

  ngOnInit(): void {
    this.parsedRgb = parseColor(this.squareColor);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initCanvas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['squareColor']) {
      this.parsedRgb = parseColor(this.squareColor);
    }
    if (
      changes['direction'] ||
      changes['gridSize'] ||
      changes['squareSize'] ||
      changes['fadeStart'] ||
      changes['fadeEnd'] ||
      changes['falloff']
    ) {
      this.rebuildGrid();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    const container = this.containerRef?.nativeElement;
    if (!canvas || !container) return;

    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateCanvasSize();
      });
      this.resizeObserver.observe(container);
    }

    this.updateCanvasSize();
    this.startAnimation();
  }

  private updateCanvasSize(): void {
    const container = this.containerRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!container || !canvas || !this.ctx) return;

    const rect = container.getBoundingClientRect();
    this.width = Math.floor(rect.width) || 300;
    this.height = Math.floor(rect.height) || 200;

    const maxDpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, this.dpr) : 1;
    canvas.width = Math.floor(this.width * maxDpr);
    canvas.height = Math.floor(this.height * maxDpr);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(maxDpr, maxDpr);

    this.rebuildGrid();
  }

  private rebuildGrid(): void {
    if (this.width <= 0 || this.height <= 0) return;

    const longAxis = Math.max(this.width, this.height);
    const validGridSize = Math.max(8, this.gridSize);
    const cellSize = longAxis / validGridSize;

    const cols = Math.ceil(this.width / cellSize);
    const rows = Math.ceil(this.height / cellSize);
    const clampedSquareRatio = Math.max(0.05, Math.min(0.98, this.squareSize));
    const sqDimension = cellSize * clampedSquareRatio;
    const offset = (cellSize - sqDimension) / 2;

    const squares: ActiveSquare[] = [];

    const fadeStart = Math.min(this.fadeStart, this.fadeEnd - 0.01);
    const fadeEnd = Math.max(this.fadeEnd, fadeStart + 0.01);
    const falloff = Math.max(0.1, this.falloff);

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cx = (c + 0.5) * cellSize;
        const cy = (r + 0.5) * cellSize;

        let p = 0;
        switch (this.direction) {
          case 'left':
            p = 1 - cx / this.width;
            break;
          case 'top':
            p = 1 - cy / this.height;
            break;
          case 'bottom':
            p = cy / this.height;
            break;
          case 'right':
          default:
            p = cx / this.width;
            break;
        }

        p = Math.max(0, Math.min(1, p));

        let density = 0;
        if (p <= fadeStart) {
          density = 0;
        } else if (p >= fadeEnd) {
          density = 1;
        } else {
          const t = (p - fadeStart) / (fadeEnd - fadeStart);
          density = Math.pow(t, falloff);
        }

        const roll = hash2D(c, r, 1);
        if (roll < density) {
          squares.push({
            x: c * cellSize + offset,
            y: r * cellSize + offset,
            size: sqDimension,
            phase: hash2D(c, r, 2) * Math.PI * 2,
            freq: this.twinkleSpeed * (0.8 + 0.4 * hash2D(c, r, 3))
          });
        }
      }
    }

    this.activeSquares = squares;
  }

  private startAnimation(): void {
    this.stopAnimation();

    let prefersReducedMotion = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    this.ngZone.runOutsideAngular(() => {
      const render = () => {
        if (!this.ctx) return;

        const nowSec = prefersReducedMotion ? 0 : performance.now() / 1000;

        if (this.backgroundColor && this.backgroundColor !== 'transparent') {
          this.ctx.fillStyle = this.backgroundColor;
          this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
          this.ctx.clearRect(0, 0, this.width, this.height);
        }

        const { r, g, b } = this.parsedRgb;
        const minB = Math.max(0, Math.min(1, this.minBrightness));
        const twStrength = Math.max(0, Math.min(1, this.twinkleStrength));
        const masterInt = Math.max(0, this.intensity);
        const masterOp = Math.max(0, Math.min(1, this.opacity));

        const len = this.activeSquares.length;
        for (let i = 0; i < len; i++) {
          const sq = this.activeSquares[i];
          const wave = 0.5 + 0.5 * Math.sin(nowSec * sq.freq * 2 * Math.PI + sq.phase);
          const brightness = minB + (1 - minB) * (1 - twStrength + twStrength * wave);
          const alpha = Math.max(0, Math.min(1, brightness * masterInt * masterOp));

          this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
          this.ctx.fillRect(sq.x, sq.y, sq.size, sq.size);
        }

        if (!prefersReducedMotion) {
          this.animFrameId = requestAnimationFrame(render);
        }
      };

      this.animFrameId = requestAnimationFrame(render);
    });
  }

  private stopAnimation(): void {
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private cleanup(): void {
    this.stopAnimation();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

