<img src="https://opensearch.org/assets/brand/SVG/Logo/opensearch_logo_default.svg" height="64px"/>

- [OpenSearch Continous Integration](#opensearch-continous-integration)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
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

## OpenSearch Continous Integration

OpenSearch Continous Integration is an open source CI system for OpenSearch and its plugins.

## Getting Started

- Requires [NPM](https://docs.npmjs.com/cli/v7/configuring-npm/install) to be installed
- Install project dependencies using `npm install` from this project directory
- Configure [aws credentials](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_prerequisites)
- Deploy stacks with `npm run cdk deploy`

## Deployment
1. Setup your local machine to credentials to deploy to the AWS Account
2. Deploy the ci config stack, `npm run cdk deploy CI-Config-Dev`, takes ~1 minute to deploy
3. [Optional] Configure the elements of the config stack for SSL configuration
4. Deploy the ci stack, without ssl, `npm run cdk deploy CI-Dev -- --parameters useSsl=false`, takes ~10 minutes to deploy
5. Log onto the AWS Console of the account, navigate to [cloud watch](https://console.aws.amazon.com/cloudwatch/home), open log groups, looking for `JenkinsMainNode/var/log/jenkins/jenkins.log`
6. Search the logs for `Jenkins initial setup is required. An admin user has been created and a password generated.` After that entry the password for the jenkins instance will be in the cloudwatch logs.
7. Go to the `CI-Dev.JenkinsExternalLoadBalancerDns` url returned by CDK output to access the jenkins host.

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
