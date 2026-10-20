import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../ui/toast/toast.service';
import { ImageUploaderComponent } from '../image-uploader/image-uploader.component';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { BadgeComponent } from '../../ui/badge/badge.component';

@Component({
  selector: 'gc-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    ButtonComponent,
    BadgeComponent,
    ImageUploaderComponent
  ],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss'
})
export class ProfileModalComponent implements OnChanges {
  readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();

  readonly fullName = signal<string>('');
  readonly phoneNumber = signal<string>('');
  readonly avatarUrl = signal<string>('');
  readonly email = signal<string>('');
  readonly role = signal<string>('CUSTOMER');

  readonly isSaving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.populateData();
    }
  }

  private populateData(): void {
    const profile = this.authService.userProfile();
    const tokenUser = this.authService.currentUser();

    this.fullName.set(profile?.fullName || tokenUser?.fullName || '');
    this.phoneNumber.set(profile?.phoneNumber || '');
    this.avatarUrl.set(profile?.avatarUrl || tokenUser?.avatarUrl || '');
    this.email.set(profile?.email || tokenUser?.email || tokenUser?.sub || '');
    this.role.set(profile?.role || tokenUser?.role || 'CUSTOMER');
    this.errorMessage.set(null);

    // Refresh profile from server if empty
    if (!profile && this.authService.isAuthenticated()) {
      this.authService.getMyProfile().subscribe({
        next: (p) => {
          this.fullName.set(p.fullName || '');
          this.phoneNumber.set(p.phoneNumber || '');
          this.avatarUrl.set(p.avatarUrl || '');
          this.email.set(p.email || '');
          this.role.set(p.role || 'CUSTOMER');
        }
      });
    }
  }

  onImageChange(newAvatar: string): void {
    this.avatarUrl.set(newAvatar);
  }

  saveProfile(): void {
    const name = this.fullName().trim();
    if (!name) {
      this.errorMessage.set('Full name cannot be empty.');
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);

    this.authService.updateMyProfile({
      fullName: name,
      phoneNumber: this.phoneNumber().trim() || undefined,
      avatarUrl: this.avatarUrl().trim() || undefined
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toast.success('Profile updated successfully!');
        this.closeModal();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.message || err?.message || 'Failed to update profile.');
        this.toast.error('Failed to update profile');
      }
    });
  }

  closeModal(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.closed.emit();
  }
}
