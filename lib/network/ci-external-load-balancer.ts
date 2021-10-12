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
  ApplicationListener, ApplicationLoadBalancer, ApplicationTargetGroup, ListenerCertificate, Protocol,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { InstanceTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import { CfnOutput, Stack } from '@aws-cdk/core';

export interface JenkinsExternalLoadBalancerProps {
  readonly vpc: Vpc;
  readonly sg: SecurityGroup;
  readonly targetInstance: Instance;
  readonly listenerCertificate: ListenerCertificate;
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

    this.listener = this.loadBalancer.addListener('JenkinsListener', {
      port: 443,
      open: false,
      certificates: [props.listenerCertificate],
    });

    // Allow only CORP traffic to IAD, see https://apll.corp.amazon.com/?region=us-east-1
    this.listener.connections.allowDefaultPortFrom(Peer.prefixList('pl-60b85b09'));

    this.targetGroup = this.listener.addTargets('MainJenkinsNodeTarget', {
      port: 443,
      targets: [new InstanceTarget(props.targetInstance, 443)],
      healthCheck: {
        protocol: Protocol.HTTPS,
        path: '/login',
      },
    });

    new CfnOutput(stack, 'Jenkins External Load Balancer Dns', {
      value: this.loadBalancer.loadBalancerDnsName,
    });
  }
}
