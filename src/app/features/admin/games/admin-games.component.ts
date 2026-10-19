import {
  Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { GameAdminService } from './game-admin.service';
import { StationAdminService } from '../stations/station-admin.service';
import {
  GameTitle,
  GameGenre,
  GamePlatform,
  AgeRating,
  CreateGameRequest,
  UpdateGameRequest,
  GameFilter,
  AdminGameStatsResponse,
  Station
} from '../../../shared/models';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BadgeComponent } from '../../../shared/ui/badge/badge.component';
import { ModalComponent } from '../../../shared/ui/modal/modal.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-admin-games',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonComponent,
    BadgeComponent,
    ModalComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-games.component.html',
  styleUrl: './admin-games.component.scss'
})
export class AdminGamesComponent implements OnInit, OnDestroy {
  private readonly gameService = inject(GameAdminService);
  private readonly stationService = inject(StationAdminService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly games = signal<GameTitle[]>([]);
  readonly stats = signal<AdminGameStatsResponse | null>(null);
  readonly availableStations = signal<Station[]>([]);
  readonly formStationIds = signal<string[]>([]);
  readonly gameStationsMap = signal<Record<string, Station[]>>({});
  readonly isLoading = signal<boolean>(false);
  readonly actionInFlight = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Filters
  readonly searchTerm = signal<string>('');
  readonly selectedGenre = signal<string>('');
  readonly selectedPlatform = signal<string>('');
  readonly selectedStatus = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  readonly isCreateEditModalOpen = signal<boolean>(false);
  readonly isEditing = signal<boolean>(false);
  readonly editingGameId = signal<string | null>(null);

  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly gameToDelete = signal<GameTitle | null>(null);

  // Form Fields
  readonly formTitle = signal<string>('');
  readonly formGenre = signal<GameGenre>('ACTION');
  readonly formPlatforms = signal<GamePlatform[]>(['PS5']);
  readonly formReleaseYear = signal<number>(new Date().getFullYear());
  readonly formAgeRating = signal<AgeRating>('PEGI_12');
  readonly formMaxPlayers = signal<number>(1);
  readonly formDescription = signal<string>('');
  readonly formCoverUrl = signal<string>('');
  readonly formFeatured = signal<boolean>(false);
  readonly formActive = signal<boolean>(true);
  readonly formErrors = signal<Record<string, string>>({});

  readonly availableGenres: GameGenre[] = [
    'ACTION', 'RPG', 'SPORTS', 'RACING', 'FPS', 'FIGHTING', 'ADVENTURE', 'STRATEGY', 'BATTLE_ROYALE'
  ];

  readonly availablePlatforms: GamePlatform[] = [
    'PS5', 'XBOX_SERIES_X', 'PC', 'NINTENDO_SWITCH', 'VR'
  ];

  readonly availableAgeRatings: AgeRating[] = [
    'PEGI_3', 'PEGI_7', 'PEGI_12', 'PEGI_16', 'PEGI_18'
  ];

  // Filtered games count
  readonly filteredGames = computed(() => {
    let list = this.games();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(g =>
        g.title.toLowerCase().includes(search) ||
        g.genre.toLowerCase().includes(search) ||
        g.description.toLowerCase().includes(search)
      );
    }
    if (this.selectedGenre()) {
      list = list.filter(g => g.genre === this.selectedGenre());
    }
    if (this.selectedPlatform()) {
      list = list.filter(g => g.platforms.includes(this.selectedPlatform() as GamePlatform));
    }
    if (this.selectedStatus() === 'ACTIVE') {
      list = list.filter(g => g.active);
    } else if (this.selectedStatus() === 'INACTIVE') {
      list = list.filter(g => !g.active);
    }
    return list;
  });

