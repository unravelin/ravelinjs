# RavelinJS Contribution Guide

If you're looking to change some code in RavelinJS, read this first.

## Table of Contents

- [1. Familiarise yourself with the library.](#1-familiarise-yourself-with-the-library)
- [2. Use the expected Node.js v22.](#2-use-the-expected-nodejs-v22)
- [3. Log into ngrok.](#3-log-into-ngrok)
- [4. Install an ESLint extension in your editor.](#4-install-an-eslint-extension-in-your-editor)
- [5. Learn how to build & test.](#5-learn-how-to-build--test)
- [6. Prefer testing in unit tests.](#6-prefer-testing-in-unit-tests)
- [7. Use integration tests where necessary.](#7-use-integration-tests-where-necessary)
  - [Process](#process)
- [8. New pull requests should target branch v2.](#8-new-pull-requests-should-target-branch-v2)
- [9. Understand the file structure.](#9-understand-the-file-structure)
- [10. Keep Dependencies Up-to-Date](#10-keep-dependencies-up-to-date)
- [11. Publish new versions according to semantic versioning.](#11-publish-new-versions-according-to-semantic-versioning)

## 1. Familiarise yourself with the library.

Have a read of the [README](README.md) to understand which parts of our library
is meant to do what.

## 2. Use the expected Node.js v22.

CI runs [node:22.16.0-alpine](.cloudbuild/ci.yaml).

If you use [Volta](https://volta.sh/) to manage your Node/NPM installation, you
should find the package.json is already configured to use Node v22.

## 3. Log into ngrok.

1. Sign up for an ngrok account: https://dashboard.ngrok.com/signup.
2. Acquire your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken.
3. Authenticate by setting the `NGROK_AUTHTOKEN` envvar (`export NGROK_AUTHTOKEN=x`).

## 4. Install an ESLint extension in your editor.

There are many .js files kicking around: some for use in the browser, some for
use by Node.js. Some are config files, others are executable, some assume test
frameworks are installed in the global scope.

[ESLint has been configured](./eslint.config.mjs) to know which files run where so that
your editor can give you accurate errors and validation of source files.

## 5. Learn how to build & test.

CI will run all tests when a commit is pushed to GitHub, essentially:

    npm run build && npm run test:integration && npm run release

Locally, you'll be doing the following:

- Edit code in ./lib.
- Building code into the ./build directory with `npm run build`.
- After building,
  - Run unit tests locally with `npm run test:unit`.
  - Authenticate with BrowserStack using `export BROWSERSTACK_USERNAME=x BROWSERSTACK_ACCESS_KEY=y`.
  - Run integration tests with `npm run test:integration`.
  - Run single integration tests with `npm run test:integration -- --spec example/example.spec.js`.
- Release code into a versioned release directory with `npm run release`.

There are auto-running commands:

- `npm run build:watch` to auto-build when lib is changed; and
- `npm run test:unit:watch` to auto-test when build is changed.

**`npm run watch`** will run these two commands together.

## 6. Prefer testing in unit tests.

Unit tests in the `test-unit/\*.spec.js` files have the benefit of running in a single
page without needing server communication, so they're easy to run locally and
very quick to run in CI. As a result, **attempt to write all new tests at unit
tests**.

You can run unit tests locally using `npm run test:unit` which spawns Chrome
using Karma, but we also run these unit tests from an integration test
(piggy-backing on the browser-spawning) which you can run with `npm run test:integration -- --spec
test-integration/unit/unit.spec.mjs` (see below for running integration tests).

Running `test-integration/server-cli.mjs` will give you an ngrok URL through which you can access
the Mocha unit test page in any browser. Use this if you want to step through
using a remote browser.

Unit tests run in the browser and therefore must be written in browser-compatible
JavaScript, as with code in the lib. The tests have access to:

- `Ravelin` from the local `build/ravelin-core+track+encrypt.min.js` (symlinked via `test-integration/ravelin.js`);
- the [Mocha test framework](https://mochajs.org/);
- [jQuery v3](https://api.jquery.com/) for simple DOM manipulation;
- [xhook](https://github.com/jpillora/xhook) for mocking HTTP requests; and
- [Chai](https://www.chaijs.com/) for assertions.

## 7. Use integration tests where necessary.

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
browsers we test in. Ask for help from a Ravelin engineer.

To run integration tests locally in `test-integration/**/*.spec.mjs`:

    export BROWSERSTACK_USERNAME=u BROWSERSTACK_ACCESS_KEY=x NGROK_AUTHTOKEN=t
    npm install
    npm run test:integration:local

### Process

Integration tests in `test-integration/**/*.spec.mjs` run under
[Selenium](https://www.selenium.dev/documentation/webdriver/) in Node using
its `driver` to instruct a real browser to perform actions like navigating to URLs, clicking buttons, and pressing keys.
In CI, we use BrowserStack to run on multiple browsers and operating systems.
The configuration lives in [test-integration/build-bstack-config.mjs](./test-integration/build-bstack-config.mjs) and the process is as follows:

1. `npm run test:integration` is called by the user.
2. `node ./test-integration/run.mjs` is invoked by npm.
3. `test-integration/server.mjs` is run in the background. This serves the files
   in test and offers a fake API implementation at `/z` and `/z/err`, and a `/requests`
   endpoint for introspecting what API requests have been made.
4. An ngrok tunnel is pointed at our server. This allows us to create
   cross-origin scenarios. Ngrok has limits on the number of
   clients that can connect so you may need to authenticate with `ngrok authtoken`.
5. At the same time, we launch the BrowserStack SDK which manages running our Mocha tests on the BrowserStack platform.
6. For each spec test:
   1. For each browser:
      1. The BrowserStack SDK tells BrowserStack to launch the browser.
      2. The BrowserStack SDK executes each Mocha test.
      3. `driver.get('/spec/index.html')` is called by the spec test to load
         pages over the BrowserStack tunnel.
      4. The unit tests interact with the page and run assertions.
7. The BrowserStack SDK collects and reports on the results, finishing with an
   exit code of 1 if any tests failed.

The utilities available to your spec tests depends on what you include in the
HTML file you write for you test, but most will use:

- `Ravelin` from `build/ravelinjs-core+track+encrypt.min.js` (via symlink
  `test-integration/ravelin.js`)
- Utilities in `test-integration/browser-utils.js`, such as query-string parsing and error-sniffing.

## 8. New pull requests should target branch v2.

The main branches of the ravelinjs repo follow their major semver version:
[v2](https://github.com/unravelin/ravelinjs/tree/v2) (latest, default - largely
the same as v1 but without IE8-11 support),
[v1](https://github.com/unravelin/ravelinjs/tree/v1), and
[v0](https://github.com/unravelin/ravelinjs/tree/v0).

If you wish to propose a change, make your change on a new fork/branch of the
version branch and open a pull request re-targeting that branch. PRs are
reviewed by many factors: test coverage, browser-compatibility,
privacy-sensitivity, backwards-compatibility, filesize,

## 9. Understand the file structure.

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
    │   │   ├── core.js
    │   │   ├── core+track+encrypt.js
    │   │   └── core+track.js
    │   │
    │   │   The implementation, imported into the bundles.
    │   ├── cookies.js
    │   ├── core.js
    │   ├── encryption-vendored.js
    │   ├── encrypt.js
    │   ├── track.js
    │   ├── util.js
    │   └── version.js
    │
    │   Integration tests
    │   =================
    │
    │   Integration tests in */*.spec.js are run using selenium-webdriver
    │   pointed at BrowserStack.
    │   We have 4 test suites that each test a different part of RavelinJS.
    │   These can be completely run using `npm run test:integration` or
    │   `npm run test:integration -- --spec example/example.spec.js` to run
    │   one example spec test.
    │
    ├── test-integration
    │   │
    │   ├── ravelin.js -> ../build/ravelin-core+track+encrypt.min.js
    │   │       A symlink to the working build referenced by tests and loaded into
    │   │       the browser with <script src=../ravelin.js></script>.
    │   ├── browser-utils.js
    │   │       In-browser helpers for integration tests.
    │   │
    │   ├── encrypt
    │   │   ├── encrypt.spec.mjs
    │   │   └── index.html
    │   ├── send
    │   │   ├── index.html
    │   │   └── send.spec.mjs
    │   ├── track
    │   │   ├── index.html
    │   │   └── track.spec.mjs
    │   ├── unit
    │   │   │   Runs the ./test-unit/*.spec.js mocha tests in-browser, similar to Karma.
    │   │   ├── index.html
    │   │   └── unit.spec.mjs
    │   │
    │   │── build-bstack-config.mjs
    │   │       Generates a browserstack.yml config file that the BrowserStack
    │   │       SDK uses to know which OS and browser combinations to run,
    │   │       and which branch and commit to associate with when running in CI.
    │   │
    │   ├── server.mjs
    │   │       An executable JS file which creates an express server listening on a
    │   │       local port with public ngrok tunnel. It acts as a local ./test file
    │   │       server with a fake Ravelin API on /z and /z/err and a request
    │   │       introspection endpoint at /requests. Used during integration tests
    │   │       to ensure that the browser under their control made a certain HTTP
    │   │       request.
    │   │
    │   ├── server-cli.mjs
    │   │       Runs the test server standalone, outside of the test runner.
    │   ├── run.mjs
    │   │       Runs the test suite on BrowserStack.
    │   ├── run-local.mjs
    │   │       Runs the test suite locally on a single browser.
    │   ├── utils.mjs
    │   │       Helpers for node *.spec.mjs tests.
    │   ├── ci.mjs
    │   │       Updates GitHub commit CI status from the BrowserStack API.
    │   └── style.css
    │           Shared style for integration test pages.
    │
    │   Unit tests
    │   ==========
    │
    │   test-unit/*.test.js files are unit tests written using the Mocha framework.
    │   They can be executed in a local browser using Karma with
    │   `npm run test:unit` or continually with `npm run test:unit:watch`; or
    │   in the integration tests.
    │
    ├── test-unit
    │   │
    │   ├── ravelin.js -> ../build/ravelin-core+track+encrypt.min.js
    │   │       A symlink to the working build referenced by tests and loaded into
    │   │       the browser with <script src=../ravelin.js></script>.
    │   │
    │   ├── core.spec.js
    │   ├── encrypt.spec.js
    │   ├── track.spec.js
    │   ├── utils.js
    │   │       Helpers for unit tests.
    │   │
    │   └── karma.conf.js
    │           Karma JS configuration for loading the *.spec.js unit test files
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
    │   │   ./lib/bundle/core+track+encrypt.js.
    │   │
    │   ├── ravelin-core+track+encrypt.js
    │   ├── ravelin-core+track+encrypt.js.map
    │   ├── ravelin-core+track+encrypt.min.js
    │   └── ravelin-core+track+encrypt.min.js.map
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
    │   └── ...
    │
    └── releases
        └── ravelinjs-1.0.0-rc1
            │   ./releases/ravelinjs-$vers contains a version-stamped copy of the
            │   files in ./build. `npm run build && npm run release` to make.
            │
            ├── integrity
            ├── ravelin-1.0.0-rc1-core+track+encrypt.js
            ├── ravelin-1.0.0-rc1-core+track+encrypt.js.map
            ├── ravelin-1.0.0-rc1-core+track+encrypt.min.js
            └── ravelin-1.0.0-rc1-core+track+encrypt.min.js.map

## 10. Keep Dependencies Up-to-Date

Dependabot is configured on the repository to ping us when there are updates to
run. Sometimes these can come thick and fast. If you want to bundle them all
together, you can run `npm run update` in a fresh branch of your own which will
install all available updates. This uses [`ncu --doctor`](https://www.npmjs.com/package/npm-check-updates#doctor-mode)
which confirms the updates are valid by running `npm test`.

## 11. Publish new versions according to [semantic versioning](https://semver.org/).

Which for this project means:

- Major version bumps: should never happen - there's no good reason to be making
  breaking changes yet.
- Minor version bumps: should happen often - any time you add new features.
- Patch version bumps: should not happen often - only when we fix a bug.

We publish new versions project to two places:

- [GitHub releases](https://github.com/unravelin/ravelinjs/releases/); and
- [npm](https://www.npmjs.com/package/ravelinjs).

New versions should be published after merging new features or bug fixes into
the [v2](https://github.com/unravelin/ravelinjs/tree/v2/) branch, using [np (a
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
        → [Preview] Command not executed: npm publish ./dist --tag beta.
      ↓ Pushing tags [skipped]
        → [Preview] Command not executed: git push --follow-tags.
      ↓ Creating release draft on GitHub [skipped]
        → [Preview] GitHub Releases draft will not be opened in preview mode.

The last four `[Preview]` steps when run without `--preview` will:

- Update the version in package.json, then clean and rebuild the library.
- Publish the contents of the `dist` directory as the npm package.
- Create and push a version git tag.
- Open the GitHub release page with some contents pre-filled.

The GitHub release should have New Features and/or Bug Fixes headings in the
style of previous releases. Finally, you should run `npm run release` and drag
the files from `./releases/ravelinjs-$vers` into the assets section of the
GitHub release.
