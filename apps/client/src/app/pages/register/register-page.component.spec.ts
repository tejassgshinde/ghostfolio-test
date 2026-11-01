import { KEY_RETURN_URL } from '@ghostfolio/client/services/return-url-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { DataService } from '@ghostfolio/ui/services';

import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { of } from 'rxjs';

import { GfRegisterPageComponent } from './register-page.component';

describe('GfRegisterPageComponent', () => {
  let dialog: { open: jest.Mock };
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let tokenStorageService: { saveToken: jest.Mock };

  function closeDialogWith(aDialogResult: unknown) {
    dialog.open.mockReturnValue({ afterClosed: () => of(aDialogResult) });

    const component =
      TestBed.createComponent(GfRegisterPageComponent).componentInstance;

    component.openShowAccessTokenDialog();
  }

  beforeEach(() => {
    window.sessionStorage.clear();

    dialog = { open: jest.fn() };
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    tokenStorageService = { saveToken: jest.fn() };

    TestBed.configureTestingModule({
      imports: [GfRegisterPageComponent],
      providers: [
        { provide: MatDialog, useValue: dialog },
        {
          provide: DataService,
          useValue: {
            fetchInfo: jest.fn().mockReturnValue({ globalPermissions: [] })
          }
        },
        {
          provide: DeviceDetectorService,
          useValue: {
            getDeviceInfo: jest.fn().mockReturnValue({ deviceType: 'desktop' })
          }
        },
        { provide: Router, useValue: router },
        { provide: TokenStorageService, useValue: tokenStorageService },
        { provide: UserService, useValue: { signOut: jest.fn() } }
      ]
    });

    TestBed.overrideComponent(GfRegisterPageComponent, {
      set: { imports: [], template: '', templateUrl: undefined }
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('navigates to the stored target and removes the key', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    closeDialogWith('auth-token');

    expect(tokenStorageService.saveToken).toHaveBeenCalledWith(
      'auth-token',
      true
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/accounts?x=1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('passes a stored encoded query to navigateByUrl unchanged', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?q=100%25');

    closeDialogWith('auth-token');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/accounts?q=100%25');
  });

  it('navigates to home without a stored target', () => {
    closeDialogWith('auth-token');

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to home for an external target and removes the key', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '//evil.com');

    closeDialogWith('auth-token');

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('does nothing when the dialog closes without a token', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    closeDialogWith(undefined);

    expect(tokenStorageService.saveToken).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe('/accounts?x=1');
  });
});
