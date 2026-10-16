import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { AdminStationsComponent } from './admin-stations.component';
import { StationAdminService } from './station-admin.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Station, SlotAvailabilityResponse } from '../../../shared/models';

describe('AdminStationsComponent', () => {
  let component: AdminStationsComponent;
  let fixture: ComponentFixture<AdminStationsComponent>;
  let stationAdminServiceSpy: jasmine.SpyObj<StationAdminService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  const mockStations: Station[] = [
    {
      id: 'st-01',
      stationCode: 'PS5-01',
      name: 'PlayStation 5 Pro Lounge #01',
      type: 'CONSOLE',
      hourlyRate: 650,
      specifications: '4K 120Hz OLED, 2x DualSense Edge',
      active: true
    },
    {
      id: 'st-02',
      stationCode: 'PS5-02',
      name: 'PlayStation 5 Pro Lounge #02',
      type: 'CONSOLE',
      hourlyRate: 700,
      specifications: '4K 120Hz OLED',
      active: true
    },
    {
      id: 'st-03',
      stationCode: 'PC-03',
      name: 'PC Esports Arena Rig #03',
      type: 'PC',
      hourlyRate: 850,
      specifications: 'RTX 4090, 240Hz',
      active: true
    },
    {
      id: 'st-04',
      stationCode: 'VR-04',
      name: 'Meta Quest 3 VR Sim #04',
      type: 'VR',
      hourlyRate: 1200,
      specifications: 'Direct Drive Wheel + Flight Rig',
      active: false
    }
  ];

  const mockSlots: SlotAvailabilityResponse[] = [
    { startTime: '2026-10-15T10:00:00Z', endTime: '2026-10-15T11:00:00Z', available: true },
    { startTime: '2026-10-15T11:00:00Z', endTime: '2026-10-15T12:00:00Z', available: false },
    { startTime: '2026-10-15T12:00:00Z', endTime: '2026-10-15T13:00:00Z', available: true }
  ];

  beforeEach(async () => {
    stationAdminServiceSpy = jasmine.createSpyObj('StationAdminService', [
      'getAllStations',
      'getStationById',
      'getAvailability',
      'createStation',
      'updateStation',
      'deleteStation'
    ]);
    stationAdminServiceSpy.getAllStations.and.returnValue(of(mockStations));
    stationAdminServiceSpy.getAvailability.and.returnValue(of(mockSlots));
    stationAdminServiceSpy.createStation.and.returnValue(
      of({ id: 'st-new', stationCode: 'PS5-05', type: 'CONSOLE', hourlyRate: 650, active: true })
    );
    stationAdminServiceSpy.updateStation.and.returnValue(
      of({ id: 'st-01', stationCode: 'PS5-01', type: 'CONSOLE', hourlyRate: 750, active: true })
    );
    stationAdminServiceSpy.deleteStation.and.returnValue(of(void 0));

    toastServiceSpy = jasmine.createSpyObj('ToastService', ['show', 'success', 'error', 'warning', 'info']);

    await TestBed.configureTestingModule({
      imports: [AdminStationsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: StationAdminService, useValue: stationAdminServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminStationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('TC-FE-STA-01: should create component and initialize with stations', () => {
    expect(component).toBeTruthy();
    expect(stationAdminServiceSpy.getAllStations).toHaveBeenCalled();
    expect(component.stations().length).toBe(4);
    expect(component.isLoading()).toBeFalse();
  });

  it('TC-FE-STA-02: should compute metrics correctly', () => {
    expect(component.totalStations()).toBe(4);
    expect(component.activeStationsCount()).toBe(3);
    expect(component.pcStationsCount()).toBe(1);
    expect(component.consoleStationsCount()).toBe(3);
  });

  it('TC-FE-STA-03: should filter stations by search query', () => {
    component.onSearchInput('PC');
    expect(component.filteredStations().length).toBe(1);
    expect(component.filteredStations()[0].stationCode).toBe('PC-03');

    component.onSearchInput('4K');
    expect(component.filteredStations().length).toBe(2);

    component.onSearchInput('');
    expect(component.filteredStations().length).toBe(4);
  });

  it('TC-FE-STA-04: should filter stations by type', () => {
    component.onTypeChange('PC');
    expect(component.filteredStations().length).toBe(1);
    expect(component.filteredStations()[0].type).toBe('PC');

    component.onTypeChange('CONSOLE');
    expect(component.filteredStations().length).toBe(2);

    component.onTypeChange('VR');
    expect(component.filteredStations().length).toBe(1);
  });

  it('TC-FE-STA-05: should filter stations by active/inactive status', () => {
    component.onStatusChange('ACTIVE');
    expect(component.filteredStations().length).toBe(3);

    component.onStatusChange('INACTIVE');
    expect(component.filteredStations().length).toBe(1);
    expect(component.filteredStations()[0].stationCode).toBe('VR-04');
  });

  it('TC-FE-STA-06: should sort stations by code and rate', () => {
    component.onSortChange('rate_asc');
    expect(component.filteredStations()[0].hourlyRate).toBe(650);
    expect(component.filteredStations()[3].hourlyRate).toBe(1200);

    component.onSortChange('rate_desc');
    expect(component.filteredStations()[0].hourlyRate).toBe(1200);

    component.onSortChange('code_desc');
    expect(component.filteredStations()[0].stationCode).toBe('VR-04');
  });

  it('TC-FE-STA-07: should open create modal and reset form', () => {
    component.openCreateModal();
    expect(component.formModalOpen()).toBeTrue();
    expect(component.isEditing()).toBeFalse();
    expect(component.editingStationId()).toBeNull();
    expect(component.stationForm.get('stationCode')?.value).toBe('');
    expect(component.stationForm.get('type')?.value).toBe('CONSOLE');
    expect(component.stationForm.get('hourlyRate')?.value).toBe(650);
  });

  it('TC-FE-STA-08: should open edit modal and pre-fill form with station data', () => {
    const station = mockStations[0];
    component.openEditModal(station);
    expect(component.formModalOpen()).toBeTrue();
    expect(component.isEditing()).toBeTrue();
    expect(component.editingStationId()).toBe('st-01');
    expect(component.stationForm.get('stationCode')?.value).toBe('PS5-01');
    expect(component.stationForm.get('hourlyRate')?.value).toBe(650);
  });

  it('TC-FE-STA-09: should submit new station when valid', () => {
    component.openCreateModal();
    component.stationForm.patchValue({
      stationCode: 'PS5-05',
      type: 'CONSOLE',
      hourlyRate: 650,
      active: true
    });

    component.submitStationForm();

    expect(stationAdminServiceSpy.createStation).toHaveBeenCalledWith({
      stationCode: 'PS5-05',
      type: 'CONSOLE',
      hourlyRate: 650,
      active: true
    });
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/created/i));
    expect(component.formModalOpen()).toBeFalse();
  });

  it('TC-FE-STA-10: should submit edited station when valid', () => {
    component.openEditModal(mockStations[0]);
    component.stationForm.patchValue({
      hourlyRate: 750
    });

    component.submitStationForm();

    expect(stationAdminServiceSpy.updateStation).toHaveBeenCalledWith('st-01', {
      stationCode: 'PS5-01',
      type: 'CONSOLE',
      hourlyRate: 750,
      active: true
    });
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/updated/i));
    expect(component.formModalOpen()).toBeFalse();
  });

  it('TC-FE-STA-11: should not submit invalid station form', () => {
    component.openCreateModal();
    component.stationForm.patchValue({
      stationCode: '', // Invalid: required
      hourlyRate: 0 // Invalid: min > 0
    });

    component.submitStationForm();

    expect(stationAdminServiceSpy.createStation).not.toHaveBeenCalled();
    expect(component.stationForm.invalid).toBeTrue();
  });

  it('TC-FE-STA-12: should toggle station active status', () => {
    const station = mockStations[0]; // currently active: true
    component.toggleActive(station);

    expect(stationAdminServiceSpy.updateStation).toHaveBeenCalledWith('st-01', {
      stationCode: 'PS5-01',
      type: 'CONSOLE',
      hourlyRate: 650,
      active: false
    });
    expect(toastServiceSpy.info).toHaveBeenCalledWith(jasmine.stringMatching(/Inactive/i));
  });

  it('TC-FE-STA-13: should open delete confirm dialog and call deleteStation on confirm', () => {
    const station = mockStations[3];
    component.openDeleteModal(station);
    expect(component.deleteModalOpen()).toBeTrue();
    expect(component.deletingStation()).toEqual(station);

    component.confirmDelete();
    expect(stationAdminServiceSpy.deleteStation).toHaveBeenCalledWith('st-04');
    expect(toastServiceSpy.success).toHaveBeenCalledWith(jasmine.stringMatching(/deleted/i));
    expect(component.deleteModalOpen()).toBeFalse();
  });

  it('TC-FE-STA-14: should open availability inspector and load slots', () => {
    const station = mockStations[0];
    component.openAvailability(station);

    expect(component.availabilityModalOpen()).toBeTrue();
    expect(component.selectedStationForAvailability()).toEqual(station);
    expect(stationAdminServiceSpy.getAvailability).toHaveBeenCalled();
    expect(component.availabilitySlots().length).toBe(3);
    expect(component.availabilitySlots()[0].available).toBeTrue();
  });

  it('TC-FE-STA-15: should handle error state when loading stations fails', () => {
    stationAdminServiceSpy.getAllStations.and.returnValue(throwError(() => new Error('Network timeout')));

    component.loadStations();

    expect(component.isLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('Network timeout');
    expect(toastServiceSpy.error).toHaveBeenCalled();
  });

  it('TC-FE-STA-16: should clear filters back to defaults', () => {
    component.onSearchInput('Query');
    component.onTypeChange('PC');
    component.onStatusChange('INACTIVE');

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.filterType()).toBe('');
    expect(component.filterStatus()).toBe('');
    expect(component.filteredStations().length).toBe(4);
  });
});
