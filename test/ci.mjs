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
  }

  setTarget(priority, target) {
    if (this.targetPriority > priority) {
      return;
    }

    this.targetPriority = priority;
    this.target = target;
    this.update(this.lastStatus || {state: 'pending'});
  }

  update(status) {
    this.lastStatus = status;
    this._send(status);
  }

  _send(status) {
    status.context = this.context;
    status.target_url = this.target;
    if (status.description && status.description.length > 140) {
      status.description = status.description.substr(0, 140);
    }

    if (!this.sha || !this.repo || !this.token) return;

    console.log('GitHub status', status);

    const api = this.repo.replace(/\/\/github.com\//, '//api.github.com/repos/');
    const apiStatus = api + '/statuses/' + encodeURIComponent(process.env.COMMIT_SHA);
    fetch(apiStatus, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Bearer ' + this.token,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(status),
    })
    .then(async res => {
      if (!res.ok) {
        throw new Error(res.url + ' returned status code ' + res.statusCode + ' and body: ' + (await res.text()));
      }
    })
    .catch(err => {
      console.error('Error updating github commit status', err)
    });
  }
}

/**
 * build returns an identifier for the build in question.
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
