<img src="https://opensearch.org/assets/brand/SVG/Logo/opensearch_logo_default.svg" height="64px"/>

- [OpenSearch Continous Integration](#opensearch-continous-integration)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
  - [Dev Deployment](#dev-deployment)
  - [Executing Optional Tasks](#executing-optional-tasks)
    - [SSL Configuration](#ssl-configuration)
    - [setup OpenId Connect (OIDC) via Federate](#setup-openid-connect-oidc-via-federate)
  - [Troubleshooting](#troubleshooting)
    - [Main Node](#main-node)
  - [Useful commands](#useful-commands)
  - [Architecture Overview](#architecture-overview)
- [Contributing](#contributing)
- [Getting Help](#getting-help)
- [Code of Conduct](#code-of-conduct)
- [Security](#security)
- [License](#license)
- [Copyright](#copyright)

## OpenSearch Continuous Integration

OpenSearch Continuous Integration is an open source CI system for OpenSearch and its plugins.

## Getting Started

- Requires [NPM](https://docs.npmjs.com/cli/v7/configuring-npm/install) to be installed
- Install project dependencies using `npm install` from this project directory
- Configure [aws credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
- Deploy stacks with `npm run cdk deploy`

## Deployment

### Dev Deployment 
1. Setup your local machine to credentials to deploy to the AWS Account
2. Deploy the ci-config-stackusing the with one of the following (takes ~1 minute to deploy) - 
   1. `npm run cdk deploy CI-Config-Dev` or,
   2. `cdk deploy CI-Config-Dev`
3. [Optional](#ssl-configuration) Configure the elements of the config stack for SSL configuration
4. [Optional](#setup-openid-connect-oidc-via-federate) Configure the elements setting up oidc via federate
5. Deploy the ci-stack, takes ~10 minutes to deploy (parameter values depend on step 3 and step 4)
   1. `npm run cdk deploy CI-Dev -- -c useSsl=false -c runWithOidc=false` or,
   2. `cdk deploy CI-Dev -c useSsl=false -c runWithOidc=false`
6. Log onto the AWS Console of the account, navigate to [cloud watch](https://console.aws.amazon.com/cloudwatch/home), open log groups, looking for `JenkinsMainNode/var/log/jenkins/jenkins.log`
7. Search the logs for `Jenkins initial setup is required. An admin user has been created and a password generated.` After that entry the password for the jenkins instance will be in the cloudwatch logs.
8. Go to the `CI-Dev.JenkinsExternalLoadBalancerDns` url returned by CDK output to access the jenkins host.
9. If you want to destroy the stack make sure you delete the agent nodes manually (via jenkins UI or AWS console) so that shared resources (like vpc, security groups, etc) can be deleted.

### Executing Optional Tasks
#### SSL Configuration
1. Locate the secret manager arns in the ci-config-stack outputs
2. Update the secret value ([see docs](https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/put-secret-value.html)) for the `certContentsSecret` with the certificate contents
```
$aws secretsmanager put-secret-value \
--secret-id MyTestDatabaseSecret_or_ARN \
--secret-string file://mycreds.json_or_value
```
3. Update the secret value ([see docs](https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/put-secret-value.html)) for the `privateKeySecret` with the certificate private key
4. Upload the certificate to IAM [see docs](https://docs.aws.amazon.com/cli/latest/reference/iam/upload-server-certificate.html)
5. Update the secret value for the `certificateArnSecret` with the certificate arn generated by IAM
6. Run with parameter using one of the following (refer [this](#setup-openid-connect-oidc-via-federate)  for value of `runWithOidc`)
   1. `npm run cdk deploy CI-Dev -- -c useSsl=true -c runWithOidc=true` or,
   2. `cdk deploy CI-Dev -c useSsl=true -c runWithOidc=true`
7. Continue with [next steps](#dev-deployment)

#### Setup OpenId Connect (OIDC) via Federate
1. Locate the secret manager arns in the ci-config-stack outputs
2. Update the secret value ([see docs](https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/put-secret-value.html)) for the `OIDCClientIdSecret` with the credentials as json as follows:
   1. JSON format
   ```
    {
        "clientId": "example_id",
        "clientPassword": "example_password",
        "wellKnownOpenIDConfigurationUrl": "https://www.example.com",
        "tokenServerUrl": "https://example.com/token",
        "authorizationServerUrl": "https://example.com/authorize",
        "userInfoServerUrl": "https://example.com/userinfo"
    }
    ```
   2. Command Eg: [see docs](https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/put-secret-value.html)
   ```
    $aws secretsmanager put-secret-value \
    --secret-id MyTestDatabaseSecret_or_ARN \
    --secret-string file://mycreds.json_or_value
    ```
3. Run with parameter with one of the following (refer [this](#ssl-configuration) for value of `useSsL`) -
   1. `npm run cdk deploy CI-Dev -- -c runWithOidc=false -c useSsl=true` or,
   2. `cdk deploy CI-Dev -c runWithOidc=false -c useSsl=true`
4. Continue with [next steps](#dev-deployment) 

### Troubleshooting
#### Main Node
Useful links
- Log are found in [Cloud Watch Logs](https://console.aws.amazon.com/cloudwatch/home)
- Need to access the host, ssh via Session Manager in [EC2 Console](https://console.aws.amazon.com/ec2/v2/home)
- Instance instance isn't coming up, get the system log in [EC2 Console](https://console.aws.amazon.com/ec2/v2/home)


### Useful commands

- `npm run build`   compile typescript to js, run lint, run tests
- `npm run watch`   watch for changes and compile
- `npm run cdk deploy`      deploy this stack to your default AWS account/region
- `npm run cdk diff`        compare deployed stack with current state
- `npm run cdk synth`       emits the synthesized CloudFormation template

### Architecture Overview

![Plantuml diagram, see ./diagrams/opensearch-ci-overview.puml for source](./diagrams/opensearch-ci-overview.svg)

Built using [AWS Cloud Development Kit](https://aws.amazon.com/cdk/) the configuration of the CI systems will be available for replication in your own accounts.  The Jenkins instance will be hardened and publically visible, connected to GitHub to make build notifications easy for everyone to see.

## Contributing

See [developer guide](DEVELOPER_GUIDE.md) and [how to contribute to this project](CONTRIBUTING.md). 

## Getting Help

If you find a bug, or have a feature request, please don't hesitate to open an issue in this repository.

For more information, see [project website](https://opensearch.org/) and [documentation](https://docs-beta.opensearch.org/). If you need help and are unsure where to open an issue, try [forums](https://discuss.opendistrocommunity.dev/).

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](CODE_OF_CONDUCT.md). For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq), or contact [opensource-codeofconduct@amazon.com](mailto:opensource-codeofconduct@amazon.com) with any additional questions or comments.

## Security

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## License

This project is licensed under the [Apache v2.0 License](LICENSE.txt).

## Copyright

Copyright OpenSearch Contributors. See [NOTICE](NOTICE.txt) for details.
