import { exec } from 'node:child_process';

export class GitHubStatus {
  /**
   * @param {Object} p
   * @param {string} p.sha
   * @param {string} p.repo
   * @param {string} p.token
   * @param {string} p.context
   */
  constructor({sha, repo, token, context}) {
    this.sha = sha;
    this.repo = repo;
    this.token = token;
    this.context = context;
    this.cancel = new AbortController();
  }

  setTarget(priority, target) {
    if (this.targetPriority > priority) {
      return;
    }

    this.targetPriority = priority;
    this.target = target;
    this.update(this.lastStatus || {state: 'pending'});
  }

  async update(status) {
    this.lastStatus = status;
    await this._send(status);
  }

  async _send(status) {
    status.context = this.context;
    status.target_url = this.target;
    if (status.description && status.description.length > 140) {
      status.description = status.description.substr(0, 140);
    }

    if (!this.sha || !this.repo || !this.token) return;

    console.log('GitHub status', JSON.stringify(status));

    this.cancel.abort();
    const cancel = new AbortController();
    this.cancel = cancel;

    const api = this.repo.replace(/\/\/github.com\//, '//api.github.com/repos/');
    const apiStatus = api + '/statuses/' + encodeURIComponent(this.sha);
    return fetch(apiStatus, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Bearer ' + this.token,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(status),
      signal: this.cancel.signal,
    })
    .then(async res => {
      if (!res.ok) {
        throw new Error(res.url + ' returned status code ' + res.statusCode + ' and body: ' + (await res.text()));
      }
    })
    .catch(err => {
      if (cancel.signal.aborted) {
        return;
      }
      console.error('Error updating github commit status', err)
    });
  }
}

/**
 * build returns an identifier for the build in question.
 * @returns {String}
 */
export async function build() {
  if (process.env.HEAD_BRANCH) {
    const trigger = process.env.E2E_RSA_KEY ? 'e2e' : 'ci';
    return trigger + '/' + process.env.HEAD_BRANCH + '-' + process.env.COMMIT_SHA.substring(0, 7) + '-' + process.env.BUILD_ID;
  }
  return await gitBuild();
}

/**
 * gitBuild returns a description of the git revision of the working directory.
 * @returns {Promise}
 */
export function gitBuild() {
  return new Promise(function (resolve, reject) {
    exec('git describe --all --long --dirty', function (err, stdout, stderr) {
      if (err) {
        reject('git describe: ' + err + ' stderr: ' + stderr);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export class GitHubService {
  constructor(opts, caps, config) {
    this.links = opts.links;
    this.gh = new GitHubStatus({
      context: opts.context,
      sha: opts.sha,
      repo: opts.repo,
      token: opts.token,
    });
    this.specs = new Set();
  }

  onPrepare(config, caps) {
    this.links?.forEach(async link => {
      const {priority, url} = await link(caps, config)
      this.gh.setTarget(priority, url);
    });
    this.counts = {
      // TODO: Find a way to calculate totals without doing caps*specs or find a
      // way to know specs up-front without counting new specs in onWorkerStart.
      // We're currently undercounting totals at the start.
      total: 0,
      caps: caps.length,
      specs: 0,
      running: 0,
      finished: 0,
      passed: 0,
      failed: 0,
    };
  }

  onWorkerStart(cid, cap, specs, args, execArgv) {
    for (let spec of specs) {
      this.specs.add(spec);
    }
    this.counts.specs = this.specs.size;
    this.counts.total = this.counts.caps * this.counts.specs;
    this.counts.running++;
    this.#update('pending');
  }

  onWorkerEnd(cid, exitCode, specs, retries) {
    this.counts.running--;
    this.counts.finished++;
    if (exitCode == 0) {
      this.counts.passed++;
    } else {
      this.counts.failed++;
    }
    this.#update('pending');
  }

  onComplete(exitCode, config, capabilities, results) {
    this.counts = {...this.counts, ...results};
    return this.#update(exitCode ? 'failure' : 'success');
  }

  #update(state) {
    const c = this.counts;
    const desc = state === 'pending'
      ? `${c.running} running with ${c.passed} passed & ${c.failed} failed of ${c.total} total (${(100*c.finished/c.total).toFixed(0)}%)`
      : `${c.passed} passed & ${c.failed} failed`;
    return this.gh.update({
      state: state,
      description: desc,
    });
  }
}

export function browserstackPrivateURL(buildName) {
  return {
    priority: 0,
    url: 'https://automate.browserstack.com/dashboard/v2/search?type=builds&query=' + encodeURIComponent(buildName),
  }
}

/**
 * Poll the browserstack API to find the public URL of our build and give it to
 * the github client for inclusion on commit statuses, overriding any URL
 * generated by _ghInitPvt.
 */
export function browserstackPublicURL(user, key, buildName) {
  return new Promise(function(resolve) {
    setTimeout(findBuild, 2000);
    function findBuild() {
      fetch(
        'https://api.browserstack.com/automate/builds.json',
        {headers: {'Authorization': 'Basic '+Buffer.from(user + ':' + key).toString('base64')}}
      )
      .then(res => {
        if (!res.ok) throw new Error(res.url + ' returned status ' + res.statusCode);
        return res.json();
      })
      .then(builds => Array.isArray(builds) && builds.filter(b => b.automation_build && b.automation_build.name == buildName).pop())
      .then(build => build
        ? resolve({priority: 1, url: build.automation_build.public_url})
        : setTimeout(findBuild, 1000))
      .catch(err => {
        console.error('Error fetching browserstack builds list', err);
        setTimeout(findBuild, 1000);
      });
    }
  });
}
