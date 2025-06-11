/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { CIStack } from '../../lib/ci-stack';

function checkMainNodeYmlConfiguration(template: Template, expectedYmlEntries: Match[]) {
  template.hasResource('AWS::AutoScaling::AutoScalingGroup', {
    Metadata: {
      'AWS::CloudFormation::Init': {
        config: {
          files: {
            '/initial_jenkins.yaml': {
              content: {
                'Fn::Join': [
                  // first element is the delimiter
                  '',
                  // second element is the array of fragments
                  Match.arrayWith(expectedYmlEntries),
                ],
              },
            },
          },
        },
      },
    },
  });
}

test('Agents Resource is present', () => {
  const app = new App({
    context: {
      useSsl: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32', jenkinsInstanceType: 'BTR', useProdAgents: 'true',
    },
  });
  const stack = new CIStack(app, 'TestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'OpenSearch-CI-AgentNodeRole',
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'ec2.amazonaws.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });
  template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
    Description: 'Jenkins agents Node Policy',
    Path: '/',
    Roles: [
      {
        Ref: 'OpenSearchCIAgentNodeRole4270FE0F',
      },
    ],
    PolicyDocument: {
      Statement: [
        {
          Action: [
            'ecr-public:BatchCheckLayerAvailability',
            'ecr-public:GetRepositoryPolicy',
            'ecr-public:DescribeRepositories',
            'ecr-public:DescribeRegistries',
            'ecr-public:DescribeImages',
            'ecr-public:DescribeImageTags',
            'ecr-public:GetRepositoryCatalogData',
            'ecr-public:GetRegistryCatalogData',
            'ecr-public:InitiateLayerUpload',
            'ecr-public:UploadLayerPart',
            'ecr-public:CompleteLayerUpload',
            'ecr-public:PutImage',
          ],
          Effect: 'Allow',
          Resource: 'arn:aws:ecr-public::test-account:repository/*',
        },
        {
          Action: [
            'ecr-public:GetAuthorizationToken',
            'sts:GetServiceBearerToken',
          ],
          Effect: 'Allow',
          Resource: '*',
        },
      ],
      Version: '2012-10-17',
    },
  });

  checkMainNodeYmlConfiguration(template, [
    // Make sure we've got agents defined for two of the default set
    Match.stringLikeRegexp('labelString: Jenkins-Agent-AL2023-X64-C54xlarge-Single-Host'),
    Match.stringLikeRegexp('labelString: Jenkins-Agent-AL2-X64-C54xlarge-Docker-Host'),
  ]);
});

test('Custom agent node passed into jenkins configuration', () => {
  const app = new App({
    context: {
      useSsl: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32', jenkinsInstanceType: 'BTR', useProdAgents: 'true',
    },
  });
  const stack = new CIStack(app, 'TestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
    alternativeNodeConfig: [{
      agentType: 'unix',
      amiId: 'myAmi',
      instanceType: 'myInstanceType',
      customDeviceMapping: 'myCustomDeviceMapping',
      workerLabelString: ['myWorker'],
      remoteUser: 'myRemoteUser',
      maxTotalUses: 0,
      minimumNumberOfSpareInstances: 0,
      numExecutors: 0,
      initScript: 'custom init script',
      remoteFs: 'myRemoteFs',
    }],
  });

  const template = Template.fromStack(stack);
  // Find the custom agent that was added
  checkMainNodeYmlConfiguration(template, [
    Match.stringLikeRegexp('myAmi'),
    Match.stringLikeRegexp('custom init script'),
    Match.stringLikeRegexp('myInstanceType'),
  ]);

  // Make sure the default agent was not created
  checkMainNodeYmlConfiguration(template, [
    Match.not(Match.stringLikeRegexp('labelString: Jenkins-Agent-AL2023-X64-C54xlarge-Single-Host')),
  ]);
});

test('Agents Node policy with assume role Resource is present', () => {
  const app = new App({
    context: {
      useSsl: 'true', serverAccessType: 'ipv4', restrictServerAccessTo: '10.10.10.10/32', jenkinsInstanceType: 'BTR',
    },
  });
  const stack = new CIStack(app, 'TestStack', {
    agentAssumeRole: ['arn:aws:iam::12345:role/test-role', 'arn:aws:iam::901523:role/test-role2'],
    env: { account: 'test-account', region: 'us-east-1' },
  });
  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Resource: [
            'arn:aws:iam::12345:role/test-role',
            'arn:aws:iam::901523:role/test-role2',
          ],
        },
      ],
      Version: '2012-10-17',
    },

  });
});

describe('JenkinsMainNode Config with macAgent template', () => {
  // WHEN
  const testYaml = 'test/data/jenkins.yaml';
  const yml: any = load(readFileSync(testYaml, 'utf-8'));
  // THEN
  test('Verify Mac template tenancy ', async () => {
    const macConfig = yml.jenkins.clouds[0].amazonEC2.templates[0].tenancy;
    expect(macConfig).toEqual('Host');
  });
  test('Verify Mac template type', async () => {
    const macConfig = yml.jenkins.clouds[0].amazonEC2.templates[0].type;
    expect(macConfig).toEqual('Mac1Metal');
  });
  test('Verify Mac template amiType.macData.sshPort', async () => {
    const macConfig = yml.jenkins.clouds[0].amazonEC2.templates[0].amiType.macData.sshPort;
    expect(macConfig).toEqual('22');
  });
  test('Verify Mac template customDeviceMapping', async () => {
    const macConfig = yml.jenkins.clouds[0].amazonEC2.templates[0].customDeviceMapping;
    expect(macConfig).toEqual('/dev/sda1=:300:true:gp3::encrypted');
  });
});
