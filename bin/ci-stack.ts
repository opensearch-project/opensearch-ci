/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from '@aws-cdk/core';
import { Peer } from '@aws-cdk/aws-ec2';
import { CIStack } from '../lib/ci-stack';
import { CIConfigStack } from '../lib/ci-config-stack';
import { CiCdnStack } from '../lib/ci-cdn-stack';

const access = Peer.prefixList('pl-f8a64391');

const app = new App();

const defaultEnv: string = 'lol';

const ciConfigStack = new CIConfigStack(app, `OpenSearch-CI-Config-${defaultEnv}`, {});

const ciStack = new CIStack(app, `OpenSearch-CI-${defaultEnv}`, {
  restrictServerAccessTo: access,
  ignoreResourcesFailures: false,
});

const ciCdnStack = new CiCdnStack(app, `OpenSearch-CI-Cdn-${defaultEnv}`, {});
ciCdnStack.addDependency(ciStack);
