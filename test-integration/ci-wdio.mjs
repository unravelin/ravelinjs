export class GitHubStatus {
  constructor() {
    /** @type {{ passed: number, failed: number }} */
    this.counts = { passed: 0, failed: 0 };
  }

  /**
   * Gets executed after a worker process has exited.
   * @param {string} cid      capability id (e.g 0-0)
   * @param {number} exitCode 0 - success, 1 - fail
   * @param {object} specs    specs to be run in the worker process
   * @param {number} retries  number of retries used
   */
  onWorkerEnd(_, exitCode) {
    if (exitCode === 0) {
      this.counts.passed++;
    } else {
      this.counts.failed++;
    }
  }

  /**
   * Gets executed after all workers have shut down and the process is about to exit.
   * An error thrown in the `onComplete` hook will result in the test run failing.
   */
  async onComplete() {
    const sha = process.env.COMMIT_SHA;
    const ghToken = process.env.GITHUB_TOKEN;

    // Skip if any required env vars are missing
    if (!sha || !ghToken) {
      const missingVars = [];
      if (!sha) missingVars.push('COMMIT_SHA');
      if (!ghToken) missingVars.push('GITHUB_TOKEN');

      const vars = missingVars.join(', ');
      console.error(`Skipping commit status due to missing env vars: ${vars}`);
      return;
    }

    const buildId = process.env.BROWSERSTACK_TESTHUB_UUID;
    const url = buildId && `https://observability.browserstack.com/builds/${buildId}`;

    console.log('Updating GitHub commit status…', this.counts);

    try {
      await postGitHubStatus(sha, ghToken, this.counts, url);
      console.log('GitHub commit status updated successfully.');
    } catch (err) {
      console.error(`Failed to post GitHub status: ${err.message}`);
      console.error(err.stack);
    }
  }
}

/**
 * @param {string} commitSHA
 * @param {string} token
 * @param {{ passed: number, failed: number }} counts
 * @param {string | undefined} url
 * @returns {Promise<void>}
 */
async function postGitHubStatus(commitSHA, token, counts, url) {
  const status = {
    state: counts.failed > 0 ? 'failure' : 'success',
    target_url: url,
    description: `${counts.passed} Passed & ${counts.failed} Failed`,
    context: 'browserstack',
  };

  const res = await fetch(
    `https://api.github.com/repos/unravelin/ravelinjs/statuses/${commitSHA}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(status),
    }
  );

  if (!res.ok) {
    throw new Error(res.statusText);
  }
}
