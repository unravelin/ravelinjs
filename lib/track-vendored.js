/*!
 * This is a vendored version of the detectIncognito library. We've forked the
 * library (https://github.com/unravelin/detectIncognito) and made a small change
 * to allow passing in a custom Promise implementation. Supporting a custom
 * Promise implentation is necessary since ravelinjs offers that config option.
 * We could remove this once we drop IE support. This script is copied from here:
 * https://github.com/unravelin/detectIncognito/blob/main/dist/detectIncognito.js#L45-L240
 *
 * detectIncognito v1.3.7
 *
 * https://github.com/Joe12387/detectIncognito
 *
 * MIT License
 *
 * Copyright (c) 2021 - 2025 Joe Rutkowski <Joe@dreggle.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Please keep this comment intact in order to properly abide by the MIT License.
 *
 **/
export function detectIncognito(P) {
  return new P(function (resolve, reject) {
    var browserName = 'Unknown';
    function __callback(isPrivate) {
      resolve({
        isPrivate: isPrivate,
        browserName: browserName
      });
    }
    function identifyChromium() {
      var ua = navigator.userAgent;
      if (ua.match(/Chrome/)) {
        if (navigator.brave !== undefined) {
          return 'Brave';
        }
        else if (ua.match(/Edg/)) {
          return 'Edge';
        }
        else if (ua.match(/OPR/)) {
          return 'Opera';
        }
        return 'Chrome';
      }
      else {
        return 'Chromium';
      }
    }
    function assertEvalToString(value) {
      return value === eval.toString().length;
    }
    function feid() {
      var toFixedEngineID = 0;
      var neg = parseInt("-1");
      try {
        neg.toFixed(neg);
      }
      catch (e) {
        toFixedEngineID = e.message.length;
      }
      return toFixedEngineID;
    }
    function isSafari() {
      return feid() === 44;
    }
    function isChrome() {
      return feid() === 51;
    }
    function isFirefox() {
      return feid() === 25;
    }
    function isMSIE() {
      return (navigator.msSaveBlob !== undefined && assertEvalToString(39));
    }
    /**
     * Safari (Safari for iOS & macOS)
     **/
    function newSafariTest() {
      var tmp_name = String(Math.random());
      try {
        var db = window.indexedDB.open(tmp_name, 1);
        db.onupgradeneeded = function (i) {
          var _a, _b;
          var res = (_a = i.target) === null || _a === void 0 ? void 0 : _a.result;
          try {
            res.createObjectStore('test', {
              autoIncrement: true
            }).put(new Blob());
            __callback(false);
          }
          catch (e) {
            var message = e;
            if (e instanceof Error) {
              message = (_b = e.message) !== null && _b !== void 0 ? _b : e;
            }
            if (typeof message !== 'string') {
              __callback(false);
              return;
            }
            var matchesExpectedError = message.includes('BlobURLs are not yet supported');
            __callback(matchesExpectedError);
            return;
          }
          finally {
            res.close();
            window.indexedDB.deleteDatabase(tmp_name);
          }
        };
      }
      catch (e) {
        __callback(false);
      }
    }
    function oldSafariTest() {
      var openDB = window.openDatabase;
      var storage = window.localStorage;
      try {
        openDB(null, null, null, null);
      }
      catch (e) {
        __callback(true);
        return;
      }
      try {
        storage.setItem('test', '1');
        storage.removeItem('test');
      }
      catch (e) {
        __callback(true);
        return;
      }
      __callback(false);
    }
    function safariPrivateTest() {
      if (navigator.maxTouchPoints !== undefined) {
        newSafariTest();
      }
      else {
        oldSafariTest();
      }
    }
    /**
     * Chrome
     **/
    function getQuotaLimit() {
      var w = window;
      if (w.performance !== undefined &&
        w.performance.memory !== undefined &&
        w.performance.memory.jsHeapSizeLimit !== undefined) {
        return performance.memory.jsHeapSizeLimit;
      }
      return 1073741824;
    }
    // >= 76
    function storageQuotaChromePrivateTest() {
      navigator.webkitTemporaryStorage.queryUsageAndQuota(function (_, quota) {
        var quotaInMib = Math.round(quota / (1024 * 1024));
        var quotaLimitInMib = Math.round(getQuotaLimit() / (1024 * 1024)) * 2;
        __callback(quotaInMib < quotaLimitInMib);
      }, function (e) {
        reject(new Error('detectIncognito somehow failed to query storage quota: ' +
          e.message));
      });
    }
    // 50 to 75
    function oldChromePrivateTest() {
      var fs = window.webkitRequestFileSystem;
      var success = function () {
        __callback(false);
      };
      var error = function () {
        __callback(true);
      };
      fs(0, 1, success, error);
    }
    function chromePrivateTest() {
      if (self.Promise !== undefined && self.Promise.allSettled !== undefined) {
        storageQuotaChromePrivateTest();
      }
      else {
        oldChromePrivateTest();
      }
    }
    /**
     * Firefox
     **/
    function firefoxPrivateTest() {
      __callback(navigator.serviceWorker === undefined);
    }
    /**
     * MSIE
     **/
    function msiePrivateTest() {
      __callback(window.indexedDB === undefined);
    }
    function main() {
      if (isSafari()) {
        browserName = 'Safari';
        safariPrivateTest();
      }
      else if (isChrome()) {
        browserName = identifyChromium();
        chromePrivateTest();
      }
      else if (isFirefox()) {
        browserName = 'Firefox';
        firefoxPrivateTest();
      }
      else if (isMSIE()) {
        browserName = 'Internet Explorer';
        msiePrivateTest();
      }
      else {
        reject(new Error('detectIncognito cannot determine the browser'));
      }
    }
    main();
  });
}
