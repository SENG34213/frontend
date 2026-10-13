import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'gc-not-found',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  navigateHome(): void {
    if (this.authService.isAdmin()) {
      this.router.navigate(['/admin']);
    } else if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
