import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  PLATFORM_ID,
  signal,
  NgZone
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface CipherRevealLine {
  text: string;
  class?: string;
}

export interface CipherCharState {
  targetChar: string;
  displayChar: string;
  isScrambled: boolean;
}

export interface ProcessedLine {
  class: string;
  chars: CipherCharState[];
}

@Component({
  selector: 'gc-cipher-reveal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cipher-reveal.component.html',
  styleUrl: './cipher-reveal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CipherRevealComponent implements OnInit, OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  @Input() lines: (string | CipherRevealLine)[] = [];
  @Input() text = '';
  @Input() charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}—=+*^?#';
  @Input() duration = 1500;
  @Input() delay = 100;
  @Input() scrambleColor = 'var(--gc-primary-light)';
  @Input() scrambleOpacity = 0.85;
  @Input() order: 'left' | 'right' | 'random' = 'left';
  @Input() hover = true;
  @Input() autoStart = true;

  readonly displayLines = signal<ProcessedLine[]>([]);
  private isAnimating = false;
  private animFrameId: number | null = null;
  private startTimeoutId: ReturnType<typeof setTimeout> | null = null;

  get fullText(): string {
    const rawLines = this.getRawLines();
    return rawLines.map((l) => l.text).join(' ');
  }

  ngOnInit(): void {
    this.buildInitialLines();
    if (this.autoStart) {
      this.startAnimation();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['lines'] || changes['text']) &&
      !changes['lines']?.firstChange &&
      !changes['text']?.firstChange
    ) {
      this.buildInitialLines();
      if (this.autoStart) {
        this.startAnimation();
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanupAnimation();
  }

  onMouseEnter(): void {
    if (this.hover && !this.isAnimating) {
      this.replay();
    }
  }

  replay(): void {
    this.cleanupAnimation();
    this.startAnimation(true);
  }

  resolveAll(): void {
    this.cleanupAnimation();
    this.buildInitialLines(false);
    this.cdr.markForCheck();
  }

  private getRawLines(): CipherRevealLine[] {
    if (this.lines && this.lines.length > 0) {
      return this.lines.map((item) =>
        typeof item === 'string' ? { text: item } : item
      );
    }
    if (this.text) {
      return this.text.split('\n').map((t) => ({ text: t }));
    }
    return [];
  }

  private getRandomChar(): string {
    const chars = this.charset || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  private buildInitialLines(scrambled = false): void {
    const raw = this.getRawLines();
    const processed: ProcessedLine[] = raw.map((line) => ({
      class: line.class || '',
      chars: line.text.split('').map((char) => ({
        targetChar: char,
        displayChar: char === ' ' ? ' ' : (scrambled ? this.getRandomChar() : char),
        isScrambled: scrambled && char !== ' '
      }))
    }));
    this.displayLines.set(processed);
  }

  private cleanupAnimation(): void {
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.startTimeoutId !== null) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
    this.isAnimating = false;
  }

  startAnimation(force = false): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.buildInitialLines(false);
      return;
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced && !force) {
        this.buildInitialLines(false);
        return;
      }
    }

    this.cleanupAnimation();
    this.buildInitialLines(true);
    this.cdr.markForCheck();

    const raw = this.getRawLines();
    const totalChars: { lineIdx: number; charIdx: number; char: string }[] = [];
    raw.forEach((line, lIdx) => {
      line.text.split('').forEach((char, cIdx) => {
        if (char !== ' ') {
          totalChars.push({ lineIdx: lIdx, charIdx: cIdx, char });
        }
      });
    });

    if (totalChars.length === 0) {
      this.buildInitialLines(false);
      return;
    }

    // Determine resolve index sequence based on order
    const sequence = totalChars.map((_, i) => i);
    if (this.order === 'right') {
      sequence.reverse();
    } else if (this.order === 'random') {
      for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
      }
    }

    const totalNonSpace = totalChars.length;
    const duration = Math.max(300, this.duration);
    const delay = Math.max(0, this.delay);

    // Map each char to its reveal time offset
    const revealTimes = new Map<number, number>();
    sequence.forEach((charIndexInTotal, rank) => {
      const revealAt = delay + (rank / totalNonSpace) * duration;
      revealTimes.set(charIndexInTotal, revealAt);
    });

    this.isAnimating = true;

    this.ngZone.runOutsideAngular(() => {
      const startTime = performance.now();
      let lastScrambleTick = 0;
      const scrambleInterval = 40; // ms between random character shifts

      const animate = (now: number) => {
        const elapsed = now - startTime;
        let allResolved = true;
        const shouldShuffle = now - lastScrambleTick >= scrambleInterval;
        if (shouldShuffle) {
          lastScrambleTick = now;
        }

        const currentLines = this.displayLines();
        let changed = false;

        let flatIndex = 0;
        const newLines: ProcessedLine[] = currentLines.map((line) => {
          let lineChanged = false;
          const newChars = line.chars.map((charState) => {
            if (charState.targetChar === ' ') {
              return charState;
            }

            const currentFlatIndex = flatIndex++;
            const revealAt = revealTimes.get(currentFlatIndex) ?? 0;

            if (elapsed >= revealAt) {
              if (charState.isScrambled || charState.displayChar !== charState.targetChar) {
                lineChanged = true;
                changed = true;
                return {
                  ...charState,
                  displayChar: charState.targetChar,
                  isScrambled: false
                };
              }
              return charState;
            } else {
              allResolved = false;
              if (shouldShuffle) {
                lineChanged = true;
                changed = true;
                return {
                  ...charState,
                  displayChar: this.getRandomChar(),
                  isScrambled: true
                };
              }
              return charState;
            }
          });

          return lineChanged ? { ...line, chars: newChars } : line;
        });

        if (changed) {
          this.displayLines.set(newLines);
          this.cdr.markForCheck();
        }

        if (allResolved && elapsed >= delay + duration) {
          this.isAnimating = false;
          this.buildInitialLines(false);
          this.cdr.markForCheck();
          return;
        }

        this.animFrameId = requestAnimationFrame(animate);
      };

      this.startTimeoutId = setTimeout(() => {
        this.animFrameId = requestAnimationFrame(animate);
      }, delay);
    });
  }
}

