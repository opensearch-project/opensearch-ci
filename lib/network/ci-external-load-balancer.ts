/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { CfnOutput, Stack } from 'aws-cdk-lib';
import { Instance, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, ListenerCertificate, Protocol, SslPolicy,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { InstanceTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';

export interface JenkinsExternalLoadBalancerProps {
  readonly vpc: Vpc;
  readonly sg: SecurityGroup;
  readonly targetInstance: AutoScalingGroup;
  readonly listenerCertificate: ListenerCertificate;
  readonly useSsl: boolean;
}

export class JenkinsExternalLoadBalancer {
  public readonly loadBalancer: ApplicationLoadBalancer;

  public readonly listener: ApplicationListener;

  public readonly targetGroup: ApplicationTargetGroup;

  constructor(stack: Stack, props: JenkinsExternalLoadBalancerProps) {
    const accessPort = props.useSsl ? 443 : 80;

    // Using an ALB so it can be part of a security group rather than by whitelisting ip addresses
    this.loadBalancer = new ApplicationLoadBalancer(stack, 'JenkinsALB', {
      vpc: props.vpc,
      securityGroup: props.sg,
      internetFacing: true,
    });

    this.listener = this.loadBalancer.addListener('JenkinsListener', {
      sslPolicy: props.useSsl ? SslPolicy.RECOMMENDED : undefined,
      port: accessPort,
      open: false,
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
      targets: [props.targetInstance],
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