  ngOnInit(): void {
    this.stationService.getAllStations().pipe(takeUntil(this.destroy$)).subscribe({
      next: stations => this.availableStations.set(stations.filter(s => s.active !== false)),
      error: () => {}
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['search']) this.searchTerm.set(params['search']);
      if (params['genre']) this.selectedGenre.set(params['genre']);
      if (params['platform']) this.selectedPlatform.set(params['platform']);
      if (params['status']) this.selectedStatus.set(params['status']);

      this.loadGames();
      this.loadStats();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGames(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filter: GameFilter = {
      search: this.searchTerm() || undefined,
      genre: this.selectedGenre() || undefined,
      platform: this.selectedPlatform() || undefined,
      active: this.selectedStatus() === 'ACTIVE' ? true : this.selectedStatus() === 'INACTIVE' ? false : undefined
    };

    this.gameService.getGames(filter).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.games.set(data);
        this.isLoading.set(false);
        const stMap: Record<string, Station[]> = {};
        data.forEach(g => {
          if (g.stations && g.stations.length > 0) {
            stMap[g.id] = g.stations.map((st: any) => ({
              ...st,
              name: st.stationCode || st.name || `Station ${st.type || ''}`
            }));
          } else {
            this.gameService.getStationsForGame(g.id).pipe(takeUntil(this.destroy$)).subscribe({
              next: stations => {
                const mappedStations = stations.map((st: any) => ({
                  ...st,
                  name: st.stationCode || st.name || `Station ${st.type || ''}`
                }));
                this.gameStationsMap.update(curr => ({ ...curr, [g.id]: mappedStations }));
              },
              error: () => {}
            });
          }
        });
        this.gameStationsMap.set(stMap);
      },
      error: err => {
        this.errorMessage.set(err?.message || 'Failed to load game titles catalog.');
        this.isLoading.set(false);
      }
    });
  }

  getStationsForGame(gameId: string): Station[] {
    return this.gameStationsMap()[gameId] || [];
  }

  toggleStation(stationId: string): void {
    const current = this.formStationIds();
    if (current.includes(stationId)) {
      this.formStationIds.set(current.filter(id => id !== stationId));
    } else {
      this.formStationIds.set([...current, stationId]);
    }
  }

  loadStats(): void {
    this.gameService.getGameStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.stats.set(data),
      error: () => {}
    });
  }

  updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.searchTerm() || null,
        genre: this.selectedGenre() || null,
        platform: this.selectedPlatform() || null,
        status: this.selectedStatus() !== 'ALL' ? this.selectedStatus() : null
      },
      queryParamsHandling: 'merge'
    });
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedGenre.set('');
    this.selectedPlatform.set('');
    this.selectedStatus.set('ALL');
    this.updateQueryParams();
  }

  // ── Modals & CRUD ──────────────────────────────────────────────────────────
  openCreateModal(): void {
    this.isEditing.set(false);
    this.editingGameId.set(null);
    this.formTitle.set('');
    this.formGenre.set('ACTION');
    this.formPlatforms.set(['PS5']);
    this.formReleaseYear.set(new Date().getFullYear());
    this.formAgeRating.set('PEGI_12');
    this.formMaxPlayers.set(1);
    this.formDescription.set('');
    this.formCoverUrl.set('');
    this.formFeatured.set(false);
    this.formActive.set(true);
    this.formStationIds.set([]);
    this.formErrors.set({});
    this.isCreateEditModalOpen.set(true);
  }

  openEditModal(game: GameTitle): void {
    this.isEditing.set(true);
    this.editingGameId.set(game.id);
    this.formTitle.set(game.title);
    this.formGenre.set(game.genre);
    this.formPlatforms.set([...game.platforms]);
    this.formReleaseYear.set(game.releaseYear);
    this.formAgeRating.set(game.ageRating);
    this.formMaxPlayers.set(game.maxPlayers);
    this.formDescription.set(game.description);
    this.formCoverUrl.set(game.coverUrl || '');
    this.formFeatured.set(game.featured);
    this.formActive.set(game.active);

    const initialStations = this.getStationsForGame(game.id);
    this.formStationIds.set(initialStations.map(s => s.id));
    this.gameService.getStationsForGame(game.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: stations => {
        this.gameStationsMap.update(curr => ({ ...curr, [game.id]: stations }));
        this.formStationIds.set(stations.map(s => s.id));
      },
      error: () => {}
    });

    this.formErrors.set({});
    this.isCreateEditModalOpen.set(true);
  }

  closeCreateEditModal(): void {
    this.isCreateEditModalOpen.set(false);
    this.formErrors.set({});
  }

  togglePlatform(platform: GamePlatform): void {
    const current = this.formPlatforms();
    if (current.includes(platform)) {
      if (current.length === 1) {
        this.toast.warning('Platform Required', 'At least one supported platform must be selected.');
        return;
      }
      this.formPlatforms.set(current.filter(p => p !== platform));
    } else {
      this.formPlatforms.set([...current, platform]);
    }
  }

  validateForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.formTitle().trim()) {
      errors['title'] = 'Game title is required.';
    }
    if (!this.formPlatforms().length) {
      errors['platforms'] = 'At least one supported platform must be chosen.';
    }
    const year = Number(this.formReleaseYear());
    if (isNaN(year) || year < 1980 || year > 2035) {
      errors['releaseYear'] = 'Valid release year required (1980 - 2035).';
    }
    const players = Number(this.formMaxPlayers());
    if (isNaN(players) || players < 1 || players > 32) {
      errors['maxPlayers'] = 'Max players must be between 1 and 32.';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveGame(): void {
    if (!this.validateForm()) return;

    this.actionInFlight.set(true);

    if (this.isEditing() && this.editingGameId()) {
      const updateReq: UpdateGameRequest = {
        title: this.formTitle().trim(),
        genre: this.formGenre(),
        platforms: this.formPlatforms(),
        releaseYear: Number(this.formReleaseYear()),
        ageRating: this.formAgeRating(),
        maxPlayers: Number(this.formMaxPlayers()),
        description: this.formDescription().trim(),
        coverUrl: this.formCoverUrl().trim() || undefined,
        featured: this.formFeatured(),
        active: this.formActive(),
        stationIds: this.formStationIds()
      };

      this.gameService.updateGame(this.editingGameId()!, updateReq).pipe(takeUntil(this.destroy$)).subscribe({
        next: updated => {
          this.toast.success('Game Updated', `"${updated.title}" catalog details updated successfully.`);
          this.closeCreateEditModal();
          this.actionInFlight.set(false);
          this.loadGames();
          this.loadStats();
        },
        error: err => {
          this.toast.error('Update Failed', err?.message || 'Could not update game title.');
          this.actionInFlight.set(false);
        }
      });
    } else {
      const createReq: CreateGameRequest = {
        title: this.formTitle().trim(),
        genre: this.formGenre(),
        platforms: this.formPlatforms(),
        releaseYear: Number(this.formReleaseYear()),
        ageRating: this.formAgeRating(),
        maxPlayers: Number(this.formMaxPlayers()),
        description: this.formDescription().trim(),
        coverUrl: this.formCoverUrl().trim() || undefined,
        featured: this.formFeatured(),
        active: this.formActive(),
        stationIds: this.formStationIds()
      };

      this.gameService.createGame(createReq).pipe(takeUntil(this.destroy$)).subscribe({
        next: created => {
          this.toast.success('Game Added', `"${created.title}" added to gaming catalog.`);
          this.closeCreateEditModal();
          this.actionInFlight.set(false);
          this.loadGames();
          this.loadStats();
        },
        error: err => {
          this.toast.error('Creation Failed', err?.message || 'Could not create game title.');
          this.actionInFlight.set(false);
        }
      });
    }
  }

  toggleActive(game: GameTitle, event: Event): void {
    event.stopPropagation();
    this.gameService.toggleGameActive(game.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: updated => {
        this.toast.info('Status Changed', `"${updated.title}" is now ${updated.active ? 'ACTIVE' : 'INACTIVE'}.`);
        this.loadGames();
        this.loadStats();
      },
      error: () => {
        this.toast.error('Status Toggle Failed', 'Could not toggle active state.');
      }
    });
  }

  openDeleteModal(game: GameTitle, event: Event): void {
    event.stopPropagation();
    this.gameToDelete.set(game);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.gameToDelete.set(null);
  }

  confirmDelete(): void {
    const game = this.gameToDelete();
    if (!game) return;

    this.actionInFlight.set(true);
    this.gameService.deleteGame(game.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success('Game Deleted', `"${game.title}" removed from catalog.`);
        this.closeDeleteModal();
        this.actionInFlight.set(false);
        this.loadGames();
        this.loadStats();
      },
      error: err => {
        this.toast.error('Delete Failed', err?.message || 'Could not delete game title.');
        this.actionInFlight.set(false);
      }
    });
  }

  getPlatformIcon(p: GamePlatform): string {
    switch (p) {
      case 'PS5': return '🎮 PS5';
      case 'PC': return '💻 PC';
      case 'XBOX_SERIES_X': return '🟩 Xbox';
      case 'NINTENDO_SWITCH': return '🔴 Switch';
      case 'VR': return '🥽 VR';
      default: return p;
    }
  }

  getAgeRatingBadge(rating: AgeRating): { text: string; variant: 'success' | 'warning' | 'danger' | 'primary' | 'neutral' } {
    switch (rating) {
      case 'PEGI_3': return { text: 'PEGI 3+', variant: 'success' };
      case 'PEGI_7': return { text: 'PEGI 7+', variant: 'success' };
      case 'PEGI_12': return { text: 'PEGI 12+', variant: 'primary' };
      case 'PEGI_16': return { text: 'PEGI 16+', variant: 'warning' };
      case 'PEGI_18': return { text: 'PEGI 18+', variant: 'danger' };
      default: return { text: rating, variant: 'neutral' };
    }
  }
}
