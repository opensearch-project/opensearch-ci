/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import {
  IPeer, Port, SecurityGroup, IVpc,
} from 'aws-cdk-lib/aws-ec2';

export class JenkinsSecurityGroups {
  public readonly externalAccessSG: SecurityGroup;

  public readonly mainNodeSG: SecurityGroup;

  public readonly agentNodeSG: SecurityGroup;

  public readonly efsSG: SecurityGroup;

  constructor(stack: Stack, vpc: IVpc, useSsl: boolean, restrictServerAccessTo: IPeer, idSG: string) {
    let accessPort = 80;
    if (useSsl) {
      accessPort = 443;
    }

    this.externalAccessSG = new SecurityGroup(stack, `${idSG}-ExternalAccessSG`, {
      vpc,
      description: `External access to Jenkins ${idSG}`,
    });
    this.externalAccessSG.addIngressRule(restrictServerAccessTo, Port.tcp(accessPort), 'Restrict jenkins endpoint access to this source');

    this.mainNodeSG = new SecurityGroup(stack, `${idSG}-MainNodeSG`, {
      vpc,
      description: `Main node of Jenkins ${idSG}`,
    });
    this.mainNodeSG.addIngressRule(this.externalAccessSG, Port.tcp(accessPort));

    this.agentNodeSG = new SecurityGroup(stack, `${idSG}-AgentNodeSG`, {
      vpc,
      description: `Agent Node of Jenkins ${idSG}`,
    });
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(22), 'Main node SSH Access into agent nodes');
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(445), 'Main node SMB Access into agent nodes for Windows');
    this.agentNodeSG.addIngressRule(this.mainNodeSG, Port.tcp(5985), 'Main node WinRM HTTP Access into agent nodes for Windows');
    this.agentNodeSG.addIngressRule(this.agentNodeSG, Port.allTraffic(), 'Agent node open all ports to other agent nodes within the same SG');

    this.efsSG = new SecurityGroup(stack, `${idSG}-efsSG`, {
      vpc,
      description: `Jenkins EFS ${idSG}`,
    });
    this.efsSG.addIngressRule(this.mainNodeSG, Port.allTraffic(), 'Main node Access to EFS');
  }
}
