import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  NgZone,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

export interface PillNavItem {
  label: string;
  href?: string;
  icon?: string;
  ariaLabel?: string;
}

export type PillNavTheme = 'dark' | 'light';
export type PillNavLayout = 'split' | 'joined';
export type PillNavItemStyle = 'pill' | 'plain';
export type PillNavHoverEffect = 'fill' | 'glide' | 'none';
export type PillNavIndicator = 'dot' | 'pill' | 'none';
export type PillNavSurface = 'glass' | 'solid' | 'none';
export type PillNavSize = 'sm' | 'md' | 'lg';
export type PillNavCollapse = 'auto' | 'always' | 'never';

const THEMES: Record<string, Record<string, string>> = {
  dark: {
    '--pn-surface': 'rgba(15, 23, 42, 0.75)',
    '--pn-solid': '#0f172a',
    '--pn-edge': 'rgba(255, 255, 255, 0.08)',
    '--pn-rim': 'rgba(255, 255, 255, 0.07)',
    '--pn-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--pn-text': 'rgba(244, 244, 245, 0.64)',
    '--pn-strong': '#f4f4f5',
    '--pn-pill': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    '--pn-pill-ink': '#ffffff',
    '--pn-pill-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 6px 16px -6px rgba(37, 99, 235, 0.5)',
    '--pn-dot': '#3b82f6',
    '--pn-ring': 'rgba(59, 130, 246, 0.55)',
    '--pn-row-hover': 'rgba(255, 255, 255, 0.06)',
    '--pn-tile': 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
    '--pn-tile-rim':
      'inset 0 0 0 1px rgba(255, 255, 255, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 4px 10px -4px rgba(0, 0, 0, 0.7)'
  },
  light: {
    '--pn-surface': 'rgba(240, 240, 243, 0.8)',
    '--pn-solid': '#f0f0f3',
    '--pn-edge': 'rgba(24, 24, 27, 0.07)',
    '--pn-rim': 'rgba(255, 255, 255, 0.95)',
    '--pn-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--pn-text': 'rgba(24, 24, 27, 0.6)',
    '--pn-strong': '#18181b',
    '--pn-pill': 'linear-gradient(180deg, #2c2c31 0%, #18181b 100%)',
    '--pn-pill-ink': '#ffffff',
    '--pn-pill-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 6px 14px -6px rgba(24, 24, 27, 0.45)',
    '--pn-dot': '#18181b',
    '--pn-ring': 'rgba(24, 24, 27, 0.45)',
    '--pn-row-hover': 'rgba(24, 24, 27, 0.05)',
    '--pn-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--pn-tile-rim':
      'inset 0 0 0 1px rgba(24, 24, 27, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1), 0 4px 10px -5px rgba(24, 24, 27, 0.25)'
  }
};

const SIZES: Record<string, Record<string, string>> = {
  sm: {
    '--pn-h': '36px',
    '--pn-pad': '3px',
    '--pn-inner': '30px',
    '--pn-x': '12px',
    '--pn-font': '13px',
    '--pn-gap': '6px',
    '--pn-mark': '18px'
  },
  md: {
    '--pn-h': '44px',
    '--pn-pad': '4px',
    '--pn-inner': '36px',
    '--pn-x': '16px',
    '--pn-font': '14px',
    '--pn-gap': '8px',
    '--pn-mark': '22px'
  },
  lg: {
    '--pn-h': '52px',
    '--pn-pad': '5px',
    '--pn-inner': '42px',
    '--pn-x': '20px',
    '--pn-font': '15px',
    '--pn-gap': '10px',
    '--pn-mark': '26px'
  }
};

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

