import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { StationAdminService } from './station-admin.service';
import { GameAdminService } from '../games/game-admin.service';
import {
  Station,
  StationType,
  GameStationRequest,
  SlotAvailabilityResponse
} from '../../../shared/models';
import { GameTitle } from '../../../shared/models/game.model';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-admin-stations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    BadgeComponent,
    ModalComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-stations.component.html',
  styleUrl: './admin-stations.component.scss'
})
export class AdminStationsComponent implements OnInit, OnDestroy {
  private readonly stationAdminService = inject(StationAdminService);
  private readonly gameAdminService = inject(GameAdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly stations = signal<Station[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly actionInFlight = signal(false);

  // Station Games
  readonly stationGamesMap = signal<Record<string, GameTitle[]>>({});
  readonly allGames = signal<GameTitle[]>([]);
  readonly assignGamesModalOpen = signal(false);
  readonly targetStationForAssign = signal<Station | null>(null);
  readonly selectedGameIdsForStation = signal<string[]>([]);

  // Filters
  readonly searchQuery = signal('');
  readonly filterType = signal<string>('');
  readonly filterStatus = signal<string>('');
  readonly sortBy = signal<'code_asc' | 'code_desc' | 'rate_asc' | 'rate_desc'>('code_asc');

  // Modals & Panels
  readonly formModalOpen = signal(false);
  readonly isEditing = signal(false);
  readonly editingStationId = signal<string | null>(null);

  readonly deleteModalOpen = signal(false);
  readonly deletingStation = signal<Station | null>(null);

  readonly availabilityModalOpen = signal(false);
  readonly selectedStationForAvailability = signal<Station | null>(null);
  readonly availabilityDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly availabilitySlots = signal<SlotAvailabilityResponse[]>([]);
  readonly isAvailabilityLoading = signal(false);

  // ── Reactive Forms ─────────────────────────────────────────────────────────
  readonly stationForm = this.fb.group({
    stationCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
    type: ['CONSOLE' as StationType, [Validators.required]],
    hourlyRate: [650, [Validators.required, Validators.min(10)]],
    active: [true]
  });

  // ── Options ────────────────────────────────────────────────────────────────
  readonly typeOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Station Types' },
    { value: 'PC', label: 'PC Esports Rig' },
    { value: 'CONSOLE', label: 'Console (PS5 / Xbox)' },
    { value: 'VR', label: 'VR & Simulators' }
  ];

  readonly statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active Only' },
    { value: 'INACTIVE', label: 'Inactive / Maintenance' }
  ];

  readonly sortOptions = [
    { value: 'code_asc', label: 'Station Code (A-Z)' },
    { value: 'code_desc', label: 'Station Code (Z-A)' },
    { value: 'rate_asc', label: 'Hourly Rate (Low to High)' },
    { value: 'rate_desc', label: 'Hourly Rate (High to Low)' }
  ];

  // ── Computed Metrics & Filtered Data ───────────────────────────────────────
  readonly totalStations = computed(() => this.stations().length);
  readonly activeStationsCount = computed(() => this.stations().filter((s) => s.active).length);
  readonly pcStationsCount = computed(() =>
    this.stations().filter((s) => s.type === 'PC' || s.type === 'PC_ESPORTS').length
  );
  readonly consoleStationsCount = computed(() =>
    this.stations().filter((s) => s.type === 'CONSOLE' || s.type === 'PS5' || s.type === 'XBOX_SERIES_X' || s.type === 'VR' || s.type === 'RACING_SIM').length
  );

