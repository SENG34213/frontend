import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type AspectRatioType = 'square' | 'wide' | 'tall';

@Component({
  selector: 'gc-image-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-uploader.component.html',
  styleUrl: './image-uploader.component.scss'
})
export class ImageUploaderComponent implements OnChanges {
  @Input() label = 'Upload Image';
  @Input() value = '';
  @Input() aspectRatio: AspectRatioType = 'square';
  @Input() placeholder = 'Drag & drop image here or click to browse';
  @Input() helpText = 'JPG, PNG, WebP supported. Automatically compressed.';
  @Input() maxDimension = 800;
  @Input() showUrlToggle = true;

  @Output() valueChange = new EventEmitter<string>();
  @Output() imageSelected = new EventEmitter<string>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  readonly currentImage = signal<string>('');
  readonly isDragging = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly activeTab = signal<'file' | 'url'>('file');
  readonly directUrlInput = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  readonly hasImage = computed(() => !!this.currentImage());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const val = changes['value'].currentValue || '';
      this.currentImage.set(val);
      if (val.startsWith('http://') || val.startsWith('https://')) {
        this.directUrlInput.set(val);
      }
    }
  }

  // ── Drag & Drop Handlers ───────────────────────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  // ── File Picker Handlers ───────────────────────────────────────────────────

  triggerFileInput(): void {
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
      // Reset input value so re-selecting same file triggers change
      input.value = '';
    }
  }

  // ── Compression Logic ──────────────────────────────────────────────────────

  private processFile(file: File): void {
    this.errorMessage.set(null);

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Max 15MB file size limit before compression
    if (file.size > 15 * 1024 * 1024) {
      this.errorMessage.set('File is too large (max 15MB).');
      return;
    }

    this.isProcessing.set(true);

    const reader = new FileReader();
    reader.onerror = () => {
      this.isProcessing.set(false);
      this.errorMessage.set('Failed to read image file.');
    };

    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();

      img.onerror = () => {
        this.isProcessing.set(false);
        this.errorMessage.set('Invalid image format.');
      };

      img.onload = () => {
        try {
          const maxDim = this.aspectRatio === 'square' ? Math.min(this.maxDimension, 400) : this.maxDimension;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            this.emitImage(src);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          let compressed = '';
          try {
            compressed = canvas.toDataURL('image/webp', 0.82);
            if (!compressed.startsWith('data:image/webp')) {
              compressed = canvas.toDataURL('image/jpeg', 0.82);
            }
          } catch {
            compressed = canvas.toDataURL('image/jpeg', 0.82);
          }

          this.emitImage(compressed);
        } catch {
          this.emitImage(src);
        } finally {
          this.isProcessing.set(false);
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  }

  // ── Direct URL Handlers ────────────────────────────────────────────────────

  applyDirectUrl(): void {
    const url = this.directUrlInput().trim();
    if (!url) {
      this.clearImage();
      return;
    }
    this.emitImage(url);
  }

  // ── Common Actions ─────────────────────────────────────────────────────────

  clearImage(event?: Event): void {
    if (event) event.stopPropagation();
    this.currentImage.set('');
    this.directUrlInput.set('');
    this.errorMessage.set(null);
    this.valueChange.emit('');
    this.imageSelected.emit('');
  }

  private emitImage(data: string): void {
    this.currentImage.set(data);
    this.valueChange.emit(data);
    this.imageSelected.emit(data);
  }
}
