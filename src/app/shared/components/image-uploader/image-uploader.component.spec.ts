import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange, ElementRef } from '@angular/core';
import { ImageUploaderComponent } from './image-uploader.component';

describe('ImageUploaderComponent', () => {
  let component: ImageUploaderComponent;
  let fixture: ComponentFixture<ImageUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageUploaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ImageUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
    expect(component.hasImage()).toBeFalse();
  });

  it('should update currentImage and directUrlInput on ngOnChanges with http URL', () => {
    const url = 'https://example.com/cover.png';
    component.ngOnChanges({
      value: new SimpleChange('', url, true)
    });
    expect(component.currentImage()).toBe(url);
    expect(component.directUrlInput()).toBe(url);
    expect(component.hasImage()).toBeTrue();
  });

  it('should update currentImage on ngOnChanges with non-http value', () => {
    const dataUrl = 'data:image/png;base64,abc';
    component.ngOnChanges({
      value: new SimpleChange('', dataUrl, false)
    });
    expect(component.currentImage()).toBe(dataUrl);
    expect(component.directUrlInput()).toBe('');
    expect(component.hasImage()).toBeTrue();
  });

  it('should handle dragover, dragleave and drop events', () => {
    const preventSpy = jasmine.createSpy('preventDefault');
    const stopSpy = jasmine.createSpy('stopPropagation');
    const mockDragEvent = {
      preventDefault: preventSpy,
      stopPropagation: stopSpy,
      dataTransfer: { files: [] }
    } as unknown as DragEvent;

    component.onDragOver(mockDragEvent);
    expect(component.isDragging()).toBeTrue();

    component.onDragLeave(mockDragEvent);
    expect(component.isDragging()).toBeFalse();

    const mockFile = new File(['dummy'], 'test.png', { type: 'image/png' });
    const dropEvent = {
      preventDefault: preventSpy,
      stopPropagation: stopSpy,
      dataTransfer: { files: [mockFile] }
    } as unknown as DragEvent;

    const compInternal = component as unknown as { processFile: (file: File) => void };
    spyOn(compInternal, 'processFile');
    component.onDrop(dropEvent);
    expect(component.isDragging()).toBeFalse();
    expect(compInternal.processFile).toHaveBeenCalledWith(mockFile);
  });

  it('should trigger file input click', () => {
    const clickSpy = jasmine.createSpy('click');
    component.fileInputRef = {
      nativeElement: { click: clickSpy } as unknown as HTMLInputElement
    } as ElementRef<HTMLInputElement>;

    component.triggerFileInput();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should handle onFileSelected when file is chosen', () => {
    const mockFile = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
    const mockInput = {
      files: [mockFile],
      value: 'C:\\fakepath\\photo.jpg'
    } as unknown as HTMLInputElement;

    const compInternal = component as unknown as { processFile: (file: File) => void };
    spyOn(compInternal, 'processFile');
    component.onFileSelected({ target: mockInput } as unknown as Event);

    expect(compInternal.processFile).toHaveBeenCalledWith(mockFile);
    expect(mockInput.value).toBe('');
  });

  it('should reject invalid file types with error message', () => {
    const textFile = new File(['hello'], 'doc.txt', { type: 'text/plain' });
    const compInternal = component as unknown as { processFile: (file: File) => void };
    compInternal.processFile(textFile);

    expect(component.errorMessage()).toBe('Please select a valid image file (PNG, JPG, WebP).');
    expect(component.isProcessing()).toBeFalse();
  });

  it('should reject oversized files (> 15MB) with error message', () => {
    const largeFile = new File([''], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 16 * 1024 * 1024 });

    const compInternal = component as unknown as { processFile: (file: File) => void };
    compInternal.processFile(largeFile);
    expect(component.errorMessage()).toBe('File is too large (max 15MB).');
  });

  it('should apply valid direct URL and emit change events', () => {
    spyOn(component.valueChange, 'emit');
    spyOn(component.imageSelected, 'emit');

    component.directUrlInput.set('https://images.unsplash.com/photo-1');
    component.applyDirectUrl();

    expect(component.currentImage()).toBe('https://images.unsplash.com/photo-1');
    expect(component.valueChange.emit).toHaveBeenCalledWith('https://images.unsplash.com/photo-1');
    expect(component.imageSelected.emit).toHaveBeenCalledWith('https://images.unsplash.com/photo-1');
  });

  it('should clear image when applying empty direct URL', () => {
    spyOn(component, 'clearImage');
    component.directUrlInput.set('   ');
    component.applyDirectUrl();

    expect(component.clearImage).toHaveBeenCalled();
  });

  it('should reset state on clearImage', () => {
    spyOn(component.valueChange, 'emit');
    spyOn(component.imageSelected, 'emit');

    component.currentImage.set('https://example.com/img.jpg');
    component.directUrlInput.set('https://example.com/img.jpg');
    component.errorMessage.set('Some error');

    const mockEvent = { stopPropagation: jasmine.createSpy('stopPropagation') } as unknown as Event;
    component.clearImage(mockEvent);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(component.currentImage()).toBe('');
    expect(component.directUrlInput()).toBe('');
    expect(component.errorMessage()).toBeNull();
    expect(component.valueChange.emit).toHaveBeenCalledWith('');
    expect(component.imageSelected.emit).toHaveBeenCalledWith('');
  });
});
