import {
  KEY_RETURN_URL,
  ReturnUrlStorageService
} from '@ghostfolio/client/services/return-url-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';

import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDetectorService } from 'ngx-device-detector';

import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ReturnUrlStorageService,
        UserService,
        {
          provide: DeviceDetectorService,
          useValue: { deviceInfo: () => ({ deviceType: 'desktop' }) }
        },
        { provide: HttpClient, useValue: { get: jest.fn() } },
        { provide: MatDialog, useValue: { open: jest.fn() } },
        { provide: WebAuthnService, useValue: { isEnabled: () => false } }
      ]
    });

    userService = TestBed.inject(UserService);
  });

  describe('signOut', () => {
    it('keeps the stored return target and wipes other session keys', () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');
      window.sessionStorage.setItem('other', 'value');
      window.localStorage.setItem('other', 'value');

      userService.signOut();

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(
        '/accounts?x=1'
      );
      expect(window.sessionStorage.getItem('other')).toBeNull();
      expect(window.localStorage.getItem('other')).toBeNull();
    });

    it('does not store anything without a return target', () => {
      window.sessionStorage.setItem('other', 'value');

      userService.signOut();

      expect(window.sessionStorage.length).toBe(0);
    });

    it('drops an unsafe stored return target', () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, 'https://evil.com');

      userService.signOut();

      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });

    it('keeps utm_source', () => {
      window.localStorage.setItem('utm_source', 'ios');

      userService.signOut();

      expect(window.localStorage.getItem('utm_source')).toBe('ios');
    });
  });
});
