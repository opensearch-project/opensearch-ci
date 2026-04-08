import { Stack } from 'aws-cdk-lib';
import {
  IOpenIdConnectProvider,
  OpenIdConnectPrincipal, PolicyStatement, Role,
} from 'aws-cdk-lib/aws-iam';

export class GitHubActionsFederateIntegrationForTags {
  constructor(stack: Stack, provider: IOpenIdConnectProvider, secretArns: string[], githubRepo: string) {
    // creating IAM role for accessing secret only using tags
    const ghaRole = new Role(stack, `${githubRepo}-github-role`, {
      roleName: `${githubRepo}-secret-access-role-for-tags`,
      assumedBy: new OpenIdConnectPrincipal(provider, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:opensearch-project/${githubRepo}:ref:refs/tags/*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
    });

    ghaRole.addToPolicy(new PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: secretArns,
    }));
  }
}

export class GitHubActionsFederateIntegrationForBranchesAndTags {
  constructor(stack: Stack, provider: IOpenIdConnectProvider, secretArns: string[], githubRepo: string) {
    // creating IAM role for accessing secret only using branches
    // Ensure roleName meets AWS IAM requirements: alphanumeric characters and _+=,.@- only, max 64 chars
    const sanitizedRepo = githubRepo.replace(/[^a-zA-Z0-9_+=,.@-]/g, '-');
    const roleNameBase = `${sanitizedRepo}-secret-access-role-for-branches-public`;
    // Ensure the roleName doesn't exceed 64 characters
    const roleName = roleNameBase.length > 64 ? roleNameBase.substring(0, 64) : roleNameBase;

    const ghaBranchRole = new Role(stack, `${githubRepo}-github-role-branches-public`, {
      roleName,
      assumedBy: new OpenIdConnectPrincipal(provider, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:opensearch-project/${githubRepo}:ref:refs/*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
    });

    ghaBranchRole.addToPolicy(new PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: secretArns,
    }));
  }
}

export class GitHubActionsFederateIntegrationForWorkflowIssueDedupeOnBedrockResources {
  constructor(stack: Stack, provider: IOpenIdConnectProvider, githubRepo: string) {
    // creating IAM role for accessing bedrock only using issue dedupe workflow on default branch
    // Ensure roleName meets AWS IAM requirements: alphanumeric characters and _+=,.@- only, max 64 chars
    const sanitizedRepo = githubRepo.replace(/[^a-zA-Z0-9_+=,.@-]/g, '-');
    const roleNameBase = `${sanitizedRepo}-bedrock-access-role-for-workflow-issue-dedupe-public`;
    // Ensure the roleName doesn't exceed 64 characters
    const roleName = roleNameBase.length > 64 ? roleNameBase.substring(0, 64) : roleNameBase;

    const ghaWorkflowIssueDedupeRoleBedrock = new Role(stack, `${githubRepo}-bedrock-github-role-workflow-issue-dedupe-public`, {
      roleName,
      assumedBy: new OpenIdConnectPrincipal(provider, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:opensearch-project/${githubRepo}:*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          'token.actions.githubusercontent.com:repository': `opensearch-project/${githubRepo}`,
          'token.actions.githubusercontent.com:ref': 'refs/heads/main',
          'token.actions.githubusercontent.com:workflow': 'Issue Dedupe Main',
        },
        'ForAnyValue:StringEquals': {
          'token.actions.githubusercontent.com:job_workflow_ref': [
            `opensearch-project/${githubRepo}/.github/workflows/issue-dedupe-detect.yml@refs/heads/main`,
            `opensearch-project/${githubRepo}/.github/workflows/issue-dedupe-autoclose.yml@refs/heads/main`,
          ],
        },
      }),
    });

    ghaWorkflowIssueDedupeRoleBedrock.addToPolicy(new PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [
        `arn:aws:bedrock:*:${stack.account}:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0`,
        `arn:aws:bedrock:*:${stack.account}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0`,
        `arn:aws:bedrock:*:${stack.account}:inference-profile/us.anthropic.claude-sonnet-4-6`,
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6',
      ],
    }));
  }
}

export class GitHubActionsFederateIntegrationForPrsOnBedrockResources {
  constructor(stack: Stack, provider: IOpenIdConnectProvider, githubRepo: string) {
    // creating IAM role for accessing bedrock only using PRs
    // Ensure roleName meets AWS IAM requirements: alphanumeric characters and _+=,.@- only, max 64 chars
    const sanitizedRepo = githubRepo.replace(/[^a-zA-Z0-9_+=,.@-]/g, '-');
    const roleNameBase = `${sanitizedRepo}-bedrock-access-role-for-prs-public`;
    // Ensure the roleName doesn't exceed 64 characters
    const roleName = roleNameBase.length > 64 ? roleNameBase.substring(0, 64) : roleNameBase;

    const ghaPrRoleBedrock = new Role(stack, `${githubRepo}-bedrock-github-role-prs-public`, {
      roleName,
      assumedBy: new OpenIdConnectPrincipal(provider, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:opensearch-project/${githubRepo}:pull_request`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
    });

    ghaPrRoleBedrock.addToPolicy(new PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [
        `arn:aws:bedrock:*:${stack.account}:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0`,
        `arn:aws:bedrock:*:${stack.account}:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0`,
        `arn:aws:bedrock:*:${stack.account}:inference-profile/us.anthropic.claude-sonnet-4-6`,
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0',
        'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-6',
      ],
    }));
  }
}

export class GitHubActionsFederateIntegrationForBranchesOnGenericActionsAndResources {
  constructor(stack: Stack, provider: IOpenIdConnectProvider, Actions: string[], Resources: string[], roleNamePostfix: string, githubRepo: string) {
    // creating IAM role for accessing secret only using branches on generic actions and resources`
    const ghaBranchRoleGeneric = new Role(stack, `${githubRepo}-github-role-branches-generic-actions-resources-${roleNamePostfix}`, {
      roleName: `${githubRepo}-role-branches-generic-${roleNamePostfix}`,
      assumedBy: new OpenIdConnectPrincipal(provider, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:opensearch-project/${githubRepo}:ref:refs/heads/*`,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
    });

    ghaBranchRoleGeneric.addToPolicy(new PolicyStatement({
      actions: Actions,
      resources: Resources,
    }));
  }
}
