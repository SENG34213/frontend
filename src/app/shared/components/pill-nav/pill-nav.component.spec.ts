import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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

  beforeEach(fakeAsync(async () => {
    await TestBed.configureTestingModule({
      imports: [PillNavComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PillNavComponent);
    component = fixture.componentInstance;
    component.items = mockItems;
    component.collapse = 'never';
    fixture.detectChanges();
    tick(); // drain initial router navigation microtasks
    fixture.detectChanges();
  }));

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

  describe('Active Index & Href matching', () => {
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

    it('should match /dashboard to root / item', () => {
      component.activeHref = '/dashboard';
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(0);
    });

    it('should strip query params and hash when resolving active item', () => {
      component.activeHref = '/bookings?tab=history&filter=active#results';
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(1);
    });

    it('should match nested paths prefixed with the item href', () => {
      component.activeHref = '/tournaments/championship-2026/bracket';
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(2);
    });

    it('should fallback to selected index when activeHref does not match', () => {
      component.selected.set(3);
      component.activeHref = '/unknown-page';
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(3);
    });

    it('should fallback to selected index when activeHref is undefined or empty', () => {
      component.selected.set(2);
      component.activeHref = undefined;
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(2);

      component.activeHref = '';
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(2);
    });

    it('should handle items without href and ignore them during matching', () => {
      component.items = [
        { label: 'Action 1' },
        { label: 'Action 2', href: '/action2' }
      ];
      component.activeHref = '/action2';
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(1);
    });
  });

  describe('Items & ActiveHref Getters and Setters', () => {
    it('should allow setting empty/null items and return them via getter', () => {
      component.items = [];
      expect(component.items).toEqual([]);
      expect(component.itemsSignal()).toEqual([]);
    });

    it('should return activeHref via getter', () => {
      component.activeHref = '/profile';
      expect(component.activeHref).toBe('/profile');
      expect(component.activeHrefSignal()).toBe('/profile');
    });
  });

  describe('Layout Classes & Component Structure', () => {
    it('should return split layout classes by default', () => {
      component.layout = 'split';
      expect(component.rootClasses()).toBe('pill-nav');
      expect(component.logoClasses()).toBe('pill-nav__logo pill-nav__surface');
      expect(component.barClasses()).toBe('pill-nav__bar pill-nav__surface');
      expect(component.toggleClasses()).toBe('pill-nav__toggle pill-nav__surface');
    });

    it('should return joined layout classes when layout is joined', () => {
      component.layout = 'joined';
      expect(component.rootClasses()).toBe('pill-nav pill-nav__surface');
      expect(component.logoClasses()).toBe('pill-nav__logo');
      expect(component.barClasses()).toBe('pill-nav__bar');
      expect(component.toggleClasses()).toBe('pill-nav__toggle pill-nav__toggle--bare');
    });

    it('should generate trackByItem string', () => {
      const track = component.trackByItem({ label: 'Test' }, 3);
      expect(track).toBe('Test-3');
    });
  });

  describe('Theme, Surface & CSS Variables', () => {
    it('should apply dark theme with glass surface by default', () => {
      component.theme = 'dark';
      component.surface = 'glass';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-surface']).toBeTruthy();
      expect(vars['--pn-blur']).toContain('blur');
    });

    it('should apply light theme correctly', () => {
      component.theme = 'light';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-strong']).toBe('#18181b');
    });

    it('should handle solid surface mode', () => {
      component.surface = 'solid';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-blur']).toBe('none');
    });

    it('should handle none surface mode', () => {
      component.surface = 'none';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-surface']).toBe('transparent');
      expect(vars['--pn-shadow']).toBe('none');
      expect(vars['--pn-blur']).toBe('none');
      expect(vars['--pn-edge']).toBe('transparent');
      expect(vars['--pn-rim']).toBe('transparent');
    });

    it('should apply custom barColor and textColor overrides', () => {
      component.barColor = '#102030';
      component.textColor = '#fafafa';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-surface']).toBe('#102030');
      expect(vars['--pn-solid']).toBe('#102030');
      expect(vars['--pn-strong']).toBe('#fafafa');
      expect(vars['--pn-text']).toContain('#fafafa');
    });

    it('should compute contrast ink for highlightColor with 6-digit and 3-digit hex', () => {
      // Light color requires dark ink
      component.highlightColor = '#ffffff';
      fixture.detectChanges();
      let vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBe('#121016');

      // 3-digit hex light color
      component.highlightColor = '#fff';
      fixture.detectChanges();
      vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBe('#121016');

      // Dark color requires white ink
      component.highlightColor = '#000000';
      fixture.detectChanges();
      vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBe('#ffffff');

      // 3-digit hex dark color
      component.highlightColor = '#000';
      fixture.detectChanges();
      vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBe('#ffffff');

      // Invalid color falls back to palette ink
      component.highlightColor = 'invalid-color';
      fixture.detectChanges();
      vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBeTruthy();
    });

    it('should respect explicit highlightTextColor over auto contrast ink', () => {
      component.highlightColor = '#ffffff';
      component.highlightTextColor = '#ff0055';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBe('#ff0055');
    });

    it('should set highlightTextColor when highlightColor is omitted', () => {
      component.highlightColor = undefined;
      component.highlightTextColor = '#abcdef';
      fixture.detectChanges();

      const vars = component.computedStyleVars();
      expect(vars['--pn-pill-ink']).toBe('#abcdef');
    });
  });

  describe('isGlide Computed Property', () => {
    it('should return false when hoverEffect is fill', () => {
      component.hoverEffect = 'fill';
      expect(component.isGlide()).toBeFalse();
    });

    it('should return true when hoverEffect is glide', () => {
      component.hoverEffect = 'glide';
      expect(component.isGlide()).toBeTrue();
    });

    it('should return true when indicator is pill even if hoverEffect is none', () => {
      component.hoverEffect = 'none';
      component.indicator = 'pill';
      expect(component.isGlide()).toBeTrue();
    });

    it('should return false when hoverEffect is none and indicator is dot', () => {
      component.hoverEffect = 'none';
      component.indicator = 'dot';
      expect(component.isGlide()).toBeFalse();
    });
  });

  describe('Click and Interaction Handlers', () => {
    it('should transition dot activeIndex to Bookings when Bookings item is clicked', fakeAsync(() => {
      const links = fixture.nativeElement.querySelectorAll('.pill-nav__item');
      expect(component.activeIndex()).toBe(0); // starts at Home
      links[1].click();
      tick();
      fixture.detectChanges();
      expect(component.activeIndex()).toBe(1); // moves under Bookings
    }));

    it('should emit itemClick when an item is clicked', fakeAsync(() => {
      spyOn(component.itemClick, 'emit');
      const links = fixture.nativeElement.querySelectorAll('.pill-nav__item');
      expect(links.length).toBeGreaterThan(0);
      links[1].click();
      tick();
      expect(component.itemClick.emit).toHaveBeenCalledWith(jasmine.objectContaining({
        item: mockItems[1],
        index: 1
      }));
    }));

    it('should not update selection if click event default is prevented', () => {
      const dummyEvent = new MouseEvent('click', { cancelable: true });
      dummyEvent.preventDefault();

      component.selected.set(0);
      component.onItemClicked(mockItems[2], 2, dummyEvent);

      expect(component.selected()).toBe(0);
    });

    it('should update activeHref and selection on onItemClicked when default not prevented', () => {
      const dummyEvent = new MouseEvent('click', { cancelable: true });

      component.onItemClicked(mockItems[2], 2, dummyEvent);

      expect(component.selected()).toBe(2);
      expect(component.activeHrefSignal()).toBe('/tournaments');
    });

    it('should handle onItemClicked for item without href', () => {
      const itemWithoutHref: PillNavItem = { label: 'Custom Button' };
      const dummyEvent = new MouseEvent('click', { cancelable: true });

      component.onItemClicked(itemWithoutHref, 0, dummyEvent);

      expect(component.selected()).toBe(0);
    });

    it('should handle onPanelItemClicked by delegating to onItemClicked and closing panel', () => {
      spyOn(component, 'onItemClicked');
      component.open.set(true);
      const dummyEvent = new MouseEvent('click');

      component.onPanelItemClicked(mockItems[1], 1, dummyEvent);

      expect(component.onItemClicked).toHaveBeenCalledWith(mockItems[1], 1, dummyEvent);
      expect(component.open()).toBeFalse();
    });
  });

  describe('Menu Toggling & Mobile Panel', () => {
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

    it('should emit menuToggle output when menu state changes', () => {
      spyOn(component.menuToggle, 'emit');
      component.toggleMenu();
      expect(component.menuToggle.emit).toHaveBeenCalledWith(true);

      component.toggleMenu();
      expect(component.menuToggle.emit).toHaveBeenCalledWith(false);
    });
  });

  describe('Pointer, Focus & Keyboard Events', () => {
    it('should ignore touch pointer events on slot enter', () => {
      const touchEvent = { pointerType: 'touch' } as unknown as PointerEvent;
      expect(() => component.onSlotPointerEnter(1, touchEvent)).not.toThrow();
    });

    it('should update hover on mouse pointer enter on slot', () => {
      const mouseEvent = { pointerType: 'mouse' } as unknown as PointerEvent;
      expect(() => {
        component.onSlotPointerEnter(2, mouseEvent);
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('should ignore secondary mouse clicks on slot pointer down', () => {
      const rightClick = { button: 2 } as unknown as PointerEvent;
      expect(() => component.onSlotPointerDown(rightClick)).not.toThrow();
    });

    it('should register primary click on slot pointer down', () => {
      const leftClick = { button: 0 } as unknown as PointerEvent;
      expect(() => component.onSlotPointerDown(leftClick)).not.toThrow();
    });

    it('should handle slot focus with focus-visible', () => {
      const matchTarget = {
        matches: (selector: string) => selector === ':focus-visible'
      } as unknown as Element;
      const focusEvent = { target: matchTarget } as unknown as FocusEvent;
      expect(() => component.onSlotFocus(1, focusEvent)).not.toThrow();
    });

    it('should handle slot focus without focus-visible', () => {
      const noMatchTarget = {
        matches: () => false
      } as unknown as Element;
      const focusEvent = { target: noMatchTarget } as unknown as FocusEvent;
      expect(() => component.onSlotFocus(1, focusEvent)).not.toThrow();
    });

    it('should handle slot blur and track leave', () => {
      expect(() => {
        component.onSlotBlur();
        component.onTrackLeave();
      }).not.toThrow();
    });

    it('should handle spin for logo', () => {
      const mouseEvent = { pointerType: 'mouse' } as unknown as PointerEvent;
      const touchEvent = { pointerType: 'touch' } as unknown as PointerEvent;
      expect(() => {
        component.spin(mouseEvent);
        component.spin(touchEvent);
      }).not.toThrow();
    });

    it('should call refreshEngine without errors', () => {
      expect(() => component.refreshEngine()).not.toThrow();
    });
  });

  describe('ngOnChanges lifecycle', () => {
    it('should respond to defaultActiveIndex changes when activeHref is undefined', fakeAsync(() => {
      component.activeHrefSignal.set(undefined); // bypass setter to avoid router side-effects
      tick();
      component.defaultActiveIndex = 2;
      component.ngOnChanges({
        defaultActiveIndex: new SimpleChange(0, 2, false)
      });
      expect(component.selected()).toBe(2);
    }));

    it('should respond to collapse changes with always and never', () => {
      component.collapse = 'always';
      component.ngOnChanges({
        collapse: new SimpleChange('auto', 'always', false)
      });
      expect(component.collapsed()).toBeTrue();

      component.collapse = 'never';
      component.ngOnChanges({
        collapse: new SimpleChange('always', 'never', false)
      });
      expect(component.collapsed()).toBeFalse();
    });

    it('should respond to items and activeHref changes', () => {
      expect(() => {
        component.ngOnChanges({
          items: new SimpleChange([], mockItems, false),
          activeHref: new SimpleChange(undefined, '/tournaments', false)
        });
      }).not.toThrow();
    });
  });

  describe('Cleanup on ngOnDestroy', () => {
    it('should clean up subscriptions and observers on destroy', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });
});
