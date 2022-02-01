# RavelinJS Contribution Guide

If you're looking to change some code in RavelinJS, read this first.

## Table of Contents

* [1. Familiarise yourself with the library.](#1-familiarise-yourself-with-the-library)
* [2. Use the expected NodeJS v10.](#2-use-the-expected-nodejs-v10)
* [3. Log into ngrok.](#3-log-into-ngrok)
* [4. Install a JSHint extention in your editor.](#4-install-a-jshint-extention-in-your-editor)
* [5. Learn how to build & test.](#5-learn-how-to-build--test)
* [6. Write IE-compatible code in ./lib.](#6-write-ie-compatible-code-in-lib)
* [7. Prefer testing in unit tests.](#7-prefer-testing-in-unit-tests)
* [8. Use integration tests where necessary.](#8-use-integration-tests-where-necessary)
  * [Process](#process)
* [9. New pull requests should target branch v1.](#9-new-pull-requests-should-target-branch-v1)
* [10. Understand the file structure.](#10-understand-the-file-structure)
* [11. Keep Dependencies Up-to-Date](#11-keep-dependencies-up-to-date)
* [12. Publish new versions according to semantic versioning.](#12-publish-new-versions-according-to-semantic-versioning)

## 1. Familiarise yourself with the library.

Have a read of the [README](README.md) to understand which parts of our library
is meant to do what.

## 2. Use the expected NodeJS v10.

CI runs [circleci/node:10](.circleci/config.yml).

## 3. Log into ngrok.

1. Sign up for an ngrok account: https://dashboard.ngrok.com/signup.
2. Acquire your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken.
3. If you have not already done so: `npm install`
4. From the ravelinjs directory: `node_modules/.bin/ngrok authtoken $TOKEN`.

## 4. Install a JSHint extention in your editor.

There are many .js files kicking around: some for use in the browser, some for
use by Node JS. Some are config files, others are executable, some assume test
frameworks are installed in the global scope.

[JSHint has been configured](./.jshintrc) to know which files run where so that
your editor can give you accurate errors and validation of a source file.

## 5. Learn how to build & test.

CI will run all tests when a commit is pushed to GitHub, essentially:

    npm run build && npm run test:integration && npm run release

Locally, you'll be doing the following:

* Edit code in ./lib.
* Building code into the ./build directory with `npm run build`.
* After building,
  * Run unit tests locally with `npm run test:unit`.
  * Authenticate with BrowserStack using `export BROWSERSTACK_USERNAME=x BROWSERSTACK_ACCESS_KEY=y`.
  * Run integration tests with `npm run test:integration`.
  * Run single integration tests with `npm run test:integration -- --spec example/example.spec.js`.
* Release code into a versioned release directory with `npm run release`.

There are auto-running commands:

* `npm run build:watch` to auto-build when lib is changed; and
* `npm run test:unit:watch` to auto-test when build is changed.

**`npm run watch`** will run these two commands together.

## 6. Write IE-compatible code in ./lib.

There is no transpilation in the ravelinjs build except for the resolution of
ES6-style imports handled by Rollup and minification handled by Terser, so this
code is ES3 at most - and IE is missing some features (below). Code written in
lib/\*\*.js is essentially executed as-is.

When it comes to writing this "old" style of JavaScript, don't try to do any
clever object instantiation or class definitions and you'll be fine. No versions
of IE come with a native Promise, so use lib/core#Core.Promise -- limited to
[Promise/A+](https://promisesaplus.com/) by using [yaku.aplus
Promise](https://github.com/ysmood/yaku) in our polyfill bundle, so instead of
handling rejections with `p.catch(function(err) { ... })`, use
`p.then(undefined, function(err) { ... })`. Some IEs don't have
Function.prototype.bind so use lib/util#bind.

## 7. Prefer testing in unit tests.

Unit tests in the test/\*.test.js files have the benefit of running in a single
page without needing server communication, so they're easy to run locally and
very quick to run in CI. As a result, **attempt to write all new tests at unit
tests**.

You can run unit tests locally using `npm run test:unit` which spawns Chrome
(optionally from the `CHROME_BIN` envvar) using Karma, but we also run these
unit tests from an integration test (piggy-backing on the browser-spawning)
which you can run with `npm run test:integration -- --spec
test/unit/unit.spec.js` (see below for running integration tests).

Running `test/server.js` will give you an ngrok URL through which you can access
the Mocha unit test page in any browser. Use this if you want to step through
using a remote browser.

Unit tests run in the browser and therefore must be written in IE-compatible
JavaScript, as with code in the lib. The tests have access to:

* `Ravelin` from the local build/ravelin-core+track+encrypt+promise.min.js (symlinked via test/ravelin.js);
* the [Mocha test framework](https://mochajs.org/);
* [jQuery v1](https://api.jquery.com/category/version/1.12-and-2.2/) for simple DOM manipulation;
* [xhook](https://github.com/jpillora/xhook) for mocking HTTP requests; and
* [expect.js](https://www.npmjs.com/package/expect.js) for assertions.

## 8. Use integration tests where necessary.

Integration tests help us test scenarios that unit tests cannot cover: where we
want to test that real HTTP requests are made in various same/cross-origin
scenarios (send), where we want to test real events such as mouse-moving
(encrypt), or where we want to test real browser resize events (track). All of
these events and scenarios can be mocked, but mocking the "expected" behaviour
of these events does not guarantee your script will work in those browsers.

Adding new integration tests dramatically slows the completion time, so do
**prefer unit tests where possible**.

Before running integration tests you will need authentication credentials to
connect to [BrowserStack](https://automate.browserstack.com/) which runs the
browsers we test in. Ask from @icio.

To run integration tests in test/\*/\*.spec.js:

    export BROWSERSTACK_USERNAME=u BROWSERSTACK_ACCESS_KEY=x
    npm install
    LOG_LEVEL=warn PARALLEL=5 npm run test:integration

Or optionally, only run unit tests on all IE:

    BROWSERS=ie LOG_LEVEL=warn PARALLEL=5 npm run test:integration -- --spec test/unit/unit.spec.js

These environment variables can be used to configure what gets run:

* `PARALLEL` (int) The number of tests that can be run simultaneously
* `LOG_LEVEL` (debug|info|warn|error) The level of logs shown
* `BROWSERS` (string) A comma-separated list of strings to search for in the
  browser spec definitions, for example: `BROWSERS=safari,7`.
* `LIMIT` (int) A maximum number of browsers to run tests on.

### Process

Integration tests in test/\*/\*.spec.js run under
[WebdriverIO](https://webdriver.io/) in Node using its `browser` to instruct a
real browser run by BrowserStack to perform actions like navigation to URLs,
clicking buttons, and pressing keys. The configuration lives in
[test/wdio.conf.js](./test/wdio.conf.js) and the process is as follows:

1. `npm run test:integration` is called by the user.
2. `wdio test/wdio.conf.js` is invoked by npm.
3. `test/server.js` is run in the background by wdio. This serves the files in
   test and offers a fake API implementation at /z and /z/err, and a /requests
   endpoint for introspecting what API requests have been made.
4. A BrowserStack tunnel is pointed at `test/server.js`'s HTTP server. We use
   this tunnel for default testing because there are no usage limits.
5. An ngrok tunnel is pointed at `test/server.js`. This alternative tunnel
   allows us to create cross-origin scenarios. Ngrok has limits on the number of
   clients that can connect so you may need to authenticate with `ngrok
   authtoken`.
6. For each spec test:
   1. For each browser:
      1. wdio tells BrowserStack to launch the browser
      2. wdio executes the spec test with `browser` connected to the
         BrowserStack browser
      3. `browser.url('/spec')` is called by the spec test to load pages over
         the BrowserStack tunnel
      4. `browser.url(process.env.TEST_REMOTE + '/spec')` is called by the
         spec test to load pages over the ngrok tunnel
7. wdio collects and reports on the results, finishing with an exit code of 1 if
   any tests failed.

The utilities available to your spec tests depends on what you include in the
HTML file you write for you test, but most will use:

* `Ravelin` from build/ravelinjs-core+track+encrypt+promise.min.js (via symlink
  test/ravelin.js)
* Utilities in test/common.js, such as query-string parsing and error-sniffing.

## 9. New pull requests should target branch v1.

The main branches of the ravelinjs repo follow their major semver version:
[v1](https://github.com/unravelin/ravelinjs/tree/v1) (latest, default) and
[v0](https://github.com/unravelin/ravelinjs/tree/v0).

If you wish to propose a change, make your change on a new fork/branch of the
version branch and open a pull request re-targeting that branch. PRs are
reviewed by many factors: test coverage, browser-compatibility,
privacy-sensitivity, backwards-compatibility, filesize,

## 10. Understand the file structure.

tl;dr: ./lib for real code; ./test for test code.

    ravelinjs
    │
    │   Docs
    │   ====
    │
    ├── README.md
    │       The end-user guide to what ravelinjs and how to use it.
    ├── CONTRIBUTING.md
    │       The a developer guide for making changes to ravelinjs.
    │
    │   Config
    │   ======
    │
    ├── package.json
    │       The nodejs dependencies required to build ravelinjs and the `npm run`
    │       scripts which define our build, test and release process.
    ├── package-lock.json
    │       An exact list of the versions of each dependency installed.
    ├── rollup.config.js
    │       Defines how ./lib/bundle entrypoints map to ./build files for testing.
    ├── LICENSE
    │       Apache 2.0 License.
    │
    │   Source
    │   ======
    │
    ├── lib
    │   │   The ravelinjs source code.
    │   │
    │   ├── bundle
    │   │   │   ./lib/bundle are the entrypoints to the ravelinjs source code. Each
    │   │   │   file defines a Ravelin object exported in a bundle of the same name.
    │   │   │   Imports each component in the name from the parent directory.
    │   │   │
    │   │   ├── core+encrypt.js
    │   │   ├── core+encrypt+promise.js
    │   │   ├── core.js
    │   │   ├── core+promise.js
    │   │   ├── core+track+encrypt.js
    │   │   ├── core+track+encrypt+promise.js
    │   │   ├── core+track.js
    │   │   └── core+track+promise.js
    │   │
    │   │   The implementation, imported into the bundles.
    │   ├── cookies.js
    │   ├── core.js
    │   ├── encryption-vendored.js
    │   ├── encrypt.js
    │   ├── promise.js
    │   ├── track.js
    │   ├── util.js
    │   └── version.js
    │
    ├── test
    │   │   ravelinjs unit and integration tests.
    │   │
    │   ├── ravelin.js -> ../build/ravelin-core+track+encrypt+promise.min.js
    │   │       A symlink to the working build referenced by tests and loaded into
    │   │       the browser with <script src=../ravelin.js></script>.
    │   ├── common.js
    │   │       In-browser helpers for the unit and integration tests.
    │   │
    │   │   Integration tests
    │   │   =================
    │   │
    │   │   Integration tests in */*.spec.js are run using webdriver IO pointed at
    │   │   BrowserStack. We have 4 test suites that each get run in parallel.
    │   │   These can be completely run using `npm run test:integration` or
    │   │   `npm run test:integration -- --spec example/example.spec.js` to run one
    │   │   example spec test.
    │   │
    │   ├── encrypt
    │   │   ├── encrypt.spec.js
    │   │   └── index.html
    │   ├── send
    │   │   ├── index.html
    │   │   └── send.spec.js
    │   ├── track
    │   │   ├── index.html
    │   │   └── track.spec.js
    │   ├── unit
    │   │   │   Runs the ./test/*.test.js mocha tests in-browser, similar to Karma.
    │   │   ├── index.html
    │   │   └── unit.spec.js
    │   │
    │   │── wdio.conf.js
    │   │       Points webdriverio at the browsers and spec tests to run, and
    │   │       configures the local test/server.js and BrowserStack tunnel.
    │   │
    │   ├── server.js
    │   │       An executable JS file which creates an express server listening on a
    │   │       local port with public ngrok tunnel. It acts as a local ./test file
    │   │       server with a fake Ravelin API on /z and /z/err and a request
    │   │       introspection endpoint at /requests. Used during integration tests
    │   │       to ensure that the browser under their control made a certain HTTP
    │   │       request.
    │   │
    │   ├── common.spec.js
    │   │       Helpers for node *.spec.js tests.
    │   ├── style.css
    │   │       Shared style for integration test pages.
    │   │
    │   │   Unit tests
    │   │   ==========
    │   │
    │   │   test/*.test.js files are unit tests written using the Mocha framework.
    │   │   They can be executed in a local browser using Karma with
    │   │   `npm run test:unit` or continually with `npm run test:unit:watch`; or
    │   │   in the integration test browsers with
    │   │   `npm run test:integration -- --spec test/unit/unit.spec.js`
    │   │
    │   ├── core.test.js
    │   ├── encrypt.test.js
    │   ├── track.test.js
    │   │
    │   └── karma.conf.js
    │           Karma JS configuration for loading the *.test.js unit test files
    │           into a browser and executing them.
    │
    │   Artifacts
    │   =========
    │
    ├── build
    │   │   ./build contains the working release of the local code as IIFE:
    │   │   var Ravelin = (function() { /* code */; return Ravelin; })();
    │   │   Built once using Rollup with `npm run build` or continuously with
    │   │   `npm run build:watch` from the files in ./lib/bundle. These files
    │   │   are copied into ./releases/ravelinjs-$vers before being published.
    │   │   The below example files are generated from
    │   │   ./lib/bundle/core+track+encrypt+promise.js.
    │   │  
    │   ├── ravelin-core+track+encrypt+promise.js
    │   ├── ravelin-core+track+encrypt+promise.js.map
    │   ├── ravelin-core+track+encrypt+promise.min.js
    │   └── ravelin-core+track+encrypt+promise.min.js.map
    │
    ├── dist
    │   │   ./dist contains the working release of the local code as a CommonJS
    │   │   UMD module. Built once using Rollup with `npm run build` or
    │   │   continuously with `npm run build:watch` from the files in
    │   │   ./lib/bundle, and converted into a publishable npm package with
    |   |   `npm run dist`:
    │   │  
    │   ├── core.js
    │   ├── core+track.js
    │   ├── core+track+encrypt.js
    │   ├── core+track+encrypt+promise.ks
    │   └── ...
    │
    └── releases
        └── ravelinjs-1.0.0-rc1
            │   ./releases/ravelinjs-$vers contains a version-stamped copy of the
            │   files in ./build. `npm run build && npm run release` to make.
            │  
            ├── integrity
            ├── ravelin-1.0.0-rc1-core+track+encrypt+promise.js
            ├── ravelin-1.0.0-rc1-core+track+encrypt+promise.js.map
            ├── ravelin-1.0.0-rc1-core+track+encrypt+promise.min.js
            └── ravelin-1.0.0-rc1-core+track+encrypt+promise.min.js.map

## 11. Keep Dependencies Up-to-Date

Dependabot is configured on the repository to ping us when there are updates to
run. Sometimes these can come thick and fast. If you want to bundle them all
together, you can run `npm run update` in a fresh branch of your own which will
install all available updates. This uses [`ncu --doctor`](https://www.npmjs.com/package/npm-check-updates#doctor-mode)
which confirms the updates are valid by running `npm test`.

## 12. Publish new versions according to [semantic versioning](https://semver.org/).

Which for this project means:

* Major version bumps: should never happen - there's no good reason to be making
  breaking changes yet.
* Minor version bumps: should happen often - any time you add new features.
* Patch version bumps: should not happen often - only when we fix a bug.

We publish new versions project to two places:

* [GitHub releases](https://github.com/unravelin/ravelinjs/releases/); and
* [npm](https://www.npmjs.com/package/ravelinjs/v/1).

New versions should be published after merging new features or bug fixes into
the [v1](https://github.com/unravelin/ravelinjs/tree/v1/) branch, using [np (a
better `npm publish`)](https://www.npmjs.com/package/np). `np` does quite a lot
for you, including run `npm test` which will require that you have the
`BROWSERSTACK` envvars set. To test it, run:

    $ export BROWSERSTACK_USERNAME=u BROWSERSTACK_ACCESS_KEY=x
    $ npm run np -- --preview

    Publish a new version of ravelinjs (current: 1.3.1-0)

    Commits:
    - publish docs wip  af4e471

    Commit Range:
    v1.3.1-0...v1

    Registry:
    https://registry.npmjs.org/

      ✔ Prerequisite check
      ✔ Git
      ✔ Installing dependencies using npm
      ✔ Running tests using npm
      ↓ Bumping version using npm [skipped]
        → [Preview] Command not executed: npm version prerelease.
      ↓ Publishing package using npm [skipped]
        → [Preview] Command not executed: npm publish dist --tag beta.
      ↓ Pushing tags [skipped]
        → [Preview] Command not executed: git push --follow-tags.
      ↓ Creating release draft on GitHub [skipped]
        → [Preview] GitHub Releases draft will not be opened in preview mode.

The last four `[Preview]` steps when run without `--preview` will:

* Update the version in package.json, then clean and rebuild the library.
* Publish the contents of the `dist` directory as the npm package.
* Create and push a version git tag.
* Open the GitHub release page with some contents pre-filled.

The GitHub release should have New Features and/or Bug Fixes headings in the
style of previous releases, and ideally some nice works about one of the many
Ravelin pets.
