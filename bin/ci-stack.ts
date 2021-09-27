#!/usr/bin/env node

/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CIStack } from '../lib/ci-stack';

const app = new cdk.App();
new CIStack(app, 'CI-Dev', { });
