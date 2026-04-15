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
      'opensearch-build',
      'opensearch-benchmark',
      'opensearch-learning-to-rank-base',
      'opensearch-remote-metadata-sdk',
      'job-scheduler',
      'security',
      'custom-codecs',
      'k-NN',
      'ml-commons',
      'sql',
      'OpenSearch-Dashboards',
      'observabilityDashboards',
      'reportsDashboards',
      'queryWorkbenchDashboards',
      'customImportMapDashboards',
      'anomalyDetectionDashboards',
      'mlCommonsDashboards',
    ];

    const reposWithBedrockAccessOnPrs = [
      'OpenSearch',
      'opensearch-build',
      'opensearch-benchmark',
      'agent-health',
      'opensearch-learning-to-rank-base',
      'opensearch-remote-metadata-sdk',
      'job-scheduler',
      'security',
      'custom-codecs',
      'k-NN',
      'ml-commons',
      'sql',
      'OpenSearch-Dashboards',
      'observabilityDashboards',
      'reportsDashboards',
      'queryWorkbenchDashboards',
      'customImportMapDashboards',
      'anomalyDetectionDashboards',
      'mlCommonsDashboards',
    ];

    reposWithBedrockAccessOnWorkflowIssueDedupe.forEach((repo) => {
      new GitHubActionsFederateIntegrationForWorkflowIssueDedupeOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });

    reposWithBedrockAccessOnPrs.forEach((repo) => {
      new GitHubActionsFederateIntegrationForPrsOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });
  }
}
