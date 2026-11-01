import { KEY_RETURN_URL } from '@ghostfolio/client/services/return-url-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { GfWebauthnPageComponent } from './webauthn-page.component';

describe('GfWebauthnPageComponent', () => {
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let tokenStorageService: { saveToken: jest.Mock };
  let webAuthnService: { deregister: jest.Mock; login: jest.Mock };

  function createComponent() {
    return TestBed.createComponent(GfWebauthnPageComponent).componentInstance;
  }

  beforeEach(() => {
    window.sessionStorage.clear();

    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    tokenStorageService = { saveToken: jest.fn() };
    webAuthnService = {
      deregister: jest.fn().mockReturnValue(of(undefined)),
      login: jest.fn().mockReturnValue(of({ authToken: 'auth-token' }))
    };

    TestBed.configureTestingModule({
      imports: [GfWebauthnPageComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: TokenStorageService, useValue: tokenStorageService },
        { provide: WebAuthnService, useValue: webAuthnService }
      ]
    });

    TestBed.overrideComponent(GfWebauthnPageComponent, {
      set: { imports: [], template: '', templateUrl: undefined }
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  describe('signIn', () => {
    it('navigates to the stored target and removes the key', () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

      createComponent().signIn();

      expect(tokenStorageService.saveToken).toHaveBeenCalledWith(
        'auth-token',
        false
      );
      expect(router.navigateByUrl).toHaveBeenCalledWith('/accounts?x=1');
      expect(router.navigate).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });

    it('navigates to home without a stored target', () => {
      createComponent().signIn();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('navigates to home for an external target and removes the key', () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, '//evil.com');

      createComponent().signIn();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    });
  });

  describe('deregisterDevice', () => {
    it('navigates to home and does not consume a stored target', () => {
      window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

      // ngOnInit is not triggered because detectChanges() is never called
      const component = createComponent();

      component.deregisterDevice();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(
        '/accounts?x=1'
      );
    });
  });
});
