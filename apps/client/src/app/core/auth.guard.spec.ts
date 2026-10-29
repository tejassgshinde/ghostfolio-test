import {
  KEY_RETURN_URL,
  ReturnUrlStorageService
} from '@ghostfolio/client/services/return-url-storage.service';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';
import { DataService } from '@ghostfolio/ui/services';

import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const returnUrl = '/accounts?x=1';

  let authGuard: AuthGuard;
  let router: { navigate: jest.Mock };
  let userService: { get: jest.Mock; reset: jest.Mock };
  let settingsStorageService: { setSetting: jest.Mock };

  function canActivate(url: string, queryParams: Record<string, string> = {}) {
    return authGuard.canActivate(
      { queryParams } as unknown as ActivatedRouteSnapshot,
      { url } as RouterStateSnapshot
    );
  }

  beforeEach(() => {
    window.sessionStorage.clear();

    router = { navigate: jest.fn() };
    userService = { get: jest.fn(), reset: jest.fn() };
    settingsStorageService = { setSetting: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        ReturnUrlStorageService,
        { provide: DataService, useValue: { putUserSetting: jest.fn() } },
        { provide: Router, useValue: router },
        { provide: SettingsStorageService, useValue: settingsStorageService },
        { provide: UserService, useValue: userService }
      ]
    });

    authGuard = TestBed.inject(AuthGuard);
  });

  describe('signed out', () => {
    beforeEach(() => {
      userService.get.mockReturnValue(throwError(() => new Error('401')));
    });

    it('stores the requested page and navigates to start', async () => {
      await expect(canActivate(returnUrl)).resolves.toBe(false);

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(returnUrl);
      expect(router.navigate).toHaveBeenCalledWith(
        publicRoutes.start.routerLink
      );
    });

    it('stores the requested page unchanged', async () => {
      const url = '/portfolio/activities?name=BRK%20B';

      await canActivate(url);

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(url);
    });

    it('stores nothing for the start page', async () => {
      await expect(canActivate(`/${publicRoutes.start.path}`)).resolves.toBe(
        true
      );

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('keeps the stored page for the start page', async () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, returnUrl);

      await canActivate(`/${publicRoutes.start.path}`);

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(returnUrl);
    });

    it('clears the stored page on another public page', async () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, returnUrl);

      await expect(canActivate(`/${publicRoutes.pricing.path}`)).resolves.toBe(
        true
      );

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });

    it('keeps the stored page on the register page', async () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, returnUrl);

      await expect(
        canActivate(`/${publicRoutes.register.path}`)
      ).resolves.toBe(true);

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(returnUrl);
    });

    it('navigates to demo without storing for utm_source=ios', async () => {
      await expect(
        canActivate(returnUrl, { utm_source: 'ios' })
      ).resolves.toBe(false);

      expect(router.navigate).toHaveBeenCalledWith(
        publicRoutes.demo.routerLink
      );
      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });

    it('navigates to register without storing for utm_source=trusted-web-activity', async () => {
      await expect(
        canActivate(returnUrl, { utm_source: 'trusted-web-activity' })
      ).resolves.toBe(false);

      expect(router.navigate).toHaveBeenCalledWith(
        publicRoutes.register.routerLink
      );
      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });
  });

  describe('signed in', () => {
    function mockUser(viewMode: 'DEFAULT' | 'ZEN') {
      userService.get.mockReturnValue(
        of({ settings: { language: document.documentElement.lang, viewMode } })
      );
    }

    beforeEach(() => {
      window.sessionStorage.setItem(KEY_RETURN_URL, returnUrl);
    });

    it('clears the stored page', async () => {
      mockUser('DEFAULT');

      await expect(canActivate('/accounts')).resolves.toBe(true);

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });

    it('sends a Zen user at home to Zen', async () => {
      mockUser('ZEN');

      await expect(canActivate('/home')).resolves.toBe(false);

      expect(router.navigate).toHaveBeenCalledWith(
        internalRoutes.zen.routerLink
      );
    });

    it('lets a Zen user at accounts through', async () => {
      mockUser('ZEN');

      await expect(canActivate('/accounts')).resolves.toBe(true);

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('sends a DEFAULT user at zen to home', async () => {
      mockUser('DEFAULT');

      await expect(canActivate('/zen')).resolves.toBe(false);

      expect(router.navigate).toHaveBeenCalledWith(
        internalRoutes.home.routerLink
      );
    });
  });
});
