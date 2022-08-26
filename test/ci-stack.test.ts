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
import { Peer } from '@aws-cdk/aws-ec2';
import { App } from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';

test('CI Stack Basic Resources', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true', additionalCommands: './test/data/hello-world.py' },
  });

  // WHEN
  const stack = new CIStack(app, 'TestStack', {
    dataRetention: true,
  });

  // THEN
  expect(stack).to(countResources('AWS::EC2::Instance', 1));
  expect(stack).to(countResources('AWS::ElasticLoadBalancingV2::LoadBalancer', 1));
  expect(stack).to(countResources('AWS::EC2::SecurityGroup', 4));
  expect(stack).to(countResources('AWS::IAM::Policy', 1));
  expect(stack).to(countResources('AWS::IAM::Role', 3));
  expect(stack).to(countResources('AWS::S3::Bucket', 2));
  expect(stack).to(countResources('Custom::EC2-Key-Pair', 1));
  expect(stack).to(countResources('AWS::IAM::InstanceProfile', 2));
  expect(stack).to(countResources('AWS::SSM::Document', 1));
  expect(stack).to(countResources('AWS::SSM::Association', 1));
  expect(stack).to(countResources('AWS::EFS::FileSystem', 1));
  expect(stack).to(countResources('AWS::CloudWatch::Alarm', 5));
});

test('External security group is open', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

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

test('External security group is restricted', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', { restrictServerAccessTo: Peer.ipv4('10.0.0.0/24') });

  // THEN
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    GroupDescription: 'External access to Jenkins',
    SecurityGroupEgress: [
      {
        CidrIp: '0.0.0.0/0',
      },
    ],
  }));

  // Make sure that load balancer access is restricted to given Ipeer
  expect(stack).to(haveResourceLike('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: [
      {
        CidrIp: '10.0.0.0/24',
      },
    ],
  }));
});

test('MainNode', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  expect(stack).to(haveResourceLike('AWS::EC2::Instance', {
    InstanceType: 'c5.9xlarge',
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
  const stack = new CIStack(app, 'MyTestStack', {});

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

test('CloudwatchCpuAlarm', () => {
  const app = new App({
    context: { useSsl: 'false', runWithOidc: 'false' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  expect(stack).to(haveResourceLike('AWS::CloudWatch::Alarm', {
    MetricName: 'CPUUtilization',
    Statistic: 'Average',
  }, ResourcePart.Properties));
});

test('CloudwatchMemoryAlarm', () => {
  const app = new App({
    context: { useSsl: 'false', runWithOidc: 'false' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  expect(stack).to(haveResourceLike('AWS::CloudWatch::Alarm', {
    MetricName: 'mem_used_percent',
    Statistic: 'Average',
  }, ResourcePart.Properties));
});
