/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import {
  IPeer, Port, SecurityGroup, Vpc,
} from 'aws-cdk-lib/aws-ec2';

export class JenkinsSecurityGroups {
  public readonly externalAccessSG: SecurityGroup;

  public readonly mainNodeSG: SecurityGroup;

  public readonly agentNodeSG: SecurityGroup;

  public readonly efsSG: SecurityGroup;

  constructor(stack: Stack, vpc: Vpc, useSsl: boolean, restrictServerAccessTo: IPeer) {
    let accessPort = 80;
    if (useSsl) {
      accessPort = 443;
    }

    this.externalAccessSG = new SecurityGroup(stack, 'ExternalAccessSG', {
      vpc,
      description: 'External access to Jenkins',
    });
    this.externalAccessSG.addIngressRule(restrictServerAccessTo, Port.tcp(accessPort), 'Restrict jenkins endpoint access to this source');

    this.mainNodeSG = new SecurityGroup(stack, 'MainNodeSG', {
      vpc,
      description: 'Main node of Jenkins',
    });
    this.mainNodeSG.addIngressRule(this.externalAccessSG, Port.tcp(accessPort));

    this.agentNodeSG = new SecurityGroup(stack, 'AgentNodeSG', {
      vpc,
      description: 'Agent Node of Jenkins',
    });
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(22), 'Main node SSH Access into agent nodes');
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(445), 'Main node SMB Access into agent nodes for Windows');
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(5985), 'Main node WinRM HTTP Access into agent nodes for Windows');
    this.agentNodeSG.addIngressRule(this.agentNodeSG, Port.allTraffic(), 'Agent node open all ports to other agent nodes within the same SG');

    this.efsSG = new SecurityGroup(stack, 'efsSG', {
      vpc,
      description: 'Jenkins EFS',
    });
    this.efsSG.addIngressRule(this.mainNodeSG, Port.allTraffic(), 'Main node Access to EFS');
  }
}
