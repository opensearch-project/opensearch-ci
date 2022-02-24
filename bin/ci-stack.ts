/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import 'source-map-support/register';
import { App, RemovalPolicy, Stack } from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';
import { CIConfigStack } from '../lib/ci-config-stack';
import { DeployAWSAssets } from './DeployAWSAssets';

const app = new App();

const env: string = 'Dev';

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${env}`, {});

const ciStack = new CIStack(app, `OpenSearch-CI-${env}`, {
  envName: env,
  ecrAccountId: ciConfigStack.account,
});

const deployAssets = new DeployAWSAssets(app, `OpenSearch-CI-Deploy-Assets-${env}`, {
  removalPolicy: RemovalPolicy.DESTROY,
  envName: env,
  mainNodeAccountNumber: ciStack.account,
});

// deployAssets.addDependency(ciStack);
