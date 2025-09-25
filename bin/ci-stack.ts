/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from 'aws-cdk-lib';
import { Peer } from 'aws-cdk-lib/aws-ec2';
import { CIConfigStack } from '../lib/ci-config-stack';
import { CIStack } from '../lib/ci-stack';
import { FineGrainedAccessSpecs } from '../lib/compute/auth-config';
import { StageDefs } from './stage-definitions';

const app = new App();

const stage = app.node.tryGetContext('stage');

const pl = app.node.tryGetContext('prefixList');
const prefixList = pl !== undefined ? pl : 'pl-60b85b09';

if (stage === 'undefined') {
  throw new Error("Please provide stage parameter, if deploying locally please pass 'Dev' value");
} else if (stage !== 'Beta' && stage !== 'Prod' && stage !== 'Dev') {
  throw new Error('Please provide a valid stage context value, it must be one of Beta, Prod or Dev');
}

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${stage}`, {});

if (stage === 'Dev') {
  const ciStack = new CIStack(app, `OpenSearch-CI-${stage}`, {
    env: {
      region: process.env.CDK_DEFAULT_REGION,
    },
  });
  ciStack.addDependency(ciConfigStack);
} else {
  const benchmarkFineGrainAccess: FineGrainedAccessSpecs = {
    groups: ['opensearch-project*submit-benchmark'],
    roleName: process.env.BENCHMARK_ROLE || 'benchmark-workflow-build-access-role', // benchmark.....role
    pattern: '(?i)benchmark-.*',
    templateName: 'builder-template',
  };

  const distributionWorkflowsBuildAccess: FineGrainedAccessSpecs = {
    users: ['opensearch-ci-bot'],
    roleName: 'distribution-workflow-build-role',
    pattern: '(manifest-update|docker-scan)',
    templateName: 'builder-template',
  };

  const ciStack = new CIStack(app, `OpenSearch-CI-${stage}`, {
    useSsl: true,
    authType: 'github',
    ignoreResourcesFailures: false,
    adminUsers: ['getsaurabh02', 'gaiksaya', 'peterzhuamazon', 'rishabh6788', 'zelinh', 'prudhvigodithi', 'Divyaasm', 'ryanaslett'],
    dataRetention: true,
    agentAssumeRole: StageDefs[stage].agentAssumeRole,
    macAgent: true,
    restrictServerAccessTo: stage === 'Prod' ? Peer.anyIpv4() : Peer.prefixList(prefixList.toString()),
    useProdAgents: true,
    enableViews: true,
    fineGrainedAccessSpecs: [benchmarkFineGrainAccess, distributionWorkflowsBuildAccess],
    envVarsFilePath: './resources/envVars.yaml',
    env: {
      account: StageDefs[stage].accountId,
      region: StageDefs[stage].region,
    },
  });
  ciStack.addDependency(ciConfigStack);
}
