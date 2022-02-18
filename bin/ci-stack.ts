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
import { DeployAssets } from './DeployAssets';

const app = new App();

new CIConfigStack(app, 'CI-Config-Dev', {});

const ciStack = new CIStack(app, 'CI-Dev', { });

const deployAssets = new DeployAssets(app, 'CI-Deploy-Assets', { ciStack, removalPolicy: RemovalPolicy.DESTROY });

deployAssets.addDependency(ciStack);
