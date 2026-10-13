import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotFoundComponent } from './not-found.component';
import { AuthService } from '../../services/auth.service';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;
  let fixture: ComponentFixture<NotFoundComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the 404 component', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /admin if user is admin', () => {
    authServiceSpy.isAdmin.and.returnValue(true);
    component.navigateHome();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should navigate to /dashboard if user is authenticated customer', () => {
    authServiceSpy.isAdmin.and.returnValue(false);
    authServiceSpy.isAuthenticated.and.returnValue(true);
    component.navigateHome();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to /login if user is not authenticated', () => {
    authServiceSpy.isAdmin.and.returnValue(false);
    authServiceSpy.isAuthenticated.and.returnValue(false);
    component.navigateHome();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
