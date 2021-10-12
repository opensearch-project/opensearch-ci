/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Port, SecurityGroup, Vpc } from '@aws-cdk/aws-ec2';
import { Stack } from '@aws-cdk/core';

export class JenkinsSecurityGroups {
  public readonly externalAccessSG: SecurityGroup;

  public readonly mainNodeSG: SecurityGroup;

  public readonly agentNodeSG: SecurityGroup;

  constructor(stack: Stack, vpc: Vpc) {
    this.externalAccessSG = new SecurityGroup(stack, 'ExternalAccessSG', {
      vpc,
      description: 'External access to Jenkins',
    });

    this.mainNodeSG = new SecurityGroup(stack, 'MainNodeSG', {
      vpc,
      description: 'Main node of Jenkins',
    });
    this.mainNodeSG.addIngressRule(this.externalAccessSG, Port.tcp(443));
  }
}
