/**
 * The core module of RavelinJS provides device-identification, and is used by
 * other modules to communicate with the Ravelin API.
 */

import { CookieJar } from './cookies';
import { promiseRetry, uuid } from './utils';

// Constant set at build time.
declare const RAVELINJS_VERSION: string;

/**
 * Configuration for the Core module.
 */
export interface CoreConfig {
  /** The API key ("publishable_key_..." or "pk_...") used to authenticate with the Ravelin API. */
  key?: string;
  /** A string of the format "https://api.ravelin.net" which forms the base of API requests. */
  api?: string;
  /** The library version. Defaults to the build constant RAVELINJS_VERSION. */
  version?: string;
  /** A string of the default prefix for the deviceId (default "rjs-"). */
  prefix?: string;
  /** An explicit deviceId to use. If the Promise errors or returns
   * an empty value, Ravelin's own deviceId tracking kicks in. */
  id?: string | Promise<string>;
  /** The name of the cookie that the deviceId is kept in (default "ravelinDeviceId"). */
  cookie?: string;
  /** The name of the cookie that the sessionId is kept in (default "ravelinSessionId"). */
  sessionCookie?: string;
  /** The domain on which to set cookies. */
  cookieDomain?: string;
  /** The SameSite attribute to control how cookies are sent in cross-site requests. */
  cookieSameSite?: string;
  /** The max lifetime of a deviceId, in days (default 365).
   * A value <= 0 makes Ravelin treat the named cookie as read-only. */
  cookieExpiryDays?: number;
  /** The sync timeout frequency in milliseconds (default 2000). */
  syncMs?: number;
  /** The send retry backoff time in milliseconds (default 150). */
  sendRetryMs?: number;
  /** Whether to initialize the sync step automatically (default true). */
  init?: boolean;
}

/**
 * The ID object containing device and session IDs.
 */
export interface IDs {
  device: string;
  session: string;
}

/**
 * The response from the Core.send method.
 */
export interface CoreResponse {
  status: number;
  text: string;
  attempt?: number;
}

/**
 * Core library instance. Provides helpers and device identification.
 */
export class Core {
  public version: string;
  public key?: string;
  public api: string;
  public sendRetryMs: number;
  public cookie: string;
  public sessionCookie: string;
  public cookieExpiryDays: number;
  public cookies: CookieJar;
  public prefix: string;

  private _id: Promise<string | undefined>;
  private _ids?: Promise<IDs>;

  public constructor(cfg: CoreConfig) {
    this.version = cfg.version || RAVELINJS_VERSION;
    this.key = cfg.key;
    this.api = cfg.api || apiFromKey(this.key);
    // Remove trailing slashes from API URL
    this.api = this.api[0] + this.api.substring(1).replace(/^\/+|\/$/g, '');
    this.sendRetryMs = cfg.sendRetryMs || 150;
    this.cookie = cfg.cookie || 'ravelinDeviceId';
    this.sessionCookie = cfg.sessionCookie || 'ravelinSessionId';
    this.cookieExpiryDays = cfg.cookieExpiryDays ?? 365;
    this.cookies = new CookieJar({
      domain: cfg.cookieDomain,
      sameSite: cfg.cookieSameSite,
    });

    this.prefix = typeof cfg.prefix === 'string' ? cfg.prefix : 'rjs-';
    this._id = resolve(cfg.id);

    this.sync();

    if (cfg.init !== false) {
      this.attach(cfg.syncMs || 2000);
    }
  }

  /**
   * Reads our device ID from the browser.
   */
  public id(): Promise<string> {
    return this.ids().then(ids => {
      return ids.device;
    });
  }

  /**
   * Reads all IDs from the browser.
   */
  public ids(): Promise<IDs> {
    if (this._ids) {
      return this._ids;
    }

    this._ids = this.sniffError(this._id)
      .catch(() => {
        // Swallow error
      })
      .then((cfgId: string | undefined) => {
        let d = cfgId || this.cookies.get(this.cookie);
        let s = this.cookies.get(this.sessionCookie);

        if (!cfgId && s) {
          // Restore d from s.
          const sep = s.indexOf(':');
          if (sep !== -1) {
            d = s.substring(0, sep);
          }

          // Strip d: from the beginning of s.
          if (d && s.startsWith(d + ':')) {
            s = s.substring(d.length + 1);
          }
        }

        return {
          device: d || this.prefix + uuid(),
          session: s || uuid(),
        };
      });

    return this._ids;
  }

  /**
   * Writes our ID into the various places we try to keep hold of it.
   */
  public sync(): Promise<void> {
    return this.ids().then(ids => {
      if (this.cookieExpiryDays > 0) {
        this.cookies.set({
          name: this.cookie,
          value: ids.device,
          expires: daysFromNow(this.cookieExpiryDays),
        });
      }
      this.cookies.set({
        name: this.sessionCookie,
        value: ids.device + ':' + ids.session,
      });
    });
  }

  /**
   * attach to the browser to maintain our ids somewhere.
   * @param syncMs How often we attempt to re-synchronise.
   */
  public attach(syncMs: number): void {
    setInterval(() => {
      this.sync();
    }, syncMs);
  }

