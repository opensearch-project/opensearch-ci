import { Stack, Tags } from 'aws-cdk-lib';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { OpenIdConnectProvider } from 'aws-cdk-lib/aws-iam';
import { GitHubActionsFederateIntegrationForBranchesAndTags } from './gha-federate-access';

export class AWSSecretsJenkinsCredentials {
    static centralPortalMavenUsername: Secret;

    static centralPortalMavenPassword: Secret;

    static onePasswordServiceToken: Secret;

    static snapshotsMavenUsername: ISecret;

    static snapshotsMavenPassword: ISecret;

    constructor(stack: Stack) {
      AWSSecretsJenkinsCredentials.snapshotsMavenPassword = Secret.fromSecretCompleteArn(stack, 'imported-maven-snapshots-password',
        `arn:aws:secretsmanager:us-east-1:${stack.account}:secret:maven-snapshots-password-uMmbAR`);

      AWSSecretsJenkinsCredentials.snapshotsMavenUsername = Secret.fromSecretCompleteArn(stack, 'imported-maven-snapshots-username',
        `arn:aws:secretsmanager:us-east-1:${stack.account}:secret:maven-snapshots-username-xfOoXz`);

      AWSSecretsJenkinsCredentials.centralPortalMavenUsername = new Secret(stack, 'maven-central-portal-username', {
        secretName: 'maven-central-portal-username',
        description: 'Username for publishing snapshots to maven central portal',
      });
      Tags.of(AWSSecretsJenkinsCredentials.centralPortalMavenUsername).add('jenkins:credentials:type', 'string');

      AWSSecretsJenkinsCredentials.centralPortalMavenPassword = new Secret(stack, 'maven-central-portal-password', {
        secretName: 'maven-central-portal-password',
        description: 'Password for publishing snapshots to maven central portal',
      });
      Tags.of(AWSSecretsJenkinsCredentials.centralPortalMavenPassword).add('jenkins:credentials:type', 'string');

      AWSSecretsJenkinsCredentials.onePasswordServiceToken = new Secret(stack, 'one-password-service-token', {
        secretName: 'one-password-service-token',
        description: 'Service Account Token for OnePassword to access the vaults',
      });
      Tags.of(AWSSecretsJenkinsCredentials.onePasswordServiceToken).add('jenkins:credentials:type', 'string');

      const reposWithMavenSnapshotsCredsAccess = [
        'opensearch-sdk-java',
        'opensearch-java',
        'spring-data-opensearch',
        'security',
        'index-management',
        'sql',
        'reporting',
        'alerting',
        'anomaly-detection',
        'asynchronous-search',
        'job-scheduler',
        'k-NN',
        'performance-analyzer',
        'observability',
        'notifications',
        'cross-cluster-replication',
        'common-utils',
        'ml-commons',
        'geospatial',
        'security-analytics',
        'neural-search',
        'OpenSearch',
        'flow-framework',
        'opensearch-testcontainers',
        'opensearch-hadoop',
        'performance-analyzer-commons',
        'opensearch-spark',
        'custom-codecs',
        'skills',
        'query-insights',
        'opensearch-system-templates',
        'opensearch-remote-metadata-sdk',
        'opensearch-jvector',
        'opensearch-protobufs',
      ];

      const provider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(stack, 'open-id-connect-provider',
        `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`);

      reposWithMavenSnapshotsCredsAccess.forEach((repo) => {
        new GitHubActionsFederateIntegrationForBranchesAndTags(stack, provider,
          [AWSSecretsJenkinsCredentials.snapshotsMavenUsername.secretArn,
            AWSSecretsJenkinsCredentials.snapshotsMavenPassword.secretArn,
            AWSSecretsJenkinsCredentials.centralPortalMavenUsername.secretArn,
            AWSSecretsJenkinsCredentials.centralPortalMavenPassword.secretArn], repo);
      });
    }
}
