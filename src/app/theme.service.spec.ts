import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    // Clean up body classes
    document.body.classList.remove('light-theme', 'dark-theme');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isDarkTheme', () => {
    it('should return false when no theme is stored', () => {
      expect(service.isDarkTheme()).toBe(false);
    });

    it('should return true when dark theme is stored', () => {
      localStorage.setItem('theme', 'dark');
      expect(service.isDarkTheme()).toBe(true);
    });

    it('should return false when light theme is stored', () => {
      localStorage.setItem('theme', 'light');
      expect(service.isDarkTheme()).toBe(false);
    });
  });

  describe('setDarkTheme', () => {
    it('should set dark theme in localStorage', () => {
      service.setDarkTheme(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should set light theme in localStorage', () => {
      service.setDarkTheme(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should apply dark-theme class to body when setting dark theme', () => {
      service.setDarkTheme(true);
      expect(document.body.classList.contains('dark-theme')).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(false);
    });

    it('should apply light-theme class to body when setting light theme', () => {
      service.setDarkTheme(false);
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      service.setDarkTheme(false);
      service.toggleTheme();
      expect(service.isDarkTheme()).toBe(true);
    });

    it('should toggle from dark to light', () => {
      service.setDarkTheme(true);
      service.toggleTheme();
      expect(service.isDarkTheme()).toBe(false);
    });
  });

  describe('applyCurrentTheme', () => {
    it('should apply dark-theme class when dark theme is stored', () => {
      localStorage.setItem('theme', 'dark');
      service.applyCurrentTheme();
      expect(document.body.classList.contains('dark-theme')).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(false);
    });

    it('should apply light-theme class when light theme is stored', () => {
      localStorage.setItem('theme', 'light');
      service.applyCurrentTheme();
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });

    it('should apply light-theme class when no theme is stored (default)', () => {
      service.applyCurrentTheme();
      expect(document.body.classList.contains('light-theme')).toBe(true);
      expect(document.body.classList.contains('dark-theme')).toBe(false);
    });
  });
});
