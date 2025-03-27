/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from 'aws-cdk-lib';
import { Peer } from 'aws-cdk-lib/aws-ec2';
import { CiCdnStack } from '../lib/ci-cdn-stack';
import { CIConfigStack } from '../lib/ci-config-stack';
import { CIStack } from '../lib/ci-stack';
import { StageDef } from './stage-definitions';
import { FineGrainedAccessSpecs } from '../lib/compute/auth-config';

const app = new App();

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${StageDef.envName}`, {});

if (StageDef.envName === 'Dev') {
  const ciStack = new CIStack(app, `OpenSearch-CI-${StageDef.envName}`, {
    env: {
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
  const ciCdnStack = new CiCdnStack(app, `OpenSearch-CI-Cdn-${StageDef.envName}`, {});
  ciCdnStack.addDependency(ciStack);
  ciStack.addDependency(ciConfigStack);

} else {

  const benchmarkFineGrainAccess: FineGrainedAccessSpecs = {
    users: ['reta'],
    roleName: process.env.BENCHMARK_ROLE || 'benchmark-workflow-build-access-role', // benchmark.....role
    pattern: '(?i)benchmark-.*',
    templateName: 'builder-template',
  };

  const ciStack = new CIStack(app, `OpenSearch-CI-${StageDef.envName}`, {
    useSsl: true,
    authType: 'github',
    ignoreResourcesFailures: false,
    adminUsers: ['getsaurabh02', 'gaiksaya', 'peterzhuamazon', 'rishabh6788', 'zelinh', 'prudhvigodithi', 'Divyaasm', 'bshien'],
    dataRetention: true,
    agentAssumeRole: StageDef.agentAssumeRole,
    macAgent: true,
    restrictServerAccessTo: StageDef.envName === 'Prod' ? Peer.anyIpv4() : Peer.prefixList('pl-60b85b09'),
    useProdAgents: true,
    enableViews: true,
    fineGrainedAccessSpecs: [benchmarkFineGrainAccess],
    envVarsFilePath: './resources/envVars.yaml',
    env: {
      account: StageDef.AccountId,
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
  ciStack.addDependency(ciConfigStack);
}
