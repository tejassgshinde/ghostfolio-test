import {
  KEY_RETURN_URL,
  ReturnUrlStorageService,
  getSafeReturnUrl
} from './return-url-storage.service';

describe('getSafeReturnUrl', () => {
  it.each([
    '/accounts?x=1',
    '/portfolio/activities?type=BUY',
    '/home',
    '/zen',
    '/portfolio/activities?name=BRK%20B',
    '/accounts?next=%2Fhome',
    '/accounts?q=100%25',
    '/accounts?q=a%5Cb'
  ])('accepts %s unchanged', (url) => {
    expect(getSafeReturnUrl(url)).toBe(url);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '\\\\evil',
    'javascript:alert(1)',
    'data:text/html,x',
    '/%2F%2Fevil.com',
    '/%5Cevil',
    '/%E0%A4%A',
    '',
    '/',
    '/auth/some.jwt.token',
    '/webauthn',
    '/start',
    '/start?x=1',
    '/register',
    '/demo',
    '/accounts?q=a b',
    '/accounts?q=a\u0000b',
    '/accounts?q=a\nb'
  ])('rejects %j', (url) => {
    expect(getSafeReturnUrl(url)).toBeUndefined();
  });

  it('rejects non-string values', () => {
    expect(getSafeReturnUrl(undefined)).toBeUndefined();
    expect(getSafeReturnUrl(null)).toBeUndefined();
    expect(getSafeReturnUrl(42)).toBeUndefined();
    expect(getSafeReturnUrl({})).toBeUndefined();
  });

  it('rejects an over-long string', () => {
    expect(getSafeReturnUrl('/' + 'a'.repeat(2048))).toBeUndefined();
  });
});

describe('ReturnUrlStorageService', () => {
  let service: ReturnUrlStorageService;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    service = new ReturnUrlStorageService();
  });

  it('consumeReturnUrl returns a valid value and removes the key', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/accounts?x=1');

    expect(service.consumeReturnUrl()).toBe('/accounts?x=1');
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('consumeReturnUrl removes the key even if the value is invalid', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, 'https://evil.com');

    expect(service.consumeReturnUrl()).toBeUndefined();
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('getReturnUrl does not remove the key', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/home');

    expect(service.getReturnUrl()).toBe('/home');
    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBe('/home');
  });

  it('saveReturnUrl with an invalid value removes an existing key', () => {
    window.sessionStorage.setItem(KEY_RETURN_URL, '/home');

    service.saveReturnUrl('//evil.com');

    expect(window.sessionStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('saveReturnUrl then getReturnUrl round-trips an encoded query unchanged', () => {
    const url = '/portfolio/activities?name=BRK%20B&next=%2Fhome&q=100%25';

    service.saveReturnUrl(url);

    expect(service.getReturnUrl()).toBe(url);
  });

  it('only uses sessionStorage', () => {
    service.saveReturnUrl('/accounts');

    expect(window.localStorage.getItem(KEY_RETURN_URL)).toBeNull();
  });

  it('removeReturnUrl removes the key', () => {
    service.saveReturnUrl('/accounts');
    service.removeReturnUrl();

    expect(service.getReturnUrl()).toBeUndefined();
  });
});
