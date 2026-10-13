import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  InputComponent,
  SelectComponent,
  CardComponent,
  BadgeComponent,
  ModalComponent,
  ToastService,
  SkeletonComponent,
  EmptyStateComponent,
  PaginationComponent,
  TabsComponent,
  TabItem,
  SelectOption
} from '../../shared/ui';

@Component({
  selector: 'gc-styleguide',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    CardComponent,
    BadgeComponent,
    ModalComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PaginationComponent,
    TabsComponent
  ],
  templateUrl: './styleguide.component.html',
  styleUrl: './styleguide.component.scss'
})
export class StyleguideComponent {
  readonly toastService = inject(ToastService);

  demoText = '';
  demoPass = '';
  selectedStation = '';
  isModalOpen = signal(false);
  activeTab = signal('all');
  currentPage = signal(0);

  stationOptions: SelectOption[] = [
    { value: 'ps5-01', label: 'PlayStation 5 Pro #01' },
    { value: 'ps5-02', label: 'PlayStation 5 Pro #02' },
    { value: 'xbox-01', label: 'Xbox Series X #01' },
    { value: 'pc-01', label: 'Esports Rig RTX 4090 #01' }
  ];

  demoTabs: TabItem[] = [
    { id: 'all', label: 'All Stations', badge: 12 },
    { id: 'consoles', label: 'PlayStation & Xbox', badge: 8 },
    { id: 'pc', label: 'PC Esports Rigs', badge: 4 }
  ];

  triggerToast(msg: string): void {
    this.toastService.info(msg);
  }

  onConfirmBooking(): void {
    this.isModalOpen.set(false);
    this.toastService.success('Slot booked and confirmed on staging!');
  }
}