  /**
   * reportError sends an Error to Ravelin so that we can track what's happening.
   */
  public reportError(e: any): Promise<void> {
    // Internal helper to perform the actual report
    const report = (ids?: IDs) => {
      return this.send('POST', 'z/err', {
        deviceId: ids && ids.device,
        libVer: this.version,
        type: e.name,
        msg: e.message || e,
        error: e.stack,
      }).then(() => {});
    };

    if (this._ids) {
      return this._ids
        .catch(() => {
          // Swallow error
        })
        .then(report);
    }
    return report();
  }

  /**
   * Invokes fn and reports any errors back to Ravelin. If the return value
   * of fn is a Promise-like object then any rejection is also reported.
   */
  public sniffError<T>(fn: (() => T) | T): T {
    try {
      const p = typeof fn === 'function' ? (fn as () => any)() : fn;
      if (p && typeof p.then === 'function') {
        (p as Promise<T>).catch((e: any) => {
          this.reportError(e);
        });
      }
      return p;
    } catch (e: any) {
      this.reportError(e);
      throw e;
    }
  }

  /**
   * Returns a function that invokes fn.bind(thisArg, ...args) and reports
   * any errors using sniffError.
   */
  public bind<T extends (...args: any[]) => any>(
    fn: T,
    thisArg: any,
    ...outerArgs: any[]
  ): (...args: Parameters<T>) => ReturnType<T> {
    const boundFn = fn.bind(thisArg, ...outerArgs);

    return (...innerArgs: Parameters<T>): ReturnType<T> => {
      return this.sniffError(() => {
        return boundFn(...innerArgs);
      });
    };
  }

  /**
   * Makes a HTTP request and returns a Promise that resolves to the response
   * body or is rejected with any errors or non-2xx status codes.
   *
   * To avoid OPTIONS preflight requests, we do not accept setting headers here.
   * Instead we put the key in the query string and expect the server to support
   * whatever headers the browser cares to add.
   */
  public send(method: string, path: string, body: any): Promise<CoreResponse> {
    if (!this.key) {
      return Promise.reject(new Error('ravelin/core: no key set for API requests'));
    }

    // Build the URL to run
    let url = this.api + '/' + path.replace(/^\/+/, '');
    url += (url.indexOf('?') === -1 ? '?' : '&') + 'key=' + encodeURIComponent(this.key);
    url = url.replace(/^\/+/, '/');

    return promiseRetry(
      (retry, attempt) => {
        // Make the request
        return this._sendXHR(method, url, stringify(body)).then(r => {
          r.attempt = attempt;

          // Resolve/reject based on status
          if (r.status >= 200 && r.status < 300) {
            return r;
          } else if (r.status === 400 && r.text === '') {
            // Retry empty 400s injected by the BrowserStack tunnel
            retry(r);
          } else if (r.status >= 500) {
            // Retry errors
            retry(r);
          } else if (!r.status) {
            // Retry connection errors
            retry(r);
          }
          return Promise.reject(r);
        });
      },
      2,
      this.sendRetryMs
    ).catch((r: any) => {
      if (r && r.attempt) {
        // Convert the response format into an error
        throw new Error(
          'ravelin/core: ' +
            method +
            ' ' +
            url +
            ' attempt ' +
            r.attempt +
            ' returned status ' +
            r.status +
            (r.text ? ' and body ' + r.text : '')
        );
      }
      throw r;
    });
  }

  /**
   * Wraps an XHR in a Promise.
   */
  private _sendXHR(method: string, url: string, body: string): Promise<CoreResponse> {
    return new Promise(resolve => {
      const r = new XMLHttpRequest();
      r.onreadystatechange = () => {
        if (r.readyState === 4) {
          resolve({ status: r.status, text: r.responseText });
        }
      };

      // Send the request
      r.open(method, url);
      r.send(body);
    });
  }
}

/**
 * Returns a Promise that resolves to v. If v is already a promise, just return it.
 */
function resolve<T>(v: T | Promise<T>): Promise<T> {
  if (v && typeof (v as Promise<T>).then === 'function') {
    return v as Promise<T>;
  }
  return Promise.resolve(v);
}

/**
 * daysFromNow returns the current time, days in the future.
 */
function daysFromNow(days: number): Date {
  return new Date(new Date().getTime() + days * 86400 * 1000);
}

/**
 * apiFromKey returns the likely API URL based on the key.
 */
function apiFromKey(key: string | undefined): string {
  const defaultAPI = 'https://live.ravelin.click';

  if (!key || key.substring(0, 16) !== 'publishable_key_') {
    return defaultAPI;
  }

  const words = key.substring(16).split('_');
  if (words.length < 2) {
    return defaultAPI;
  }

  const env = words[words.length - 2];
  if (env === 'test' || env === 'live') {
    return defaultAPI;
  }

  return 'https://' + encodeURIComponent(env) + '.ravelin.click';
}

/**
 * stringify is JSON.stringify with prototype safety.
 */
function stringify(obj: any): string {
  const proto = Array.prototype as any;

  if (proto.toJSON) {
    // https://stackoverflow.com/questions/710586/json-stringify-array-bizarreness-with-prototype-js
    const _array_tojson = proto.toJSON;
    delete proto.toJSON;
    const str = JSON.stringify(obj);
    // Restore native extension
    proto.toJSON = _array_tojson;
    return str;
  }
  return JSON.stringify(obj);
}
