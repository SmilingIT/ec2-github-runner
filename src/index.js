const aws = require('./aws');
const gh = require('./gh');
const config = require('./config');
const core = require('@actions/core');

function setOutput(label, ec2InstanceId) {
  core.setOutput('label', label);
  core.setOutput('ec2-instance-id', ec2InstanceId);
}

async function start() {
  const label = config.generateUniqueLabel();
  githubRegistrationToken = config.input.githubRegistrationToken;
  if (!githubRegistrationToken) {
    githubRegistrationToken = await gh.getRegistrationToken();
  }  
  const ec2InstanceId = await aws.startEc2Instance(label, githubRegistrationToken);
  setOutput(label, ec2InstanceId);
  await aws.waitForInstanceRunning(ec2InstanceId);
  if (config.input.githubToken) {
    await gh.waitForRunnerRegistered(label);
  } else {
    core.info(`Cannot check if the GitHub self-hosted runner is registered: please provide the github-token param instead of github-registration-token to check it`);
  }
}

async function stop() {
  await aws.terminateEc2Instance();
  await gh.removeRunner();
  if (config.input.githubToken) {
    await gh.removeRunner();
  } else {
    core.info(`Cannot remove the runner: please manually remove the runner ${config.input.label} from the GitHub repository ${config.githubContext.owner}/${config.githubContext.repo}`);
  }
}

(async function () {
  try {
    config.input.mode === 'start' ? await start() : await stop();
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
})();
