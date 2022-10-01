/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Peer } from 'aws-cdk-lib/aws-ec2';
import { CIStack } from '../lib/ci-stack';

test('CI Stack Basic Resources', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true', additionalCommands: './test/data/hello-world.py' },
  });

  // WHEN
  const stack = new CIStack(app, 'TestStack', {
    dataRetention: true,
  });
  const template = Template.fromStack(stack);

  // THEN
  template.resourceCountIs('AWS::EC2::Instance', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 4);
  template.resourceCountIs('AWS::IAM::Policy', 1);
  template.resourceCountIs('AWS::IAM::Role', 3);
  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.resourceCountIs('Custom::EC2-Key-Pair', 1);
  template.resourceCountIs('AWS::IAM::InstanceProfile', 2);
  template.resourceCountIs('AWS::SSM::Document', 1);
  template.resourceCountIs('AWS::SSM::Association', 1);
  template.resourceCountIs('AWS::EFS::FileSystem', 1);
  template.resourceCountIs('AWS::CloudWatch::Alarm', 5);
});

test('External security group is open', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});
  const template = Template.fromStack(stack);

  // THEN
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    GroupDescription: 'External access to Jenkins',
    SecurityGroupEgress: [
      {
        CidrIp: '0.0.0.0/0',
        Description: 'Allow all outbound traffic by default',
        IpProtocol: '-1',
      },
    ],
  });

  // Make sure that `open` is false on all the load balancers
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: [
      {
        CidrIp: '0.0.0.0/0',
        Description: 'Allow anyone to connect',
        FromPort: 443,
        IpProtocol: 'tcp',
        ToPort: 443,
      },
      {
        CidrIp: '0.0.0.0/0',
        Description: 'Allow from anyone on port 80',
        FromPort: 80,
        IpProtocol: 'tcp',
        ToPort: 80,
      },
    ],
  });
});

test('External security group is restricted', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', { useSsl: true, restrictServerAccessTo: Peer.ipv4('10.0.0.0/24') });
  const template = Template.fromStack(stack);

  // THEN
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    GroupDescription: 'External access to Jenkins',
    SecurityGroupEgress: [
      {
        CidrIp: '0.0.0.0/0',
      },
    ],
  });

  // Make sure that load balancer access is restricted to given Ipeer
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: [
      {
        CidrIp: '10.0.0.0/24',
        Description: 'Restrict access to this source',
        FromPort: 443,
        IpProtocol: 'tcp',
        ToPort: 443,
      },
      {
        CidrIp: '0.0.0.0/0',
        Description: 'Allow from anyone on port 80',
        FromPort: 80,
        IpProtocol: 'tcp',
        ToPort: 80,
      },
    ],
  });
});

test('MainNode', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::EC2::Instance', {
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
  });
});

test('LoadBalancer', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    SecurityGroups: [
      {
        'Fn::GetAtt': [
          'ExternalAccessSGFD03F4DC',
          'GroupId',
        ],
      },
    ],
  });
});

test('CloudwatchCpuAlarm', () => {
  const app = new App({
    context: { useSsl: 'false', runWithOidc: 'false' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
    MetricName: 'CPUUtilization',
    Statistic: 'Average',
  });
});

test('CloudwatchMemoryAlarm', () => {
  const app = new App({
    context: { useSsl: 'false', runWithOidc: 'false' },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {});

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
    MetricName: 'mem_used_percent',
    Statistic: 'Average',
  });
});
