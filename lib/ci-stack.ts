/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Construct, Stack, StackProps } from '@aws-cdk/core';

export class CIStack extends Stack {
  // eslint-disable-next-line no-useless-constructor
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Network / VPC

    // Security Groups

    // Compute

    // Load Balancers

    // Monitoring
  }
}
