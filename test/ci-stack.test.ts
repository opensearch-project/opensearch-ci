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
    context: {
      useSsl: 'true', runWithOidc: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32', additionalCommands: './test/data/hello-world.py',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'TestStack', {
    dataRetention: true,
    env: { account: 'test-account', region: 'us-east-1' },
  });
  const template = Template.fromStack(stack);

  // THEN
  template.resourceCountIs('AWS::AutoScaling::AutoScalingGroup', 1);
  template.resourceCountIs('AWS::AutoScaling::LaunchConfiguration', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  template.resourceCountIs('AWS::EC2::SecurityGroup', 4);
  template.resourceCountIs('AWS::IAM::Policy', 1);
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.resourceCountIs('AWS::EC2::KeyPair', 1);
  template.resourceCountIs('AWS::IAM::InstanceProfile', 2);
  template.resourceCountIs('AWS::SSM::Document', 1);
  template.resourceCountIs('AWS::SSM::Association', 1);
  template.resourceCountIs('AWS::EFS::FileSystem', 1);
  template.resourceCountIs('AWS::CloudWatch::Alarm', 4);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);
});

test('External security group is open', () => {
  const app = new App({
    context: {
      useSsl: 'true', runWithOidc: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: 'all',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', { env: { account: 'test-account', region: 'us-east-1' } });
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
        Description: 'Restrict jenkins endpoint access to this source',
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
    context: {
      useSsl: 'true', runWithOidc: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: '10.0.0.0/24',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
    useSsl: true,
    restrictServerAccessTo: Peer.ipv4('10.0.0.0/24'),
  });
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
        Description: 'Restrict jenkins endpoint access to this source',
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
    context: {
      useSsl: 'true', runWithOidc: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::AutoScaling::LaunchConfiguration', {
    InstanceType: 'c5.9xlarge',
    SecurityGroups: [
      {
        'Fn::GetAtt': [
          'MainNodeSG5CEF04F0',
          'GroupId',
        ],
      },
    ],
  });

  Template.fromStack(stack).hasResourceProperties('AWS::AutoScaling::AutoScalingGroup', {
    MaxSize: '1',
    MinSize: '1',
    DesiredCapacity: '1',
  });
});

test('LoadBalancer', () => {
  const app = new App({
    context: {
      useSsl: 'true', runWithOidc: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: 'all',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });

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
    context: {
      useSsl: 'false', runWithOidc: 'false', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
    MetricName: 'CPUUtilization',
    Statistic: 'Average',
  });
});

test('CloudwatchMemoryAlarm', () => {
  const app = new App({
    context: {
      useSsl: 'false', runWithOidc: 'false', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::CloudWatch::Alarm', {
    MetricName: 'mem_used_percent',
    Statistic: 'Average',
  });
});

test('LoadBalancer Access Logging', () => {
  const app = new App({
    context: {
      useSsl: 'false', runWithOidc: 'false', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32',
    },
  });

  // WHEN
  const stack = new CIStack(app, 'MyTestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });

  // THEN
  Template.fromStack(stack).hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
    LoadBalancerAttributes: [
      {
        Key: 'deletion_protection.enabled',
        Value: 'false',
      },
      {
        Key: 'access_logs.s3.enabled',
        Value: 'true',
      },
      {
        Key: 'access_logs.s3.bucket',
        Value: {
          Ref: 'jenkinsAuditBucket110D3080',
        },
      },
      {
        Key: 'access_logs.s3.prefix',
        Value: 'loadBalancerAccessLogs',
      },
    ],
  });

  Template.fromStack(stack).hasResourceProperties('AWS::S3::BucketPolicy', {
    PolicyDocument: {
      Statement: [
        {
          Action: [
            's3:PutObject',
            's3:PutObjectLegalHold',
            's3:PutObjectRetention',
            's3:PutObjectTagging',
            's3:PutObjectVersionTagging',
            's3:Abort*',
          ],
          Effect: 'Allow',
          Principal: {
            AWS: {
              'Fn::Join': [
                '',
                [
                  'arn:',
                  {
                    Ref: 'AWS::Partition',
                  },
                  ':iam::127311923021:root',
                ],
              ],
            },
          },
          Resource: {
            'Fn::Join': [
              '',
              [
                {
                  'Fn::GetAtt': [
                    'jenkinsAuditBucket110D3080',
                    'Arn',
                  ],
                },
                '/loadBalancerAccessLogs/AWSLogs/test-account/*',
              ],
            ],
          },
        },
        {
          Action: 's3:PutObject',
          Condition: {
            StringEquals: {
              's3:x-amz-acl': 'bucket-owner-full-control',
            },
          },
          Effect: 'Allow',
          Principal: {
            Service: 'delivery.logs.amazonaws.com',
          },
          Resource: {
            'Fn::Join': [
              '',
              [
                {
                  'Fn::GetAtt': [
                    'jenkinsAuditBucket110D3080',
                    'Arn',
                  ],
                },
                '/loadBalancerAccessLogs/AWSLogs/test-account/*',
              ],
            ],
          },
        },
        {
          Action: 's3:GetBucketAcl',
          Effect: 'Allow',
          Principal: {
            Service: 'delivery.logs.amazonaws.com',
          },
          Resource: {
            'Fn::GetAtt': [
              'jenkinsAuditBucket110D3080',
              'Arn',
            ],
          },
        },
        {
          Action: 's3:PutObject',
          Effect: 'Allow',
          Principal: {
            Service: 'logdelivery.elasticloadbalancing.amazonaws.com',
          },
          Resource: {
            'Fn::Join': [
              '',
              [
                {
                  'Fn::GetAtt': [
                    'jenkinsAuditBucket110D3080',
                    'Arn',
                  ],
                },
                '/loadBalancerAccessLogs/*',
              ],
            ],
          },
        },
      ],
      Version: '2012-10-17',
    },
  });
});
