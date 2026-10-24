import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../core/services/booking.service';
import { Station, Game } from '../../models';
import { BadgeComponent } from '../../ui/badge/badge.component';
import { SkeletonComponent } from '../../ui/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state.component';

@Component({
  selector: 'gc-station-game-picker',
  standalone: true,
  imports: [CommonModule, BadgeComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './station-game-picker.component.html',
  styleUrl: './station-game-picker.component.scss'
})
export class StationGamePickerComponent implements OnInit, OnChanges {
  private readonly bookingService = inject(BookingService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Pre-selected station id (from query params / parent) */
  @Input() initialStationId: string | null = null;
  /** Pre-selected game id (from query params / parent) */
  @Input() initialGameId: string | null = null;

  /** Emitted when the user selects a game (stationId + gameId pair) */
  @Output() readonly gameSelected = new EventEmitter<{ stationId: string; gameId: string }>();
  /** Emitted when the user selects a station */
  @Output() readonly stationSelected = new EventEmitter<string>();
  /** Emitted when the user clicks 'Book' on a specific station */
  @Output() readonly stationBookClicked = new EventEmitter<string>();

  readonly stations = signal<Station[]>([]);
  readonly stationGames = signal<Game[]>([]);
  readonly selectedStationId = signal<string | null>(null);
  readonly selectedGameId = signal<string | null>(null);
  readonly stationsLoading = signal(true);
  readonly gamesLoading = signal(false);

  readonly activeStations = computed(() => this.stations().filter((s) => s.active !== false));

  ngOnInit(): void {
    this.loadStations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialStationId'] && !changes['initialStationId'].firstChange) {
      const sid = this.initialStationId;
      if (sid && sid !== this.selectedStationId()) {
        this.selectedStationId.set(sid);
        this.loadStationGames(sid);
      }
    }
    if (changes['initialGameId'] && !changes['initialGameId'].firstChange) {
      const gid = this.initialGameId;
      if (gid) this.selectedGameId.set(gid);
    }
  }

  private loadStations(): void {
    this.stationsLoading.set(true);
    this.bookingService.getStations().subscribe({
      next: (stations) => {
        this.stations.set(stations);
        this.stationsLoading.set(false);

        // Apply initial station selection
        const active = stations.filter((s) => s.active !== false);
        const initStation = active.find((s) => s.id === this.initialStationId)
          || active[0];

        if (initStation) {
          this.selectedStationId.set(initStation.id);
          this.loadStationGames(initStation.id);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.stationsLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadStationGames(stationId: string): void {
    this.gamesLoading.set(true);
    this.stationGames.set([]);
    this.bookingService.getStationGames(stationId).subscribe({
      next: (games) => {
        this.stationGames.set(games);
        // Apply initial game selection if valid for this station
        if (this.initialGameId) {
          const valid = games.some((g) => g.id === this.initialGameId);
          if (valid) {
            this.selectedGameId.set(this.initialGameId);
          } else {
            this.selectedGameId.set(null);
          }
        } else {
          this.selectedGameId.set(null);
        }
        this.gamesLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.gamesLoading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  selectStation(stationId: string): void {
    if (this.selectedStationId() === stationId) return;
    this.selectedStationId.set(stationId);
    this.selectedGameId.set(null);
    this.stationSelected.emit(stationId);
    this.loadStationGames(stationId);
  }

  onBookStationClick(stationId: string, event: Event): void {
    event.stopPropagation();
    this.stationBookClicked.emit(stationId);
  }

  selectGame(gameId: string): void {
    this.selectedGameId.set(gameId);
    const stationId = this.selectedStationId();
    if (stationId) {
      this.gameSelected.emit({ stationId, gameId });
    }
  }

  getStationTypeLabel(type: string): string {
    switch (type) {
      case 'PC': case 'PC_ESPORTS': return 'PC';
      case 'VR': return 'VR';
      case 'XBOX_SERIES_X': return 'XBOX';
      default: return 'CONSOLE';
    }
  }

  getStationBadgeVariant(type: string): 'primary' | 'accent' | 'info' {
    switch (type) {
      case 'PC': case 'PC_ESPORTS': return 'primary';
      case 'VR': return 'accent';
      default: return 'info';
    }
  }

  getPlatformIcon(platform: string): string {
    switch (platform) {
      case 'PS5': return '🎮';
      case 'PC': return '🖥️';
      case 'VR': return '🥽';
      case 'XBOX_SERIES_X': return '🎮';
      default: return '🕹️';
    }
  }
}
