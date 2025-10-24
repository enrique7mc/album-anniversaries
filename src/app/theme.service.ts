import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeKey = 'theme';

  isDarkTheme(): boolean {
    const storedTheme = localStorage.getItem(this.themeKey);
    if (storedTheme) {
      return storedTheme === 'dark';
    }
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  setDarkTheme(isDark: boolean): void {
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem(this.themeKey, theme);
    this.updateBodyClass();
  }

  toggleTheme(): void {
    this.setDarkTheme(!this.isDarkTheme());
  }

  applyCurrentTheme(): void {
    this.updateBodyClass();
  }

  private updateBodyClass(): void {
    const body = document.body;
    if (this.isDarkTheme()) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
  }
}
