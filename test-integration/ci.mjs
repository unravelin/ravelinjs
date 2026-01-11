import { setTimeout } from 'node:timers/promises';

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
      console.error(`Skipping postBuildSummary due to missing env vars: ${vars}`);
      return;
    }

    console.log('Fetching BrowserStack build summary…');

    // Wait 2 seconds to give BrowserStack some time to log the build
    await setTimeout(2000);

    const url = getBuildUrl(logs);

    if (!url) {
      console.error('No valid BrowserStack build URL found in logs.');
      return;
    }

    // Extract the build ID from the end of the URL. Assumes the URL
    // is in the format: https://automate.browserstack.com/dashboard/v2/builds/:id
    const buildId = url.pathname.split('/').pop();

    if (!buildId) {
      console.error('No build ID found in the URL:', url.href);
      return;
    }

    const sessions = await getBuildSessions(user, key, buildId);

    if (!sessions || sessions.length === 0) {
      console.error('No sessions found for the build.');
      return;
    }

    // Count the number of pass/fail sessions
    const counts = sessions.reduce(
      (acc, session) => {
        if (session.automation_session.status === 'passed') {
          acc.passed++;
        } else if (session.automation_session.status === 'failed') {
          acc.failed++;
        }
        return acc;
      },
      { passed: 0, failed: 0 }
    );

    console.log('Updating GitHub commit status…', counts);

    await postGitHubStatus(sha, ghToken, counts, url.href);

    console.log('GitHub commit status updated successfully.');
  } catch (err) {
    console.error(err);
  }
}

/**
 * @param {string} user
 * @param {string} key
 * @param {string} buildId
 * @returns {Promise<Object[]>}
 */
async function getBuildSessions(user, key, buildId) {
  const url = `https://api.browserstack.com/automate/builds/${buildId}/sessions.json?limit=100`;
  const headers = {
    Authorization: 'Basic ' + Buffer.from(user + ':' + key).toString('base64'),
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error, status: ${response.status}`);
    }
    const data = await response.json();
    return data || [];
  } catch (err) {
    throw new Error('Error fetching build sessions:', err);
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