const contrastInk = (color?: string): string | null => {
  const hex = String(color || '').trim().replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const channel = (index: number) => {
    const value = parseInt(full.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.36 ? '#121016' : '#ffffff';
};

const readVar = (element: Element, name: string): number => {
  return parseFloat(getComputedStyle(element).getPropertyValue(name)) || 0;
};

let uniqueIdSeq = 0;

@Component({
  selector: 'gc-pill-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './pill-nav.component.html',
  styleUrl: './pill-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PillNavComponent implements AfterViewInit, OnDestroy, OnChanges {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router, { optional: true });
  private readonly destroy$ = new Subject<void>();

  @Input() logo?: string | null = null;
  @Input() logoAlt = 'Logo';
  @Input() logoHref = '/';

  readonly itemsSignal = signal<PillNavItem[]>([]);
  @Input() set items(val: PillNavItem[]) {
    this.itemsSignal.set(val || []);
    this.measureSlots();
    this.syncSlots();
    this.wakePhysics();
  }
  get items(): PillNavItem[] {
    return this.itemsSignal();
  }

  readonly activeHrefSignal = signal<string | undefined>(undefined);
  @Input() set activeHref(val: string | undefined) {
    this.activeHrefSignal.set(val);
    this.measureSlots();
    this.syncSlots();
    this.wakePhysics();
  }
  get activeHref(): string | undefined {
    return this.activeHrefSignal();
  }

  @Input() defaultActiveIndex = 0;

  readonly styleVersion = signal(0);

  private _theme: PillNavTheme = 'dark';
  @Input() set theme(val: PillNavTheme) {
    this._theme = val;
    this.styleVersion.update(v => v + 1);
  }
  get theme(): PillNavTheme {
    return this._theme;
  }

  @Input() layout: PillNavLayout = 'split';

  private _size: PillNavSize = 'md';
  @Input() set size(val: PillNavSize) {
    this._size = val;
    this.styleVersion.update(v => v + 1);
  }
  get size(): PillNavSize {
    return this._size;
  }

  private _surface: PillNavSurface = 'glass';
  @Input() set surface(val: PillNavSurface) {
    this._surface = val;
    this.styleVersion.update(v => v + 1);
  }
  get surface(): PillNavSurface {
    return this._surface;
  }

  @Input() itemStyle: PillNavItemStyle = 'plain';

  private _hoverEffect: PillNavHoverEffect = 'glide';
  @Input() set hoverEffect(val: PillNavHoverEffect) {
    this._hoverEffect = val;
    this.styleVersion.update(v => v + 1);
  }
  get hoverEffect(): PillNavHoverEffect {
    return this._hoverEffect;
  }

  private _indicator: PillNavIndicator = 'dot';
  @Input() set indicator(val: PillNavIndicator) {
    this._indicator = val;
    this.styleVersion.update(v => v + 1);
  }
  get indicator(): PillNavIndicator {
    return this._indicator;
  }

  private _highlightColor?: string;
  @Input() set highlightColor(val: string | undefined) {
    this._highlightColor = val;
    this.styleVersion.update(v => v + 1);
  }
  get highlightColor(): string | undefined {
    return this._highlightColor;
  }

  private _highlightTextColor?: string;
  @Input() set highlightTextColor(val: string | undefined) {
    this._highlightTextColor = val;
    this.styleVersion.update(v => v + 1);
  }
  get highlightTextColor(): string | undefined {
    return this._highlightTextColor;
  }

  private _barColor?: string;
  @Input() set barColor(val: string | undefined) {
    this._barColor = val;
    this.styleVersion.update(v => v + 1);
  }
  get barColor(): string | undefined {
    return this._barColor;
  }

  private _textColor?: string;
  @Input() set textColor(val: string | undefined) {
    this._textColor = val;
    this.styleVersion.update(v => v + 1);
  }
  get textColor(): string | undefined {
    return this._textColor;
  }

  @Input() bounce = 0.29;
  @Input() stretch = 0.45;
  @Input() intro = true;
  @Input() collapse: PillNavCollapse = 'auto';
  @Input() ariaLabel = 'Main';

  @Output() itemClick = new EventEmitter<{ item: PillNavItem; index: number; event: Event }>();
  @Output() menuToggle = new EventEmitter<boolean>();

  @ViewChild('rootEl') rootEl?: ElementRef<HTMLElement>;
  @ViewChild('barEl') barEl?: ElementRef<HTMLElement>;
  @ViewChild('trackEl') trackEl?: ElementRef<HTMLElement>;
  @ViewChild('glideEl') glideEl?: ElementRef<HTMLElement>;
  @ViewChild('inkEl') inkEl?: ElementRef<HTMLElement>;
  @ViewChild('dotEl') dotEl?: ElementRef<HTMLElement>;
  @ViewChild('logoEl') logoEl?: ElementRef<HTMLElement>;
  @ViewChild('markEl') markEl?: ElementRef<HTMLElement>;
  @ViewChild('toggleEl') toggleEl?: ElementRef<HTMLElement>;
  @ViewChild('panelEl') panelEl?: ElementRef<HTMLElement>;
  @ViewChild('measureEl') measureEl?: ElementRef<HTMLElement>;
  @ViewChild('measureListEl') measureListEl?: ElementRef<HTMLElement>;
  @ViewChildren('slotEl') slotElements?: QueryList<ElementRef<HTMLLIElement>>;

  readonly panelId = `pill-nav-panel-${++uniqueIdSeq}`;
  readonly selected = signal(0);
  readonly collapsed = signal(false);
  readonly open = signal(false);
  readonly panelShown = signal(false);

  private slideFlag = false;
  private introFlag = true;
  private pendingCollapse: boolean | null = null;
  private animationRunning = false;
  private rafId = 0;
  private lastTime = 0;
  private timerId = 0;

  private resizeObserverRoot?: ResizeObserver;
  private resizeObserverTrack?: ResizeObserver;

  private readonly physicsState = {
    x0: 0,
    x1: 0,
    v0: 0,
    v1: 0,
    alpha: 0,
    pop: 1,
    press: 1,
    pressVelocity: 0,
    dotX: 0,
    dotVelocity: 0,
    dotAlpha: 0,
    hover: -1,
    focus: false,
    sliding: false,
    pressing: false,
    waiting: false
  };

  private rects: { left: number; width: number }[] = [];
  private trackWidth = 0;
  private trackHeight = 0;

  readonly activeIndex = computed(() => {
    const href = this.activeHrefSignal();
    const items = this.itemsSignal();
    if (href !== undefined && href !== null && href !== '') {
      const cleanHref = href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
      const idx = items.findIndex(item => {
        if (!item.href) return false;
        const itemClean = item.href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
        if (itemClean === '/') {
          return cleanHref === '/' || cleanHref === '/dashboard';
        }
        return cleanHref === itemClean || cleanHref.startsWith(itemClean + '/');
      });
      if (idx >= 0) return idx;
    }
    return this.selected();
  });

  readonly isGlide = computed(() => {
    this.styleVersion();
    const fill = this.hoverEffect === 'fill';
    return !fill && (this.hoverEffect === 'glide' || this.indicator === 'pill');
  });

  readonly computedStyleVars = computed(() => {
    this.styleVersion();
    const palette = THEMES[this.theme] ?? THEMES['dark'];
    const vars: Record<string, string> = {
      ...palette,
      ...(SIZES[this.size] ?? SIZES['md'])
    };

    if (this.surface === 'glass') {
      vars['--pn-blur'] = 'blur(20px) saturate(1.6)';
    } else if (this.surface === 'solid') {
      vars['--pn-surface'] = palette['--pn-solid'];
      vars['--pn-blur'] = 'none';
    } else if (this.surface === 'none') {
      vars['--pn-surface'] = 'transparent';
      vars['--pn-shadow'] = 'none';
      vars['--pn-blur'] = 'none';
      vars['--pn-edge'] = 'transparent';
      vars['--pn-rim'] = 'transparent';
    }

    if (this.barColor) {
      vars['--pn-surface'] = this.barColor;
      vars['--pn-solid'] = this.barColor;
    }
    if (this.textColor) {
      vars['--pn-strong'] = this.textColor;
      vars['--pn-text'] = `color-mix(in srgb, ${this.textColor} 64%, transparent)`;
    }
    if (this.highlightColor) {
      vars['--pn-pill'] = this.highlightColor;
      vars['--pn-dot'] = this.highlightColor;
      vars['--pn-pill-shadow'] = 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 6px 16px -6px rgba(0, 0, 0, 0.45)';
      vars['--pn-pill-ink'] = this.highlightTextColor || contrastInk(this.highlightColor) || palette['--pn-pill-ink'];
    } else if (this.highlightTextColor) {
      vars['--pn-pill-ink'] = this.highlightTextColor;
    }

    return vars;
  });

  rootClasses(): string {
    const list = ['pill-nav'];
    if (this.layout === 'joined') list.push('pill-nav__surface');
    return list.join(' ');
  }

  logoClasses(): string {
    const list = ['pill-nav__logo'];
    if (this.layout !== 'joined') list.push('pill-nav__surface');
    return list.join(' ');
  }

  barClasses(): string {
    const list = ['pill-nav__bar'];
    if (this.layout !== 'joined') list.push('pill-nav__surface');
    return list.join(' ');
  }

  toggleClasses(): string {
    const list = ['pill-nav__toggle'];
    if (this.layout === 'joined') list.push('pill-nav__toggle--bare');
    else list.push('pill-nav__surface');
    return list.join(' ');
  }

  trackByItem(item: PillNavItem, index: number): string {
    return `${item.label}-${index}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.styleVersion.update(v => v + 1);
    if (changes['defaultActiveIndex']) {
      this.selected.set(this.defaultActiveIndex);
    }
    if (changes['collapse']) {
      if (this.collapse === 'always') this.collapsed.set(true);
      else if (this.collapse === 'never') this.collapsed.set(false);
    }
    if (changes['activeHref'] || changes['items']) {
      this.measureSlots();
      this.syncSlots();
      this.wakePhysics();
    }
    this.refreshEngine();
  }

  ngAfterViewInit(): void {
    this.selected.set(this.defaultActiveIndex);
    this.introFlag = this.intro;

    if (this.router) {
      this.router.events
        .pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          takeUntil(this.destroy$)
        )
        .subscribe((e) => {
          const url = e.urlAfterRedirects || e.url;
          this.activeHrefSignal.set(url);
          this.measureSlots();
          this.syncSlots();
          this.wakePhysics();
        });
    }

    this.ngZone.runOutsideAngular(() => {
      this.setupPhysicsEngine();
      this.setupResizeObservers();
      this.runIntroAnimations();

      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
      document.addEventListener('pointerdown', this.onDocumentPointerDown);
      document.addEventListener('keydown', this.onDocumentKeyDown);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.timerId) clearTimeout(this.timerId);

    this.resizeObserverRoot?.disconnect();
    this.resizeObserverTrack?.disconnect();

    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('pointerdown', this.onDocumentPointerDown);
    document.removeEventListener('keydown', this.onDocumentKeyDown);
  }

  private setupPhysicsEngine(): void {
    const root = this.rootEl?.nativeElement;
    if (!root) return;

    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.physicsState.waiting = this.slideFlag && !reduce;
    this.slideFlag = false;

    this.measureSlots();
    this.syncSlots();
    this.renderPhysics();
    this.wakePhysics();

    const docFonts = typeof document !== 'undefined'
      ? (document as Document & { fonts?: FontFaceSet }).fonts
      : undefined;
    if (docFonts?.ready) {
      docFonts.ready.then(() => {
        this.measureSlots();
        this.syncSlots();
        this.wakePhysics();
      }).catch(() => {});
    }

    setTimeout(() => {
      this.measureSlots();
      this.syncSlots();
      this.wakePhysics();
    }, 50);

    setTimeout(() => {
      this.measureSlots();
      this.syncSlots();
      this.wakePhysics();
    }, 180);

    if (this.physicsState.waiting) {
      this.physicsState.x0 = 0;
      this.physicsState.x1 = 0;
      this.timerId = window.setTimeout(() => {
        this.physicsState.waiting = false;
        if (this.getGlideIndex() >= 0) {
          this.physicsState.alpha = 1;
          this.physicsState.sliding = true;
        }
        this.wakePhysics();
      }, 420);
    }
  }

  private setupResizeObservers(): void {
    if (typeof ResizeObserver === 'undefined') return;

    if (this.trackEl?.nativeElement) {
      this.resizeObserverTrack = new ResizeObserver(() => {
        this.measureSlots();
        this.renderPhysics();
        this.wakePhysics();
      });
      this.resizeObserverTrack.observe(this.trackEl.nativeElement);
    }

    if (this.rootEl?.nativeElement?.parentElement && this.measureEl?.nativeElement) {
      this.resizeObserverRoot = new ResizeObserver(() => {
        this.evaluateCollapse();
      });
      this.resizeObserverRoot.observe(this.rootEl.nativeElement.parentElement);
      this.resizeObserverRoot.observe(this.measureEl.nativeElement);
    }
  }

  private evaluateCollapse(): void {
    if (this.collapse === 'always' || this.collapse === 'never') {
      const next = this.collapse === 'always';
      if (this.collapsed() !== next) {
        this.ngZone.run(() => this.collapsed.set(next));
      }
      return;
    }

    const root = this.rootEl?.nativeElement;
    const parent = root?.parentElement;
    const measureList = this.measureListEl?.nativeElement;
    if (!root || !parent || !measureList) return;

    const styles = getComputedStyle(parent);
    const available =
      parent.clientWidth - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0);
    const listWidth = measureList.offsetWidth || 0;
    const height = readVar(root, '--pn-h');
    const pad = readVar(root, '--pn-pad');
    const gap = readVar(root, '--pn-gap');
    const inner = readVar(root, '--pn-inner');
    const hasLogo = Boolean(this.logo);
    const joined = this.layout === 'joined';

    const need = joined
      ? pad * 2 + (hasLogo ? inner + 2 : 0) + listWidth
      : (hasLogo ? height + gap : 0) + listWidth + pad * 2;
    const next = need > available + 0.5;

    if (this.introFlag && next !== this.collapsed()) {
      this.pendingCollapse = next;
    }

    if (this.collapsed() !== next) {
      this.ngZone.run(() => this.collapsed.set(next));
      setTimeout(() => this.refreshEngine(), 30);
    }
  }

  private runIntroAnimations(): void {
    const root = this.rootEl?.nativeElement;
    if (!root || !this.introFlag) return;
    if (this.pendingCollapse !== null && this.pendingCollapse !== this.collapsed()) return;

    this.pendingCollapse = null;
    this.introFlag = false;

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const pop = (element?: HTMLElement, delay = 0) => {
      element?.animate(
        [
          { opacity: '0', transform: 'scale(0.6)' },
          { opacity: '1', transform: 'scale(1)' }
        ],
        { duration: 700, delay, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' }
      );
    };

    const reveal = (element?: HTMLElement) => {
      if (!element) return;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      element.animate(
        [
          { clipPath: `inset(0px ${Math.max(0, width - height)}px 0px 0px round ${height / 2}px)` },
          { clipPath: `inset(0px 0px 0px 0px round ${height / 2}px)` }
        ],
        { duration: 760, delay: 90, easing: EASE_OUT, fill: 'backwards' }
      );
    };

    pop(this.logoEl?.nativeElement, 0);

    if (this.collapsed()) {
      pop(this.toggleEl?.nativeElement, 120);
      return;
    }

    this.slideFlag = true;
    reveal(this.layout === 'joined' ? root : this.barEl?.nativeElement);

    this.slotElements?.forEach((slotRef, index) => {
      slotRef.nativeElement.animate(
        [
          { opacity: '0', transform: 'translateX(-10px)' },
          { opacity: '1', transform: 'translateX(0)' }
        ],
        { duration: 560, delay: 200 + index * 50, easing: EASE_OUT, fill: 'backwards' }
      );
    });
  }

  private measureSlots(): void {
    const track = this.trackEl?.nativeElement;
    if (!track) return;
    this.trackWidth = track.offsetWidth;
    this.trackHeight = track.offsetHeight;

    const slots = (this.slotElements && this.slotElements.length > 0)
      ? this.slotElements.map(s => s.nativeElement)
      : Array.from(track.querySelectorAll<HTMLLIElement>('.pill-nav__slot'));

    slots.forEach((el, index) => {
      this.rects[index] = { left: el.offsetLeft, width: el.offsetWidth };
      const reach = Math.ceil(2 * Math.sqrt(Math.pow(el.offsetWidth / 2, 2) + Math.pow(el.offsetHeight, 2))) + 2;
      el.style.setProperty('--pn-fill', `${reach}px`);
    });
  }

  private getGlideIndex(): number {
    if (this.hoverEffect === 'fill') return -1;
    if (this.hoverEffect === 'glide' && this.physicsState.hover >= 0) return this.physicsState.hover;
    return this.indicator === 'pill' ? this.activeIndex() : -1;
  }

  private syncSlots(): void {
    const root = this.rootEl?.nativeElement;
    if (!root) return;

    this.slotElements?.forEach((slotRef, index) => {
      const hovered = this.physicsState.hover === index;
      const el = slotRef.nativeElement;
      el.toggleAttribute('data-lit', hovered);
      el.toggleAttribute('data-hover', hovered && this.hoverEffect === 'fill');
    });

    root.toggleAttribute('data-focus', this.physicsState.focus && this.physicsState.hover >= 0);
    root.toggleAttribute(
      'data-dot-lit',
      this.hoverEffect === 'fill' && this.physicsState.hover >= 0 && this.physicsState.hover === this.activeIndex()
    );
  }

  private renderPhysics(): void {
    const glide = this.glideEl?.nativeElement;
    const ink = this.inkEl?.nativeElement;
    const dot = this.dotEl?.nativeElement;

    const width = Math.max(0, this.physicsState.x1 - this.physicsState.x0);
    const scale = this.physicsState.press * this.physicsState.pop;
    const target = this.rects[this.getGlideIndex()];
    const squash = target ? 1 - clamp((width / Math.max(target.width, 1) - 1) * 0.3, 0, 0.14) : 1;

    if (glide) {
      glide.style.width = `${width}px`;
      glide.style.transform = `translate3d(${this.physicsState.x0}px, 0, 0) scale(${scale}, ${scale * squash})`;
      glide.style.opacity = `${this.physicsState.alpha}`;
    }

    if (ink) {
      const half = (width * scale) / 2;
      const center = (this.physicsState.x0 + this.physicsState.x1) / 2;
      const inset = (this.trackHeight * (1 - scale * squash)) / 2;
      ink.style.clipPath = `inset(${inset}px ${this.trackWidth - center - half}px ${inset}px ${center - half}px round ${this.trackHeight / 2}px)`;
      ink.style.opacity = `${this.physicsState.alpha}`;
    }

    if (dot) {
      const pull = clamp(Math.abs(this.physicsState.dotVelocity) / 700, 0, 2.2);
      dot.style.transform = `translate3d(${this.physicsState.dotX}px, 0, 0) scaleX(${1 + pull})`;
      dot.style.opacity = `${this.physicsState.dotAlpha}`;
    }
  }

  private tick = (now: number): void => {
    this.rafId = 0;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 1 / 60;
    this.lastTime = now;

    const index = this.getGlideIndex();
    const target = this.rects[index];
    const zeta = 1 - 0.55 * clamp(this.bounce, 0, 1);
    const base = 520;
    let busy = false;

    if (target && !this.physicsState.waiting) {
      const t0 = target.left;
      const t1 = target.left + target.width;

      if (this.physicsState.alpha < 0.02 && !this.physicsState.sliding) {
        this.physicsState.x0 = t0;
        this.physicsState.x1 = t1;
        this.physicsState.v0 = 0;
        this.physicsState.v1 = 0;
        this.physicsState.pop = 0.9;
      }

      if (reduce) {
        this.physicsState.x0 = t0;
        this.physicsState.x1 = t1;
        this.physicsState.v0 = 0;
        this.physicsState.v1 = 0;
      } else {
        const direction = Math.sign((t0 + t1) / 2 - (this.physicsState.x0 + this.physicsState.x1) / 2);
        const stretchVal = clamp(this.stretch, 0, 1);
        const lead = base * (1 + 0.9 * stretchVal);
        const trail = base * (1 - 0.5 * stretchVal);
        const k0 = direction < 0 ? lead : direction > 0 ? trail : base;
        const k1 = direction > 0 ? lead : direction < 0 ? trail : base;
        const steps = Math.ceil(dt / (1 / 240));
        const h = dt / steps;

        for (let i = 0; i < steps; i++) {
          this.physicsState.v0 += (-k0 * (this.physicsState.x0 - t0) - 2 * zeta * Math.sqrt(k0) * this.physicsState.v0) * h;
          this.physicsState.x0 += this.physicsState.v0 * h;
          this.physicsState.v1 += (-k1 * (this.physicsState.x1 - t1) - 2 * zeta * Math.sqrt(k1) * this.physicsState.v1) * h;
          this.physicsState.x1 += this.physicsState.v1 * h;
        }
      }

      this.physicsState.alpha += (1 - this.physicsState.alpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.06));
      busy =
        Math.abs(this.physicsState.x0 - t0) > 0.05 ||
        Math.abs(this.physicsState.x1 - t1) > 0.05 ||
        Math.abs(this.physicsState.v0) > 0.5 ||
        Math.abs(this.physicsState.v1) > 0.5 ||
        this.physicsState.alpha < 0.999;

      if (!busy) this.physicsState.sliding = false;
    } else {
      this.physicsState.alpha += (0 - this.physicsState.alpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.07));
      if (this.physicsState.alpha > 0.002) busy = true;
      else this.physicsState.alpha = 0;
    }

    this.physicsState.pop += (1 - this.physicsState.pop) * (reduce ? 1 : 1 - Math.exp(-dt / 0.09));
    if (Math.abs(1 - this.physicsState.pop) > 0.001) busy = true;

    const pressTarget = this.physicsState.pressing ? 0.95 : 1;
    if (reduce) {
      this.physicsState.press = pressTarget;
      this.physicsState.pressVelocity = 0;
    } else {
      this.physicsState.pressVelocity += (-700 * (this.physicsState.press - pressTarget) - 30 * this.physicsState.pressVelocity) * dt;
      this.physicsState.press += this.physicsState.pressVelocity * dt;
    }
    if (Math.abs(this.physicsState.press - pressTarget) > 0.0005 || Math.abs(this.physicsState.pressVelocity) > 0.01) {
      busy = true;
    }

    const targetIdx = this.activeIndex();
    if (!this.rects[targetIdx] || this.rects[targetIdx].width === 0) {
      this.measureSlots();
    }
    const dotTarget = this.indicator === 'dot' && this.rects[targetIdx] ? this.rects[targetIdx] : null;
    if (dotTarget && !this.physicsState.waiting) {
      const center = dotTarget.left + dotTarget.width / 2;
      if (this.physicsState.dotAlpha < 0.02) {
        this.physicsState.dotX = center;
        this.physicsState.dotVelocity = 0;
      }
      if (reduce) {
        this.physicsState.dotX = center;
        this.physicsState.dotVelocity = 0;
      } else {
        const k = 360;
        const steps = Math.ceil(dt / (1 / 240));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
          this.physicsState.dotVelocity +=
            (-k * (this.physicsState.dotX - center) - 2 * (1 - 0.5 * clamp(this.bounce, 0, 1)) * Math.sqrt(k) * this.physicsState.dotVelocity) * h;
          this.physicsState.dotX += this.physicsState.dotVelocity * h;
        }
      }
      this.physicsState.dotAlpha += (1 - this.physicsState.dotAlpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.1));
      if (Math.abs(this.physicsState.dotX - center) > 0.05 || Math.abs(this.physicsState.dotVelocity) > 0.5 || this.physicsState.dotAlpha < 0.999) {
        busy = true;
      }
    } else {
      this.physicsState.dotAlpha += (0 - this.physicsState.dotAlpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.1));
      if (this.physicsState.dotAlpha > 0.002) busy = true;
      else this.physicsState.dotAlpha = 0;
    }

    this.renderPhysics();
    if (busy) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.animationRunning = false;
    }
  };

  private wakePhysics(): void {
    if (!this.animationRunning) {
      this.lastTime = 0;
      this.animationRunning = true;
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  refreshEngine(): void {
    this.measureSlots();
    this.syncSlots();
    this.wakePhysics();
  }

  onSlotPointerEnter(index: number, event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    this.physicsState.hover = index;
    this.physicsState.focus = false;
    this.syncSlots();
    this.wakePhysics();
  }

  onSlotPointerDown(event: PointerEvent): void {
    if (event && event.button > 0) return;
    this.physicsState.pressing = true;
    this.wakePhysics();
  }

  onSlotFocus(index: number, event: FocusEvent): void {
    const target = event.target as Element;
    const visible = target && typeof target.matches === 'function' && target.matches(':focus-visible');
    this.physicsState.focus = Boolean(visible);
    this.physicsState.hover = visible ? index : this.physicsState.hover;
    this.syncSlots();
    this.wakePhysics();
  }

  onSlotBlur(): void {
    if (!this.physicsState.focus) return;
    this.physicsState.focus = false;
    this.physicsState.hover = -1;
    this.syncSlots();
    this.wakePhysics();
  }

  onTrackLeave(): void {
    if (this.physicsState.focus) return;
    this.physicsState.hover = -1;
    this.syncSlots();
    this.wakePhysics();
  }

  private readonly onPointerUp = (): void => {
    if (!this.physicsState.pressing) return;
    this.physicsState.pressing = false;
    this.wakePhysics();
  };

  private readonly onDocumentPointerDown = (event: MouseEvent): void => {
    if (!this.open()) return;
    const target = event.target as Node;
    if (target && this.rootEl?.nativeElement?.contains(target)) return;
    this.ngZone.run(() => this.setMenuOpen(false));
  };

  private readonly onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (!this.open() || event.key !== 'Escape') return;
    this.ngZone.run(() => {
      this.setMenuOpen(false);
      this.toggleEl?.nativeElement?.focus();
    });
  };

  spin(event: PointerEvent): void {
    const mark = this.markEl?.nativeElement;
    if (!mark || event.pointerType === 'touch' || mark.getAnimations?.().length) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    mark.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: 900,
      easing: 'cubic-bezier(0.65, 0, 0.25, 1)'
    });
  }

  onItemClicked(item: PillNavItem, index: number, event: Event): void {
    this.itemClick.emit({ item, index, event });
    if (!event.defaultPrevented) {
      this.selected.set(index);
      if (item.href) {
        this.activeHrefSignal.set(item.href);
      }
      this.measureSlots();
      this.syncSlots();
      this.wakePhysics();
    }
  }

  onPanelItemClicked(item: PillNavItem, index: number, event: Event): void {
    this.onItemClicked(item, index, event);
    this.setMenuOpen(false);
  }

  toggleMenu(): void {
    this.setMenuOpen(!this.open());
  }

  private setMenuOpen(open: boolean): void {
    this.open.set(open);
    if (open) this.panelShown.set(true);
    this.menuToggle.emit(open);
    this.animatePanel(open);
  }

  private animatePanel(open: boolean): void {
    const panel = this.panelEl?.nativeElement;
    const root = this.rootEl?.nativeElement;
    if (!panel || !root) return;

    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      if (!open) this.panelShown.set(false);
      return;
    }

    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const header = this.layout === 'joined' ? root.offsetHeight : (this.toggleEl?.nativeElement?.offsetHeight ?? 44);
    const start = this.layout === 'joined'
      ? `inset(0px 0px ${Math.max(0, height - header)}px 0px round ${header / 2}px)`
      : `inset(0px 0px ${Math.max(0, height - header)}px ${Math.max(0, width - header)}px round ${header / 2}px)`;
    const end = 'inset(0px 0px 0px 0px round 24px)';

    if (open) {
      panel.animate([{ clipPath: start }, { clipPath: end }], { duration: 560, easing: EASE_OUT });
      const rows = panel.querySelectorAll('li');
      rows.forEach((row, index) => {
        row.animate(
          [
            { opacity: '0', transform: 'translateY(-8px)' },
            { opacity: '1', transform: 'translateY(0)' }
          ],
          { duration: 420, delay: 90 + index * 40, easing: EASE_OUT, fill: 'backwards' }
        );
      });
    } else {
      const morph = panel.animate([{ clipPath: end }, { clipPath: start }], {
        duration: 380,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      });
      morph.onfinish = () => this.panelShown.set(false);
    }
  }
}
