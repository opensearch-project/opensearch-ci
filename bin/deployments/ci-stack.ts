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
