import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsComponent } from './tabs.component';

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    component.tabs = [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' }
    ];
    component.activeTab = 'one';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should change active tab and emit when a different tab is selected', () => {
    const emitSpy = spyOn(component.tabChange, 'emit');

    component.selectTab('two');

    expect(component.activeTab).toBe('two');
    expect(emitSpy).toHaveBeenCalledWith('two');
  });

  it('should not emit when the active tab is selected again', () => {
    const emitSpy = spyOn(component.tabChange, 'emit');

    component.selectTab('one');

    expect(emitSpy).not.toHaveBeenCalled();
  });
});
