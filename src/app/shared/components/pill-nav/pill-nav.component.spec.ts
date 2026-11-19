import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { provideRouter } from '@angular/router';
import { PillNavComponent, PillNavItem } from './pill-nav.component';

describe('PillNavComponent', () => {
  let component: PillNavComponent;
  let fixture: ComponentFixture<PillNavComponent>;

  const mockItems: PillNavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Bookings', href: '/bookings' },
    { label: 'Tournaments', href: '/tournaments' },
    { label: 'Profile', href: '/profile' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PillNavComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PillNavComponent);
    component = fixture.componentInstance;
    component.items = mockItems;
    fixture.detectChanges();
  });

  it('should create PillNavComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should render all navigation items', () => {
    const slots = fixture.nativeElement.querySelectorAll('.pill-nav__slot');
    expect(slots.length).toBe(4);
    expect(slots[0].textContent).toContain('Home');
    expect(slots[1].textContent).toContain('Bookings');
    expect(slots[2].textContent).toContain('Tournaments');
    expect(slots[3].textContent).toContain('Profile');
  });

  it('should calculate activeIndex correctly from activeHref', () => {
    component.activeHref = '/tournaments';
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(2);

    component.activeHref = '/bookings';
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(1);

    component.activeHref = '/';
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(0);
  });

  it('should transition dot activeIndex to Bookings when Bookings item is clicked', () => {
    const links = fixture.nativeElement.querySelectorAll('.pill-nav__item');
    expect(component.activeIndex()).toBe(0); // starts at Home
    links[1].click();
    fixture.detectChanges();
    expect(component.activeIndex()).toBe(1); // moves under Bookings
  });

  it('should emit itemClick when an item is clicked', () => {
    spyOn(component.itemClick, 'emit');
    const links = fixture.nativeElement.querySelectorAll('.pill-nav__item');
    expect(links.length).toBeGreaterThan(0);
    links[1].click();
    expect(component.itemClick.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      item: mockItems[1],
      index: 1
    }));
  });

  it('should toggle menu open and closed', () => {
    component.collapse = 'always';
    component.ngOnChanges({ collapse: new SimpleChange(undefined, 'always', false) });
    fixture.detectChanges();

    expect(component.collapsed()).toBeTrue();
    component.toggleMenu();
    expect(component.open()).toBeTrue();
    expect(component.panelShown()).toBeTrue();

    component.toggleMenu();
    expect(component.open()).toBeFalse();
  });

  it('should apply custom themes and style variables', () => {
    component.theme = 'dark';
    component.surface = 'glass';
    component.bounce = 0.29;
    component.stretch = 0.45;
    fixture.detectChanges();

    const vars = component.computedStyleVars();
    expect(vars['--pn-surface']).toBeTruthy();
    expect(vars['--pn-blur']).toContain('blur');
  });
});
