/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from 'aws-cdk-lib';
import { Peer } from 'aws-cdk-lib/aws-ec2';
import {
  readFileSync, writeFileSync, existsSync, appendFileSync,
} from 'fs';
import { CIConfigStack } from '../../lib/ci-config-stack';
import { CIStack } from '../../lib/ci-stack';
import { StageDef } from './stage-definitions';
import { FineGrainedAccessSpecs } from '../../lib/compute/auth-config';

const configPath = './bin/deployments/config.json';
let fileContent: string;
const app = new App();
const isProd = StageDef.envName === 'Prod';

// Below code reads the contents from placeholder script,
// Replaces the enter_endpoint_here placeholder with actual endpoint passed
// And then writes to temp file emitter whose contents are passed to SSM Doc creation
// TO-DO: Look for solution to replace relative path with absolute path
const serviceName = `OpenSearchCI${StageDef.envName}`;
const placeholderFilePath = './resources/placeholder_script';
fileContent = readFileSync(placeholderFilePath).toString('utf-8').replace('enter_endpoint_here', StageDef.Endpoint)
  .replace('service_name_placeholder', serviceName);
if (isProd) {
  const newContent = `${fileContent}\necho "0 * * * * $HOME/emitter --service opensearch-ruby --marketplace us-east-1 `
        + '--awsregion us-east-1 --endpoints https://raw.githubusercontent.com/opensearch-project/opensearch-ruby/main/certs/opensearch-rubygems.pem '
        + '--fast" >> newcron\necho "5 * * * * $HOME/emitter --service logstash-output-opensearch --marketplace us-east-1 --awsregion us-east-1 '
        + '--endpoints https://raw.githubusercontent.com/opensearch-project/logstash-output-opensearch/main/certs/opensearch-rubygems.pem --fast" '
        + '>> newcron\necho "10 * * * * $HOME/emitter --service logstash-input-opensearch --marketplace us-east-1 --awsregion us-east-1 '
        + '--endpoints https://raw.githubusercontent.com/opensearch-project/logstash-input-opensearch/main/certs/opensearch-rubygems.pem --fast" '
        + '>> newcron\ncrontab newcron\nrm newcron';

  fileContent = newContent;
}
const inputFilePath = './resources/emitter';
writeFileSync(inputFilePath, fileContent, {
  flag: 'w',
});

let fileConfig: any = {};
try {
  fileConfig = JSON.parse(readFileSync(configPath).toString('utf-8'));
} catch (error) {
  // eslint-disable-next-line no-console
  console.warn(error);
}

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${StageDef.envName}`, {
});

const benchmarkFineGrainAccess: FineGrainedAccessSpecs = {
  users: ['reta'],
  roleName: process.env.BENCHMARK_ROLE || 'benchmark-workflow-build-access-role', // benchmark.....role
  pattern: '(?i)benchmark-.*',
  templateName: 'builder-template',
};

const ciStack = new CIStack(app, `OpenSearch-CI-${StageDef.envName}`, {
  useSsl: fileConfig.useSsl,
  authType: fileConfig.authType,
  ignoreResourcesFailures: fileConfig.ignoreResourcesFailures,
  adminUsers: fileConfig.adminUsers,
  dataRetention: fileConfig.dataRetention,
  additionalCommands: inputFilePath,
  agentAssumeRole: StageDef.agentAssumeRole,
  macAgent: fileConfig.macAgent,
  restrictServerAccessTo: isProd ? Peer.anyIpv4() : Peer.prefixList('pl-60b85b09'),
  useProdAgents: fileConfig.useProdAgents,
  enableViews: fileConfig.enableViews,
  fineGrainedAccessSpecs: [benchmarkFineGrainAccess],
  envVarsFilePath: './resources/envVars.yaml',
  env: {
    account: StageDef.AccountId,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
ciStack.addDependency(ciConfigStack);
