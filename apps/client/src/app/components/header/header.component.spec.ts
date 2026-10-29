import { LayoutService } from '@ghostfolio/client/core/layout.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { KEY_RETURN_URL } from '@ghostfolio/client/services/return-url-storage.service';
import { SettingsStorageService } from '@ghostfolio/client/services/settings-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { DataService } from '@ghostfolio/ui/services';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { GfHeaderComponent } from './header.component';

describe('GfHeaderComponent', () => {
  let component: GfHeaderComponent;
  let fixture: ComponentFixture<GfHeaderComponent>;
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
  let userLanguage: string;

  const openLoginDialog = () => {
    (component as any).openLoginDialog();
  };

  beforeEach(async () => {
    document.documentElement.lang = 'en';
    userLanguage = 'en';
    window.sessionStorage.clear();

    router = { navigate: jest.fn(), navigateByUrl: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [GfHeaderComponent],
      providers: [
        { provide: DataService, useValue: { loginAnonymous: jest.fn() } },
        {
          provide: ImpersonationStorageService,
          useValue: { onChangeHasImpersonation: () => of(null) }
        },
        { provide: LayoutService, useValue: {} },
        {
          provide: MatDialog,
          useValue: {
            open: jest.fn(() => ({
              afterClosed: () => of({ accessToken: 't' })
            }))
          }
        },
        { provide: NotificationService, useValue: { alert: jest.fn() } },
        { provide: Router, useValue: router },
        {
          provide: SettingsStorageService,
          useValue: { getSetting: jest.fn(() => undefined) }
        },
        { provide: TokenStorageService, useValue: { saveToken: jest.fn() } },
        {
          provide: UserService,
          useValue: {
            get: jest.fn(() => of({ settings: { language: userLanguage } })),
            hasFilters: jest.fn(() => false)
          }
        }
      ]
    })
      .overrideComponent(GfHeaderComponent, {
        set: {
          imports: [],
          schemas: [CUSTOM_ELEMENTS_SCHEMA],
          styleUrls: [],
          template: '',
          templateUrl: undefined
        }
      })
      .compileComponents();

    jest
      .mocked(TestBed.inject(DataService).loginAnonymous)
      .mockReturnValue(of({ authToken: 'jwt' }));

    fixture = TestBed.createComponent(GfHeaderComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('navigates to the stored return URL and removes the key', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    openLoginDialog();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/accounts?x=1');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('passes an encoded query to navigateByUrl unchanged', () => {
    const url = '/portfolio/activities?name=BRK%20B';

    window.sessionStorage.setItem(KEY_RETURN_URL, url);

    openLoginDialog();

    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl.mock.calls[0][0]).toBe(url);
  });

  it('navigates to the root without a stored return URL', () => {
    openLoginDialog();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to the root for an external return URL', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, 'https://evil.com');

    openLoginDialog();

    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('consumes the return URL on a language mismatch', () => {
    // jsdom cannot observe `window.location.href`, so the full URL is not
    // asserted here
    userLanguage = 'de';
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    try {
      openLoginDialog();
    } catch {
      // jsdom: navigation not implemented
    }

    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
