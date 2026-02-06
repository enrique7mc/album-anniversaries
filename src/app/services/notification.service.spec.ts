import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    // Create spy for MatSnackBar
    const spy = jasmine.createSpyObj('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      providers: [NotificationService, { provide: MatSnackBar, useValue: spy }],
    });

    service = TestBed.inject(NotificationService);
    snackBarSpy = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('showError', () => {
    it('should open snackbar with error class and no auto-dismiss', () => {
      const message = 'Test error message';

      service.showError(message);

      expect(snackBarSpy.open).toHaveBeenCalledWith(message, 'Close', {
        duration: 0,
        panelClass: 'error-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });

    it('should use custom action text when provided', () => {
      const message = 'Test error';
      const action = 'Retry';

      service.showError(message, action);

      expect(snackBarSpy.open).toHaveBeenCalledWith(message, action, {
        duration: 0,
        panelClass: 'error-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });

    it('should use default Close action when no action provided', () => {
      service.showError('Error');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Error',
        'Close',
        jasmine.any(Object),
      );
    });
  });

  describe('showSuccess', () => {
    it('should open snackbar with success class and auto-dismiss', () => {
      const message = 'Test success message';

      service.showSuccess(message);

      expect(snackBarSpy.open).toHaveBeenCalledWith(message, undefined, {
        duration: 3000,
        panelClass: 'success-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });

    it('should use custom duration when provided', () => {
      const message = 'Success';
      const duration = 5000;

      service.showSuccess(message, duration);

      expect(snackBarSpy.open).toHaveBeenCalledWith(message, undefined, {
        duration: 5000,
        panelClass: 'success-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });

    it('should use default 3000ms duration when no duration provided', () => {
      service.showSuccess('Success');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Success',
        undefined,
        jasmine.objectContaining({ duration: 3000 }),
      );
    });

    it('should not show action button for success messages', () => {
      service.showSuccess('Success');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Success',
        undefined,
        jasmine.any(Object),
      );
    });
  });

  describe('showWarning', () => {
    it('should open snackbar with warning class', () => {
      const message = 'Test warning message';

      service.showWarning(message);

      expect(snackBarSpy.open).toHaveBeenCalledWith(message, undefined, {
        duration: 5000,
        panelClass: 'warning-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });

    it('should use 5000ms duration for warnings', () => {
      service.showWarning('Warning');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Warning',
        undefined,
        jasmine.objectContaining({ duration: 5000 }),
      );
    });

    it('should include action button when provided', () => {
      const message = 'Warning';
      const action = 'Dismiss';

      service.showWarning(message, action);

      expect(snackBarSpy.open).toHaveBeenCalledWith(message, action, {
        duration: 5000,
        panelClass: 'warning-snackbar',
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });

    it('should not show action button when not provided', () => {
      service.showWarning('Warning');

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Warning',
        undefined,
        jasmine.any(Object),
      );
    });
  });
});
