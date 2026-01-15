import { Stack, Tags } from 'aws-cdk-lib';
import { OpenIdConnectProvider } from 'aws-cdk-lib/aws-iam';
import { GitHubActionsFederateIntegrationForBranchesAndTagsOnBedrockResources } from './gha-federate-access';

export class AWSIdentityAccessManagementRolesStack {
  constructor(stack: Stack) {
    const reposWithBedrockAccess = [
      'OpenSearch',
    ];

    const provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(stack, 'open-id-connect-provider',
      `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`);

    reposWithBedrockAccess.forEach((repo) => {
      new GitHubActionsFederateIntegrationForBranchesAndTagsOnBedrockResources(stack, provider, repo);
    });
  }
}
