import { Stack, Tags } from 'aws-cdk-lib';
import { GitHubActionsFederateIntegrationForBranchesAndTagsOnBedrockResources } from './gha-federate-access';
import { AWSSecretsJenkinsCredentials } from './secret-credentials';

export class AWSIdentityAccessManagementRolesStack {
  constructor(stack: Stack) {
    const reposWithBedrockAccess = [
      'OpenSearch',
    ];

    reposWithBedrockAccess.forEach((repo) => {
      new GitHubActionsFederateIntegrationForBranchesAndTagsOnBedrockResources(stack, AWSSecretsJenkinsCredentials.provider, repo);
    });
  }
}
