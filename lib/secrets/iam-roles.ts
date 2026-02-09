import { Stack, Tags } from 'aws-cdk-lib';
import { IOpenIdConnectProvider, OpenIdConnectProvider } from 'aws-cdk-lib/aws-iam';
import {
  GitHubActionsFederateIntegrationForBranchesAndTagsOnBedrockResources,
  GitHubActionsFederateIntegrationForPrsOnBedrockResources,
} from './gha-federate-access';

export class AWSIdentityAccessManagementRolesStack {
  static provider: IOpenIdConnectProvider;

  constructor(stack: Stack) {
    AWSIdentityAccessManagementRolesStack.provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(stack, 'open-id-connect-provider',
      `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`);

    const reposWithBedrockAccessOnBranches = [
      'OpenSearch',
    ];

    const reposWithBedrockAccessOnPrs = [
      'OpenSearch',
    ];

    reposWithBedrockAccessOnBranches.forEach((repo) => {
      new GitHubActionsFederateIntegrationForBranchesAndTagsOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });

    reposWithBedrockAccessOnPrs.forEach((repo) => {
      new GitHubActionsFederateIntegrationForPrsOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });
  }
}
