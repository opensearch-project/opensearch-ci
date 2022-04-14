/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  expect, countResources, haveResourceLike, ResourcePart,
} from '@aws-cdk/assert';
import { App } from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';

test('CI Stack Basic Resources', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'TestStack', {
    dataRetention: true,
    ecrAccountId: '999999999',
  });

  // THEN
  expect(stack).to(countResources('AWS::EC2::Instance', 1));
  expect(stack).to(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1));
  expect(stack).to(countResources('AWS::EC2::SecurityGroup', 4));
  expect(stack).to(countResources('AWS::IAM::Policy', 1));
  expect(stack).to(countResources('AWS::IAM::Role', 3));
  expect(stack).to(countResources('AWS::S3::Bucket', 1));
  expect(stack).to(countResources('Custom::EC2-Key-Pair', 1));
  expect(stack).to(countResources('AWS::IAM::InstanceProfile', 2));
  expect(stack).to(countResources('AWS::EFS::FileSystem', 1));
});

test('External security group is open', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    ecrAccountId: '999999999',
  });

  // THEN
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    GroupDescription: 'External access to Jenkins',
    SecurityGroupEgress: [
      {
        CidrIp: '0.0.0.0/0',
      },
    ],
  }));

  // Make sure that `open` is false on all the load balancers
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: [
      {
        CidrIp: '0.0.0.0/0',
      },
    ],
  }));
});

test('MainNode', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    ecrAccountId: '999999999',
  });

  // THEN
  expect(stack).to(haveResourceLike('AWS::EC2::Instance', {
    InstanceType: 'c5.4xlarge',
    SecurityGroupIds: [
      {
        'Fn::GetAtt': [
          'MainNodeSG5CEF04F0',
          'GroupId',
        ],
      },
    ],
    Tags: [
      {
        Key: 'Name',
        Value: 'MyTestStack/MainNode',
      },
    ],
  }, ResourcePart.Properties));
});

test('LoadBalancer', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    ecrAccountId: '999999999',
  });

  // THEN
  expect(stack).to(haveResourceLike('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    SecurityGroups: [
      {
        'Fn::GetAtt': [
          'ExternalAccessSGFD03F4DC',
          'GroupId',
        ],
      },
    ],
  }, ResourcePart.Properties));
});
