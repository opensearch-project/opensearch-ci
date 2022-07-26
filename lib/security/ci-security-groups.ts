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

  public readonly efsSG: SecurityGroup;

  constructor(stack: Stack, vpc: Vpc, useSsl: boolean) {
    this.externalAccessSG = new SecurityGroup(stack, 'ExternalAccessSG', {
      vpc,
      description: 'External access to Jenkins',
    });

    this.mainNodeSG = new SecurityGroup(stack, 'MainNodeSG', {
      vpc,
      description: 'Main node of Jenkins',
    });

    const accessPort = 80;
    this.mainNodeSG.addIngressRule(this.externalAccessSG, Port.tcp(accessPort));
    if (useSsl) {
      this.mainNodeSG.addIngressRule(this.externalAccessSG, Port.tcp(443));
    }

    this.agentNodeSG = new SecurityGroup(stack, 'AgentNodeSG', {
      vpc,
      description: 'Agent Node of Jenkins',
    });
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(22), 'Main node SSH Access into agent nodes');
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(445), 'Main node SMB Access into agent nodes for Windows');
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(5985), 'Main node WinRM HTTP Access into agent nodes for Windows');

    this.efsSG = new SecurityGroup(stack, 'efsSG', {
      vpc,
      description: 'Jenkins EFS',
    });
    this.efsSG.addIngressRule(this.mainNodeSG, Port.allTraffic(), 'Main node Access to EFS');
  }
}
