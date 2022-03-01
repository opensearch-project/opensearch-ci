/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  expect, countResources,
} from '@aws-cdk/assert';
import { App, RemovalPolicy } from '@aws-cdk/core';
import { DeployAwsAssets } from '../lib/deploy-aws-assets';

test('Deploy Assets resources - deploy ecr stack', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new DeployAwsAssets(app, 'TestStack', {
    removalPolicy: RemovalPolicy.DESTROY,
    mainNodeAccountNumber: '99999999',
    envName: 'dev',
    env: {
      region: 'us-east-1',
    },
    deployECR: true,
    repositories: [
      'opensearch',
      'opensearch-dashboards',
    ],
  });

  // THEN
  expect(stack).to(countResources('AWS::CloudFormation::Stack', 1));
});

test('Deploy Assets resources - not deploying ecr stack', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new DeployAwsAssets(app, 'TestStack', {
    removalPolicy: RemovalPolicy.DESTROY,
    mainNodeAccountNumber: '99999999',
    envName: 'dev',
    env: {
      region: 'us-east-1',
    },
    repositories: [
      'opensearch',
      'opensearch-dashboards',
    ],
  });

  // THEN
  expect(stack).to(countResources('AWS::CloudFormation::Stack', 0));
});
