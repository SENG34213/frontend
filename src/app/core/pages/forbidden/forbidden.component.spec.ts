import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ForbiddenComponent } from './forbidden.component';
import { AuthService } from '../../services/auth.service';

describe('ForbiddenComponent', () => {
  let component: ForbiddenComponent;
  let fixture: ComponentFixture<ForbiddenComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);

    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForbiddenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the 403 forbidden component', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /admin if user is admin', () => {
    authServiceSpy.isAdmin.and.returnValue(true);
    component.navigateBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should navigate to /dashboard if user is not admin', () => {
    authServiceSpy.isAdmin.and.returnValue(false);
    component.navigateBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
