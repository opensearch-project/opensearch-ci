import { Stack, Tags } from 'aws-cdk-lib';
import { IOpenIdConnectProvider, OpenIdConnectProvider } from 'aws-cdk-lib/aws-iam';
import {
  GitHubActionsFederateIntegrationForWorkflowIssueDedupeOnBedrockResources,
  GitHubActionsFederateIntegrationForPrsOnBedrockResources,
} from './gha-federate-access';

export class AWSIdentityAccessManagementRolesStack {
  static provider: IOpenIdConnectProvider;

  constructor(stack: Stack) {
    AWSIdentityAccessManagementRolesStack.provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(stack, 'open-id-connect-provider',
      `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`);

    const reposWithBedrockAccessOnWorkflowIssueDedupe = [
      'OpenSearch',
    ];

    const reposWithBedrockAccessOnPrs = [
      'OpenSearch',
      'OpenSearch-Dashboards',
      'opensearch-build',
      'sql',
      'ml-commons',
      'opensearch-benchmark',
    ];

    reposWithBedrockAccessOnWorkflowIssueDedupe.forEach((repo) => {
      new GitHubActionsFederateIntegrationForWorkflowIssueDedupeOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });

    reposWithBedrockAccessOnPrs.forEach((repo) => {
      new GitHubActionsFederateIntegrationForPrsOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });
  }
}
