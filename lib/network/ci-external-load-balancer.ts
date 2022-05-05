/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  Instance, Peer, SecurityGroup, Vpc,
} from '@aws-cdk/aws-ec2';
import {
  ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol, ApplicationProtocolVersion, ApplicationTargetGroup,
  ListenerCertificate, Protocol, SslPolicy,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { InstanceTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import { CfnOutput, Stack } from '@aws-cdk/core';

export interface JenkinsExternalLoadBalancerProps {
  readonly vpc: Vpc;
  readonly sg: SecurityGroup;
  readonly targetInstance: Instance;
  readonly listenerCertificate: ListenerCertificate;
  readonly useSsl: boolean;
}

export class JenkinsExternalLoadBalancer {
  public readonly loadBalancer: ApplicationLoadBalancer;

  public readonly listener: ApplicationListener;

  public readonly targetGroup: ApplicationTargetGroup;

  constructor(stack: Stack, props: JenkinsExternalLoadBalancerProps) {
    // Using an ALB so it can be part of a security group rather than by whitelisting ip addresses
    this.loadBalancer = new ApplicationLoadBalancer(stack, 'JenkinsALB', {
      vpc: props.vpc,
      securityGroup: props.sg,
      internetFacing: true,
    });

    const accessPort = props.useSsl ? 443 : 80;

    this.listener = this.loadBalancer.addListener('JenkinsListener', {
      sslPolicy: props.useSsl ? SslPolicy.RECOMMENDED : undefined,
      port: accessPort,
      open: true,
      certificates: props.useSsl ? [props.listenerCertificate] : undefined,
    });

    if (props.useSsl) {
      this.loadBalancer.addRedirect({
        sourceProtocol: ApplicationProtocol.HTTP,
        sourcePort: 80,
        targetProtocol: ApplicationProtocol.HTTPS,
        targetPort: 443,
      });
    }

    this.targetGroup = this.listener.addTargets('MainJenkinsNodeTarget', {
      port: accessPort,
      targets: [new InstanceTarget(props.targetInstance, accessPort)],
      healthCheck: {
        protocol: props.useSsl ? Protocol.HTTPS : Protocol.HTTP,
        path: '/login',
      },
    });

    new CfnOutput(stack, 'Jenkins External Load Balancer Dns', {
      value: this.loadBalancer.loadBalancerDnsName,
    });
  }
}
