import { internalRoutes, publicRoutes } from '@ghostfolio/common/routes/routes';

import { Service } from '@angular/core';

export const KEY_RETURN_URL = 'returnUrl';

const MAX_RETURN_URL_LENGTH = 2048;

/**
 * Returns `aUrl` unchanged (never decoded) if it is a safe in-app router URL,
 * otherwise `undefined`.
 */
export function getSafeReturnUrl(aUrl: unknown): string | undefined {
  // 1. String with a sane length
  if (
    typeof aUrl !== 'string' ||
    aUrl.length < 1 ||
    aUrl.length > MAX_RETURN_URL_LENGTH
  ) {
    return undefined;
  }

  // 2. Raw string: no backslash, whitespace or control characters
  // eslint-disable-next-line no-control-regex
  if (/[\\\s\u0000-\u001F\u007F]/.test(aUrl)) {
    return undefined;
  }

  // 3. Raw string: absolute path, not protocol-relative
  if (aUrl[0] !== '/' || aUrl[1] === '/' || aUrl[1] === '\\') {
    return undefined;
  }

  // 4. Must be decodable
  try {
    decodeURIComponent(aUrl);
  } catch {
    return undefined;
  }

  // 5. Decoded path portion must not become protocol-relative
  const pathEnd = aUrl.search(/[?#]/);
  const rawPath = pathEnd === -1 ? aUrl : aUrl.slice(0, pathEnd);
  const decodedPath = decodeURIComponent(rawPath);

  if (decodedPath.startsWith('//') || decodedPath.startsWith('/\\')) {
    return undefined;
  }

  // 6. Must resolve to the same origin
  try {
    const { origin } = window.location;

    if (new URL(aUrl, origin).origin !== origin) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  // 7. Not the root, and not an auth / webauthn / public page
  if (rawPath === '/') {
    return undefined;
  }

  const firstSegment = decodeURIComponent(rawPath.slice(1).split(/[/;(]/)[0]);

  const blockedPaths = [
    internalRoutes.auth.path,
    internalRoutes.webauthn.path,
    ...Object.values(publicRoutes).map(({ path }) => {
      return path;
    })
  ];

  if (blockedPaths.includes(firstSegment)) {
    return undefined;
  }

  return aUrl;
}

@Service()
export class ReturnUrlStorageService {
  public consumeReturnUrl(): string | undefined {
    const value = window.sessionStorage.getItem(KEY_RETURN_URL);

    this.removeReturnUrl();

    return getSafeReturnUrl(value);
  }

  public getReturnUrl(): string | undefined {
    return getSafeReturnUrl(window.sessionStorage.getItem(KEY_RETURN_URL));
  }

  public removeReturnUrl() {
    window.sessionStorage.removeItem(KEY_RETURN_URL);
  }

  public saveReturnUrl(aUrl: string) {
    const safeUrl = getSafeReturnUrl(aUrl);

    if (safeUrl) {
      window.sessionStorage.setItem(KEY_RETURN_URL, safeUrl);
    } else {
      this.removeReturnUrl();
    }
  }
}
