import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TabsComponent, TabItem } from './tabs.component';

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  const testTabs: TabItem[] = [
    { id: 'tab1', label: 'Tab 1', icon: '🎮', badge: 5 },
    { id: 'tab2', label: 'Tab 2' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tabs', testTabs);
    fixture.componentRef.setInput('activeTab', 'tab1');
    fixture.detectChanges();
  });

  it('should create the tabs component', () => {
    expect(component).toBeTruthy();
  });

  it('should render tabs with label, badge, and icon', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Tab 1');
    expect(text).toContain('Tab 2');
    expect(text).toContain('5');
  });

  it('should emit tabChange when a new tab is selected', () => {
    spyOn(component.tabChange, 'emit');

    component.selectTab('tab2');
    expect(component.activeTab).toBe('tab2');
    expect(component.tabChange.emit).toHaveBeenCalledWith('tab2');
  });

  it('should not emit tabChange when the same tab is selected', () => {
    spyOn(component.tabChange, 'emit');

    component.selectTab('tab1');
    expect(component.tabChange.emit).not.toHaveBeenCalled();
  });
});
