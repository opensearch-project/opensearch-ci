/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import 'source-map-support/register';
import { App, RemovalPolicy } from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';
import { CIConfigStack } from '../lib/ci-config-stack';
import { DeployAWSAssets } from '../lib/DeployAWSAssets';

const app = new App();

const env: string = 'Dev';

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${env}`, {});

const ciStack = new CIStack(app, `OpenSearch-CI-${env}`, {
  ecrAccountId: ciConfigStack.account,
});

new DeployAWSAssets(app, `OpenSearch-CI-Deploy-Assets-${env}`, {
  removalPolicy: RemovalPolicy.DESTROY,
  mainNodeAccountNumber: ciStack.account,
  createEcrRepositories: true,
  envName: env,
  env: {
    // public ECR repositories can only be created in us-east-1
    // https://github.com/aws/aws-cli/issues/5917#issuecomment-775564831
    region: 'us-east-1',
  },
});
