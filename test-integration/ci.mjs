/**
 * @param {string[]} logs
 * @returns {Promise<void>}
 */
export async function updateCommitStatus(logs) {
  try {
    const user = process.env.BROWSERSTACK_USERNAME;
    const key = process.env.BROWSERSTACK_ACCESS_KEY;
    const sha = process.env.COMMIT_SHA;
    const ghToken = process.env.GITHUB_TOKEN;

    // Skip if any required env vars are missing
    if (!user || !key || !sha || !ghToken) {
      const missingVars = [];
      if (!user) missingVars.push('BROWSERSTACK_USERNAME');
      if (!key) missingVars.push('BROWSERSTACK_ACCESS_KEY');
      if (!sha) missingVars.push('COMMIT_SHA');
      if (!ghToken) missingVars.push('GITHUB_TOKEN');

      const vars = missingVars.join(', ');
      console.error(`Skipping updateCommitStatus due to missing env vars: ${vars}`);
      return;
    }

    console.log('Fetching BrowserStack build summary…');

    const url = getBuildUrl(logs);

    if (!url) {
      console.error('No valid BrowserStack build URL found in logs.');
      return;
    }

    const counts = getTestResults(logs);

    if (!counts) {
      console.error('No test results found in logs.');
      return;
    }

    console.log('Updating GitHub commit status…', counts);

    await postGitHubStatus(sha, ghToken, counts, url.href);

    console.log('GitHub commit status updated successfully.');
  } catch (err) {
    console.error(err);
  }
}

/**
 * @param {string[]} logs
 * @returns {URL | undefined}
 */
function getBuildUrl(logs) {
  // Search in reverse order because the URL is logged at the end of the build process
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];

    if (log.indexOf('https://automate.browserstack.com/dashboard/') !== -1) {
      const matches = log.match(/\bhttps?:\/\/\S+/gi);
      if (matches && matches.length > 0) {
        try {
          const url = new URL(matches[0]);
          if (url.hostname === 'automate.browserstack.com') {
            return url;
          }
        } catch {
          console.error('Invalid URL found in logs:', matches[0]);
        }
      }
    }
  }
}

/**
 * @param {string[]} logs
 * @returns {{ passed: number, failed: number } | undefined}
 */
function getTestResults(logs) {
  // Regex to match test report like: "Tests: 6 failed, 4 passed, 10 total"
  const regex = /Tests:\s*(?:(\d+) failed, )?(?:(\d+) passed, )?(\d+) total/;

  // Search in reverse order because results are logged at the end of the build process
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    const matches = log.match(regex);

    if (matches) {
      const failed = matches[1] ? parseInt(matches[1], 10) : 0;
      const passed = matches[2] ? parseInt(matches[2], 10) : 0;

      return { passed, failed };
    }
  }
}

/**
 * @param {string} commitSHA
 * @param {string} token
 * @param {{ passed: number, failed: number }} counts
 * @param {string} url
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
    console.error(`GitHub API error: ${res.statusText}`);
  }
}
