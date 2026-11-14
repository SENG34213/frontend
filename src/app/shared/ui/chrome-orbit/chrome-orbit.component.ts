import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnDestroy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gc-chrome-orbit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chrome-orbit.component.html',
  styleUrl: './chrome-orbit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChromeOrbitComponent implements OnDestroy {
  @Input() size = 410; // width/height in px
  @Input() ringCount = 3; // 2, 3, or 4 rings
  @Input() interactive = true;
  @Input() autoRevert = true;
  @Input() autoRevertDelay = 5000; // ms to return to gyroscope mode
  @Input() chromeColor = '#60a5fa'; // Cyber Blue
  @Input() accentColor = '#8b5cf6'; // Neon Purple

  @Output() haloChange = new EventEmitter<boolean>();

  readonly isHalo = signal<boolean>(false);
  private revertTimeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.revertTimeoutId) {
      clearTimeout(this.revertTimeoutId);
      this.revertTimeoutId = null;
    }
  }

  toggleHalo(event?: Event): void {
    if (!this.interactive) return;

    // If click originated from interactive elements inside projected content, don't hijack it
    if (event) {
      const target = event.target as HTMLElement;
      if (
        target.closest('.orbit-content') ||
        target.closest('.hero-event-card')
      ) {
        return;
      }
    }

    const nextState = !this.isHalo();
    this.isHalo.set(nextState);
    this.haloChange.emit(nextState);

    if (this.revertTimeoutId) {
      clearTimeout(this.revertTimeoutId);
      this.revertTimeoutId = null;
    }

    if (nextState && this.autoRevert && this.autoRevertDelay > 0) {
      this.revertTimeoutId = setTimeout(() => {
        this.isHalo.set(false);
        this.haloChange.emit(false);
        this.revertTimeoutId = null;
      }, this.autoRevertDelay);
    }
  }

  setHalo(active: boolean): void {
    this.isHalo.set(active);
    this.haloChange.emit(active);
  }
}

