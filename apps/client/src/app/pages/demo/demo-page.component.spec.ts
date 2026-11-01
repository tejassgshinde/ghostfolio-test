import { KEY_RETURN_URL } from '@ghostfolio/client/services/return-url-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { GfDemoPageComponent } from './demo-page.component';

describe('GfDemoPageComponent', () => {
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let tokenStorageService: { getToken: jest.Mock; saveToken: jest.Mock };

  beforeEach(() => {
    window.sessionStorage.clear();

    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    tokenStorageService = {
      getToken: jest.fn().mockReturnValue(undefined),
      saveToken: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [GfDemoPageComponent],
      providers: [
        {
          provide: DataService,
          useValue: {
            fetchInfo: jest
              .fn()
              .mockReturnValue({ demoAuthToken: 'demo-token' })
          }
        },
        { provide: NotificationService, useValue: { alert: jest.fn() } },
        { provide: Router, useValue: router },
        { provide: TokenStorageService, useValue: tokenStorageService }
      ]
    });

    TestBed.overrideComponent(GfDemoPageComponent, {
      set: { template: '', templateUrl: undefined }
    });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('never uses a stored target and leaves it in storage', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    TestBed.createComponent(GfDemoPageComponent).componentInstance.ngOnInit();

    expect(tokenStorageService.saveToken).toHaveBeenCalledWith(
      'demo-token',
      true
    );
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe('/accounts?x=1');
  });
});
