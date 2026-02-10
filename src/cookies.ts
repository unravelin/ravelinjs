/**
 * Configuration interface for the CookieJar.
 */
interface CookieJarConfig {
  /** The domain on which to store cookies. */
  domain?: string;
  /** The SameSite attribute to control how cookies are sent in cross-site requests. */
  sameSite?: string;
}

/**
 * Interface representing the cookie object passed to the set method.
 */
interface CookieOptions {
  /** The name of the cookie. */
  name: string;
  /** The value to be stored in the cookie. */
  value: string;
  /** The path to store the cookie under. Defaults to "/". */
  path?: string;
  /** The expiry time of the cookie. If not set, the cookie implicitly becomes a session cookie. */
  expires?: Date;
}

/**
 * CookieJar provides getters/setters for cookies.
 */
export class CookieJar {
  private samesite?: string;

  public constructor(private cfg: CookieJarConfig) {}

  /**
   * Returns the value of the cookie of the given name, or undefined.
   * @param name The name of the cookie to retrieve.
   */
  public get(name: string): string | undefined {
    const cookies = document.cookie.split('; ');
    for (let i = cookies.length - 1; i >= 0; i--) {
      const x = cookies[i].split('=');
      if (x[0] === name) {
        return x[1];
      }
    }
    return undefined;
  }

  /**
   * Set a cookie on the given domain.
   * @param c The cookie options to set.
   */
  public set(c: CookieOptions) {
    const cook =
      c.name +
      '=' +
      c.value +
      ';path=' +
      (c.path || '/') +
      (c.expires ? ';expires=' + c.expires.toUTCString() : '') +
      (this.cfg.domain ? ';domain=' + this.cfg.domain : '');

    if (typeof this.samesite === 'undefined') {
      // Determine the correct value for SameSite.
      if (this.cfg.sameSite) {
        this.samesite = ';SameSite=' + this.cfg.sameSite;
      } else if (hasWebKitSameSiteBug(window.navigator.userAgent)) {
        this.samesite = '';
      } else if (window.location.protocol === 'https:') {
        this.samesite = ';SameSite=None;Secure';
      } else {
        this.samesite = ';SameSite=Lax';
      }

      // Try this samesite value.
      document.cookie = cook + this.samesite;
      if (this.get(c.name) === c.value) {
        // We set the cookie successfully.
        return;
      }
      // The cookie was discarded - avoid using samesite.
      this.samesite = '';
    }

    document.cookie = cook + this.samesite;
  }
}

/**
 * hasWebKitSameSiteBug indicates whether a given User-Agent treats
 * SameSite:None on cookies as if it were SameSite:Strict, which is very
 * different. Adapted from the procedure on
 * https://www.chromium.org/updates/same-site/incompatible-clients.
 *
 * @param ua string
 * @returns bool
 */
function hasWebKitSameSiteBug(ua: string): boolean {
  if (/\(iP.+; CPU .*OS 12[_\d]*.*\) AppleWebKit\//.test(ua)) {
    return true;
  }
  // prettier-ignore
  if (/\(Macintosh;.*Mac OS X 10_14[_\d]*.*\) AppleWebKit\//.test(ua)) {
    if (/^Mozilla\/[.\d]+ \(Macintosh;.*Mac OS X [_\d]+\) AppleWebKit\/[.\d]+ \(KHTML, like Gecko\)$/.test(ua)) {
      return true;
    }
    if (/Version\/.* Safari\//.test(ua) && !/Chrom(e|ium)/.test(ua)) {
      return true;
    }
  }
  return false;
}
