import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthShellComponent } from './auth-shell.component';

describe('AuthShellComponent', () => {
  let component: AuthShellComponent;
  let fixture: ComponentFixture<AuthShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthShellComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the auth shell', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand wordmark and copyright 2026', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('GAMING CASTLE');
    expect(el.textContent).toContain('2026');
    expect(el.textContent).toContain('PRIVACY POLICY');
    expect(el.textContent).toContain('TERMS OF SERVICE');
  });
});
