/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  expect, countResources, haveOutput, not,
} from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';

test('CI Stack Basic Resources', () => {
  const app = new App();

  // WHEN
  const stack = new CIStack(app, 'TestStack', {});

  // THEN
  expect(stack).to(countResources('AWS::EC2::Instance', 0));
  expect(stack).to(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 0));
  expect(stack).to(countResources('AWS::EC2::SecurityGroup', 0));
  expect(stack).to(countResources('AWS::IAM::Role', 0));
});
