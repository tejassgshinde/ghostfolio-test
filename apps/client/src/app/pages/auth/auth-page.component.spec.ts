import { KEY_RETURN_URL } from '@ghostfolio/client/services/return-url-storage.service';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { GfAuthPageComponent } from './auth-page.component';

describe('GfAuthPageComponent', () => {
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let tokenStorageService: { saveToken: jest.Mock };

  const create = async (params: Record<string, string>) => {
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    tokenStorageService = { saveToken: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [GfAuthPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of(params) } },
        { provide: Router, useValue: router },
        {
          provide: SettingsStorageService,
          useValue: { getSetting: jest.fn(() => undefined) }
        },
        { provide: TokenStorageService, useValue: tokenStorageService }
      ]
    })
      .overrideComponent(GfAuthPageComponent, {
        set: { styleUrls: [], template: '', templateUrl: undefined }
      })
      .compileComponents();

    const fixture = TestBed.createComponent(GfAuthPageComponent);

    fixture.detectChanges();
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('navigates to the stored return URL and removes the key', async () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    await create({ jwt: 'x' });

    expect(tokenStorageService.saveToken).toHaveBeenCalledWith('x', false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/accounts?x=1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('navigates to the root without a stored return URL', async () => {
    await create({ jwt: 'x' });

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to the root for an external return URL', async () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, 'https://evil.com');

    await create({ jwt: 'x' });

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to the root and keeps the return URL without a jwt', async () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    await create({});

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe(
      '/accounts?x=1'
    );
  });
});
