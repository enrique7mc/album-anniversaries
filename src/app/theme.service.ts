import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeKey = 'theme';

  isDarkTheme(): boolean {
    return localStorage.getItem(this.themeKey) === 'dark';
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