  readonly filteredStations = computed(() => {
    let list = this.stations();

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter((s) => {
        const code = (s.stationCode || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const type = (s.type || '').toLowerCase();
        const specs = (s.specifications || '').toLowerCase();
        return code.includes(query) || name.includes(query) || type.includes(query) || specs.includes(query);
      });
    }

    const typeFilt = this.filterType();
    if (typeFilt) {
      list = list.filter((s) => {
        if (typeFilt === 'CONSOLE') {
          return s.type === 'CONSOLE' || s.type === 'PS5' || s.type === 'XBOX_SERIES_X';
        }
        if (typeFilt === 'PC') {
          return s.type === 'PC' || s.type === 'PC_ESPORTS';
        }
        if (typeFilt === 'VR') {
          return s.type === 'VR' || s.type === 'RACING_SIM';
        }
        return s.type === typeFilt;
      });
    }

    const statusFilt = this.filterStatus();
    if (statusFilt === 'ACTIVE') {
      list = list.filter((s) => s.active);
    } else if (statusFilt === 'INACTIVE') {
      list = list.filter((s) => !s.active);
    }

    // Sort
    const sort = this.sortBy();
    return [...list].sort((a, b) => {
      const codeA = a.stationCode || a.name || '';
      const codeB = b.stationCode || b.name || '';
      if (sort === 'code_asc') return codeA.localeCompare(codeB);
      if (sort === 'code_desc') return codeB.localeCompare(codeA);
      if (sort === 'rate_asc') return (a.hourlyRate || 0) - (b.hourlyRate || 0);
      if (sort === 'rate_desc') return (b.hourlyRate || 0) - (a.hourlyRate || 0);
      return 0;
    });
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['type']) this.filterType.set(params['type']);
      if (params['status']) this.filterStatus.set(params['status']);
      if (params['search']) this.searchQuery.set(params['search']);
    });

    this.loadStations();
    this.loadAllGames();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── API Operations ─────────────────────────────────────────────────────────
  loadStations(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.stationAdminService.getAllStations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stations.set(data);
          this.isLoading.set(false);
          // Load installed games for each station
          data.forEach(s => this.loadStationGames(s.id));
        },
        error: (err) => {
          this.errorMessage.set(err?.message || 'Unable to connect to stations service');
          this.isLoading.set(false);
          this.toast.error('Failed to load game stations');
        }
      });
  }

  loadAllGames(): void {
    this.gameAdminService.getGames()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (games) => this.allGames.set(games),
        error: () => {}
      });
  }

  loadStationGames(stationId: string): void {
    this.gameAdminService.getGamesForStation(stationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (games) => {
          this.stationGamesMap.update((curr) => ({ ...curr, [stationId]: games }));
        },
        error: () => {}
      });
  }

  getGamesForStation(stationId: string): GameTitle[] {
    return this.stationGamesMap()[stationId] || [];
  }

  removeGameFromStation(station: Station, game: GameTitle, event: Event): void {
    event.stopPropagation();
    this.gameAdminService.removeGameFromStation(station.id, game.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.info('Game Removed', `Removed "${game.title}" from ${station.stationCode || station.name}.`);
          this.stationGamesMap.update((curr) => ({
            ...curr,
            [station.id]: (curr[station.id] || []).filter((g) => g.id !== game.id)
          }));
        },
        error: (err) => {
          this.toast.error('Removal Failed', err?.message || 'Could not remove game from station.');
        }
      });
  }

  openAssignGamesModal(station: Station, event: Event): void {
    event.stopPropagation();
    this.targetStationForAssign.set(station);
    const existingIds = this.getGamesForStation(station.id).map((g) => g.id);
    this.selectedGameIdsForStation.set([...existingIds]);
    this.assignGamesModalOpen.set(true);
  }

  toggleGameForStation(gameId: string): void {
    const curr = this.selectedGameIdsForStation();
    if (curr.includes(gameId)) {
      this.selectedGameIdsForStation.set(curr.filter((id) => id !== gameId));
    } else {
      this.selectedGameIdsForStation.set([...curr, gameId]);
    }
  }

  isGameSelectedForStation(gameId: string): boolean {
    return this.selectedGameIdsForStation().includes(gameId);
  }

  saveStationGames(): void {
    const station = this.targetStationForAssign();
    if (!station) return;

    this.actionInFlight.set(true);
    const gameIds = this.selectedGameIdsForStation();
    this.gameAdminService.assignGamesToStation(station.id, gameIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedList) => {
          this.actionInFlight.set(false);
          this.assignGamesModalOpen.set(false);
          this.toast.success('Station Games Updated', `Installed games updated for ${station.stationCode || station.name}.`);
          this.stationGamesMap.update((curr) => ({ ...curr, [station.id]: updatedList }));
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error('Assignment Failed', err?.message || 'Could not update games for station.');
        }
      });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingStationId.set(null);
    this.stationForm.reset({
      stationCode: '',
      type: 'CONSOLE',
      hourlyRate: 650,
      active: true
    });
    this.formModalOpen.set(true);
  }

  openEditModal(station: Station): void {
    this.isEditing.set(true);
    this.editingStationId.set(station.id);

    // Map PS5 / XBOX to CONSOLE, PC_ESPORTS to PC, RACING_SIM to VR if needed
    let formType: StationType = station.type;
    if (formType === 'PS5' || formType === 'XBOX_SERIES_X') formType = 'CONSOLE';
    if (formType === 'PC_ESPORTS') formType = 'PC';
    if (formType === 'RACING_SIM') formType = 'VR';

    this.stationForm.reset({
      stationCode: station.stationCode || station.name || '',
      type: formType,
      hourlyRate: station.hourlyRate || 650,
      active: station.active !== false
    });
    this.formModalOpen.set(true);
  }

  submitStationForm(): void {
    if (this.stationForm.invalid) {
      this.stationForm.markAllAsTouched();
      return;
    }

    const val = this.stationForm.value;
    const req: GameStationRequest = {
      stationCode: (val.stationCode || '').trim().toUpperCase(),
      type: val.type as StationType,
      hourlyRate: Number(val.hourlyRate) || 650,
      active: val.active ?? true
    };

    this.actionInFlight.set(true);

    if (this.isEditing() && this.editingStationId()) {
      const id = this.editingStationId()!;
      this.stationAdminService.updateStation(id, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.actionInFlight.set(false);
            this.formModalOpen.set(false);
            this.toast.success(`Station ${req.stationCode} updated successfully`);
            this.loadStations();
          },
          error: (err) => {
            this.actionInFlight.set(false);
            this.toast.error(err?.message || 'Failed to update station');
          }
        });
    } else {
      this.stationAdminService.createStation(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.actionInFlight.set(false);
            this.formModalOpen.set(false);
            this.toast.success(`Station ${req.stationCode} created successfully`);
            this.loadStations();
          },
          error: (err) => {
            this.actionInFlight.set(false);
            this.toast.error(err?.message || 'Failed to create station');
          }
        });
    }
  }

  toggleActive(station: Station, event?: Event): void {
    if (event) event.stopPropagation();

    const newActive = !station.active;
    const req: GameStationRequest = {
      stationCode: station.stationCode || station.name || 'STATION',
      type: (station.type === 'PS5' || station.type === 'XBOX_SERIES_X') ? 'CONSOLE' :
            (station.type === 'PC_ESPORTS') ? 'PC' :
            (station.type === 'RACING_SIM') ? 'VR' : station.type,
      hourlyRate: station.hourlyRate,
      active: newActive
    };

    this.stationAdminService.updateStation(station.id, req)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.info(`Station ${req.stationCode} is now ${newActive ? 'Active' : 'Inactive'}`);
          this.loadStations();
        },
        error: () => {
          this.toast.error('Failed to change station status');
        }
      });
  }

  openDeleteModal(station: Station, event?: Event): void {
    if (event) event.stopPropagation();
    this.deletingStation.set(station);
    this.deleteModalOpen.set(true);
  }

  confirmDelete(): void {
    const station = this.deletingStation();
    if (!station) return;

    this.actionInFlight.set(true);
    this.stationAdminService.deleteStation(station.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.actionInFlight.set(false);
          this.deleteModalOpen.set(false);
          this.toast.success(`Station ${station.stationCode || station.name} deleted`);
          this.loadStations();
        },
        error: (err) => {
          this.actionInFlight.set(false);
          this.toast.error(err?.message || 'Failed to delete station');
        }
      });
  }

  // ── Availability Inspector ────────────────────────────────────────────────
  openAvailability(station: Station, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedStationForAvailability.set(station);
    this.availabilityDate.set(new Date().toISOString().split('T')[0]);
    this.availabilityModalOpen.set(true);
    this.loadAvailability();
  }

  onDateChange(newDate: string): void {
    this.availabilityDate.set(newDate);
    this.loadAvailability();
  }

  loadAvailability(): void {
    const station = this.selectedStationForAvailability();
    if (!station) return;

    this.isAvailabilityLoading.set(true);
    this.stationAdminService.getAvailability(station.id, this.availabilityDate())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (slots) => {
          this.availabilitySlots.set(slots);
          this.isAvailabilityLoading.set(false);
        },
        error: () => {
          this.availabilitySlots.set([]);
          this.isAvailabilityLoading.set(false);
          this.toast.error('Failed to load slot availability');
        }
      });
  }

  // ── Filter Events ──────────────────────────────────────────────────────────
  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    this.syncQueryParams();
  }

  onTypeChange(type: string): void {
    this.filterType.set(type);
    this.syncQueryParams();
  }

  onStatusChange(status: string): void {
    this.filterStatus.set(status);
    this.syncQueryParams();
  }

  onSortChange(sort: string): void {
    if (sort === 'code_asc' || sort === 'code_desc' || sort === 'rate_asc' || sort === 'rate_desc') {
      this.sortBy.set(sort);
    }
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterType.set('');
    this.filterStatus.set('');
    this.sortBy.set('code_asc');
    this.syncQueryParams();
  }

  private syncQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchQuery() || null,
        type: this.filterType() || null,
        status: this.filterStatus() || null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getTypeLabel(type: StationType): string {
    switch (type) {
      case 'PC':
      case 'PC_ESPORTS':
        return 'PC Esports Rig';
      case 'CONSOLE':
      case 'PS5':
        return 'PS5 Lounge';
      case 'XBOX_SERIES_X':
        return 'Xbox Series X';
      case 'VR':
      case 'RACING_SIM':
        return 'VR & Simulators';
      default:
        return type;
    }
  }

  getTypeIcon(type: StationType): string {
    switch (type) {
      case 'PC':
      case 'PC_ESPORTS':
        return '💻';
      case 'CONSOLE':
      case 'PS5':
      case 'XBOX_SERIES_X':
        return '🎮';
      case 'VR':
      case 'RACING_SIM':
        return '🥽';
      default:
        return '🕹️';
    }
  }

  formatSlotTime(isoOrTime: string): string {
    if (!isoOrTime) return '';
    if (isoOrTime.includes('T')) {
      const d = new Date(isoOrTime);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return isoOrTime;
  }
}
