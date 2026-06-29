import { Stack } from 'aws-cdk-lib';
import { IOpenIdConnectProvider, OpenIdConnectProvider } from 'aws-cdk-lib/aws-iam';
import {
  GitHubActionsFederateIntegrationForPrsOnBedrockResources,
  GitHubActionsFederateIntegrationForWorkflowIssueDedupeOnBedrockResources,
} from './gha-federate-access';

export class AWSIdentityAccessManagementRolesStack {
  static provider: IOpenIdConnectProvider;

  constructor(stack: Stack) {
    AWSIdentityAccessManagementRolesStack.provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      stack,
      'open-id-connect-provider',
      `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`,
    );

    const reposWithBedrockAccessOnWorkflowIssueDedupe = [
      'opensearch-build',
      'opensearch-benchmark',
      'OpenSearch',
      'common-utils',
      'opensearch-learning-to-rank-base',
      'opensearch-remote-metadata-sdk',
      'job-scheduler',
      'security',
      'custom-codecs',
      'k-NN',
      'geospatial',
      'cross-cluster-replication',
      'ml-commons',
      'neural-search',
      'notifications',
      'observability',
      'reporting',
      'sql',
      'asynchronous-search',
      'anomaly-detection',
      'alerting',
      'security-analytics',
      'index-management',
      'performance-analyzer',
      'flow-framework',
      'skills',
      'query-insights',
      'opensearch-system-templates',
      'user-behavior-insights',
      'search-relevance',
      'OpenSearch-Dashboards',
      'opensearch-dashboards-functional-test',
      'dashboards-observability',
      'dashboards-reporting',
      'dashboards-query-workbench',
      'dashboards-maps',
      'anomaly-detection-dashboards-plugin',
      'ml-commons-dashboards',
      'index-management-dashboards-plugin',
      'dashboards-notifications',
      'alerting-dashboards-plugin',
      'security-analytics-dashboards-plugin',
      'security-dashboards-plugin',
      'dashboards-search-relevance',
      'dashboards-assistant',
      'dashboards-flow-framework',
      'query-insights-dashboards',
      'dashboards-investigation',
    ];

    const reposWithBedrockAccessOnPrs = [
      'opensearch-build',
      'opensearch-benchmark',
      'oscar-ai-bot',
      'agent-health',
      'OpenSearch',
      'common-utils',
      'opensearch-learning-to-rank-base',
      'opensearch-remote-metadata-sdk',
      'job-scheduler',
      'security',
      'custom-codecs',
      'k-NN',
      'geospatial',
      'cross-cluster-replication',
      'ml-commons',
      'neural-search',
      'notifications',
      'observability',
      'reporting',
      'sql',
      'asynchronous-search',
      'anomaly-detection',
      'alerting',
      'security-analytics',
      'index-management',
      'performance-analyzer',
      'flow-framework',
      'skills',
      'query-insights',
      'opensearch-system-templates',
      'user-behavior-insights',
      'search-relevance',
      'OpenSearch-Dashboards',
      'opensearch-dashboards-functional-test',
      'dashboards-observability',
      'dashboards-reporting',
      'dashboards-query-workbench',
      'dashboards-maps',
      'anomaly-detection-dashboards-plugin',
      'ml-commons-dashboards',
      'index-management-dashboards-plugin',
      'dashboards-notifications',
      'alerting-dashboards-plugin',
      'security-analytics-dashboards-plugin',
      'security-dashboards-plugin',
      'dashboards-search-relevance',
      'dashboards-assistant',
      'dashboards-flow-framework',
      'query-insights-dashboards',
      'dashboards-investigation',
    ];

    reposWithBedrockAccessOnWorkflowIssueDedupe.forEach((repo) => {
      new GitHubActionsFederateIntegrationForWorkflowIssueDedupeOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });

    reposWithBedrockAccessOnPrs.forEach((repo) => {
      new GitHubActionsFederateIntegrationForPrsOnBedrockResources(stack, AWSIdentityAccessManagementRolesStack.provider, repo);
    });
  }
}
