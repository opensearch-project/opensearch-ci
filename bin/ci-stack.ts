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

const defaultEnv: string = 'Dev';

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${defaultEnv}`, {});

const ciStack = new CIStack(app, `OpenSearch-CI-${defaultEnv}`, {});

new DeployAwsAssets(app, `OpenSearch-CI-Deploy-Assets-${defaultEnv}`, {
    envName: defaultEnv,
});
