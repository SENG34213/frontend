import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonShape = 'text' | 'rect' | 'circle';

@Component({
  selector: 'gc-skeleton',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss'
})
export class SkeletonComponent {
  @Input() shape: SkeletonShape = 'text';
  @Input() width = '100%';
  @Input() height?: string;
}
