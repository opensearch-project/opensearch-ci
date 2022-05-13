/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  expect as expectCDK, haveResource, haveResourceLike, countResources,
} from '@aws-cdk/assert';
import { Stack, App } from '@aws-cdk/core';
import { CIStack } from '../../lib/ci-stack';

test('Agents Resource is present', () => {
  const app = new App({
    context: { useSsl: 'true', runWithOidc: 'true' },
  });
  const stack = new CIStack(app, 'TestStack', {});

  expectCDK(stack).to(haveResourceLike('AWS::IAM::Role', {
    RoleName: 'OpenSearch-CI-AgentNodeRole',
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: {
              'Fn::Join': [
                '',
                [
                  'ec2.',
                  {
                    Ref: 'AWS::URLSuffix',
                  },
                ],
              ],
            },
          },
        },
      ],
      Version: '2012-10-17',
    },
  }));
  expectCDK(stack).to(haveResourceLike('AWS::IAM::ManagedPolicy', {
    Description: 'Jenkins agents Node Policy',
    Path: '/',
    ManagedPolicyName: 'OpenSearch-CI-AgentNodePolicy',
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
          Condition: {
            StringEquals: {
              'aws:RequestedRegion': {
                Ref: 'AWS::Region',
              },
              'aws:PrincipalAccount': [
                {
                  Ref: 'AWS::AccountId',
                },
              ],
            },
          },
          Effect: 'Allow',
          Resource: {
            'Fn::Join': [
              '',
              [
                'arn:aws:ecr-public::',
                {
                  Ref: 'AWS::AccountId',
                },
                ':repository/*',
              ],
            ],
          },
        },
        {
          Action: [
            'ecr-public:GetAuthorizationToken',
            'sts:GetServiceBearerToken',
          ],
          Condition: {
            StringEquals: {
              'aws:RequestedRegion': {
                Ref: 'AWS::Region',
              },
              'aws:PrincipalAccount': [
                {
                  Ref: 'AWS::AccountId',
                },
              ],
            },
          },
          Effect: 'Allow',
          Resource: '*',
        },
      ],
      Version: '2012-10-17',
    },
  }));
});
