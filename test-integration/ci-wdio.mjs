export class GitHubStatus {
  onComplete(exitCode, config, capabilities, results) {
    console.log('GitHubStatus');
    console.log('Exit code:', exitCode);
    console.log('config', JSON.stringify(config, null, 2));
    console.log('capabilities', JSON.stringify(capabilities, null, 2));
    console.log('results', JSON.stringify(results, null, 2));
    console.log(process.env['BROWSERSTACK_TESTHUB_UUID'] || 'No ID found.');
  }
}
