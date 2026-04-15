/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AWSIdentityAccessManagementRolesStack } from '../../lib/secrets/iam-roles';

test('IAM Roles Stack Resources', () => {
  const app = new App({
    context: {
      useSsl: 'true',
    },
  });
  const stack = new Stack(app, 'TestStack', {
    env: { account: 'test-account', region: 'us-east-1' },
  });

  new AWSIdentityAccessManagementRolesStack(stack);

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::IAM::Role', 37);
  template.resourceCountIs('AWS::IAM::Policy', 37);

  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'OpenSearch-bedrock-access-role-for-workflow-issue-dedupe-public',
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRoleWithWebIdentity',
          Condition: {
            StringLike: {
              'token.actions.githubusercontent.com:sub': 'repo:opensearch-project/OpenSearch:*',
            },
            StringEquals: {
              'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
              'token.actions.githubusercontent.com:repository': 'opensearch-project/OpenSearch',
              'token.actions.githubusercontent.com:ref': 'refs/heads/main',
              'token.actions.githubusercontent.com:workflow': 'Issue Dedupe Main',
            },
            'ForAnyValue:StringEquals': {
              'token.actions.githubusercontent.com:job_workflow_ref': [
                'opensearch-project/opensearch-build/.github/workflows/issue-dedupe-detect.yml@refs/heads/main',
                'opensearch-project/opensearch-build/.github/workflows/issue-dedupe-autoclose.yml@refs/heads/main',
              ],
            },
          },
          Effect: 'Allow',
          Principal: {
            Federated: 'arn:aws:iam::test-account:oidc-provider/token.actions.githubusercontent.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'OpenSearch-bedrock-access-role-for-prs-public',
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRoleWithWebIdentity',
          Condition: {
            StringLike: {
              'token.actions.githubusercontent.com:sub': 'repo:opensearch-project/OpenSearch:pull_request',
            },
            StringEquals: {
              'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            },
          },
          Effect: 'Allow',
          Principal: {
            Federated: 'arn:aws:iam::test-account:oidc-provider/token.actions.githubusercontent.com',
          },
        },
      ],
      Version: '2012-10-17',
    },
  });

  template.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
          Effect: 'Allow',
          Resource: [
            'arn:aws:bedrock:*:test-account:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0',
            'arn:aws:bedrock:*:test-account:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0',
            'arn:aws:bedrock:*:test-account:inference-profile/us.anthropic.claude-sonnet-4-6',
            'arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
            'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0',
            'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6',
          ],
        },
      ],
      Version: '2012-10-17',
    },
  });
});
