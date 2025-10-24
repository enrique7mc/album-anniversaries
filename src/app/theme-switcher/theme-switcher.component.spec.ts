import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThemeSwitcherComponent } from './theme-switcher.component';
import { ThemeService } from '../theme.service';
import { MaterialModule } from '../material/material.module';

describe('ThemeSwitcherComponent', () => {
  let component: ThemeSwitcherComponent;
  let fixture: ComponentFixture<ThemeSwitcherComponent>;
  let themeService: ThemeService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ThemeSwitcherComponent ],
      imports: [ MaterialModule ],
      providers: [ ThemeService ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThemeSwitcherComponent);
    component = fixture.componentInstance;
    themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme when button is clicked', () => {
    spyOn(themeService, 'toggleTheme');
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    expect(themeService.toggleTheme).toHaveBeenCalled();
  });

  it('should display dark_mode icon when in light theme', () => {
    spyOn(themeService, 'isDarkTheme').and.returnValue(false);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon.textContent).toBe('dark_mode');
  });

  it('should display light_mode icon when in dark theme', () => {
    spyOn(themeService, 'isDarkTheme').and.returnValue(true);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon.textContent).toBe('light_mode');
  });
});
