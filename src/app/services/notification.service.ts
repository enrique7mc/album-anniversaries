import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Centralized notification service using Angular Material SnackBar.
 *
 * Provides consistent error, success, and warning messages throughout the app.
 * Uses color-coded styling and configurable durations.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Shows an error message (red background).
   * Does not auto-dismiss - user must click to close.
   *
   * @param message - Error message to display
   * @param action - Optional action button text (default: 'Close')
   */
  showError(message: string, action: string = 'Close'): void {
    this.snackBar.open(message, action, {
      duration: 0, // No auto-dismiss
      panelClass: 'error-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  /**
   * Shows a success message (green background).
   * Auto-dismisses after specified duration.
   *
   * @param message - Success message to display
   * @param duration - Auto-dismiss duration in ms (default: 3000ms)
   */
  showSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, undefined, {
      duration,
      panelClass: 'success-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  /**
   * Shows a warning message (orange background).
   * Auto-dismisses after 5 seconds.
   *
   * @param message - Warning message to display
   * @param action - Optional action button text
   */
  showWarning(message: string, action?: string): void {
    this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: 'warning-snackbar',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
