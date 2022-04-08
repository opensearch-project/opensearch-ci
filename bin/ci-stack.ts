/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App, RemovalPolicy } from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';
import { CIConfigStack } from '../lib/ci-config-stack';
import { DeployAwsAssets } from '../lib/deploy-aws-assets';

const app = new App();

const defaultEnv: string = 'lol';

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${defaultEnv}`, {});

const ciStack = new CIStack(app, `OpenSearch-CI-${defaultEnv}`, {});

new DeployAwsAssets(app, `OpenSearch-CI-Deploy-Assets-${defaultEnv}`, {
  /* This will delete the ECR repository once the stack is destroyed.
   * Default removal policy (if not specified) is RemovalPolicy.DESTROY */
  removalPolicy: RemovalPolicy.DESTROY,
  mainNodeAccountNumber: ciStack.account,
  envName: defaultEnv,
  env: {
    // public ECR repositories can only be created in us-east-1
    // https://github.com/aws/aws-cli/issues/5917#issuecomment-775564831
    region: 'us-east-1',
  },
  repositories: [
    'opensearch',
  ],
});
