import { Stack } from 'aws-cdk-lib';
import {
  OpenIdConnectPrincipal, OpenIdConnectProvider, PolicyStatement, Role,
} from 'aws-cdk-lib/aws-iam';

export class GitHubActionsFederateIntegrationForTags {
  constructor(stack: Stack, provider: OpenIdConnectProvider, secretArns: string[], githubRepo: string) {
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
  constructor(stack: Stack, provider: OpenIdConnectProvider, secretArns: string[], githubRepo: string) {
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

export class GitHubActionsFederateIntegrationForBranchesOnGenericActionsAndResources {
  constructor(stack: Stack, provider: OpenIdConnectProvider, Actions: string[], Resources: string[], roleNamePostfix: string, githubRepo: string) {
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
