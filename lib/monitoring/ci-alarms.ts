/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  Alarm, AlarmWidget, ComparisonOperator, Dashboard, Metric, TreatMissingData,
} from '@aws-cdk/aws-cloudwatch';
import { Stack } from '@aws-cdk/core';
import { JenkinsExternalLoadBalancer } from '../network/ci-external-load-balancer';
import { JenkinsMainNode } from '../compute/jenkins-main-node';

export class JenkinsMonitoring {
  public readonly alarms: Alarm[] = [];

  constructor(stack: Stack, externalLoadBalancer: JenkinsExternalLoadBalancer, mainNode: JenkinsMainNode) {
    const dashboard = new Dashboard(stack, 'AlarmDashboard');

    const cpuMetric = new Metric({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      dimensionsMap: {
        InstanceId: mainNode.ec2Instance.instanceId,
      },
    });

    this.alarms.push(new Alarm(stack, 'AverageMainNodeCpuUtilization', {
      alarmDescription: 'Overall EC2 avg CPU Utilization',
      evaluationPeriods: 3,
      metric: cpuMetric,
      threshold: 50,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    }));

    this.alarms.push(new Alarm(stack, 'ExternalLoadBalancerUnhealthyHosts', {
      alarmDescription: 'If any hosts behind the load balancer are unhealthy',
      metric: externalLoadBalancer.targetGroup.metricUnhealthyHostCount(),
      evaluationPeriods: 3,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.BREACHING,
    }));

    this.alarms.push(new Alarm(stack, 'MainNodeTooManyJenkinsProcessesFound', {
      alarmDescription: 'Only one jenkins process should run at any given time on the main node, there might be a cloudwatch configuration issue',
      metric: mainNode.ec2InstanceMetrics.foundJenkinsProcessCount.with({ statistic: 'max' }),
      evaluationPeriods: 3,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.IGNORE,
    }));

    this.alarms.push(new Alarm(stack, 'MainNodeHighMemoryUtilization', {
      alarmDescription: 'The jenkins process is using more memory than expected, it should be investigated for a large number of jobs or heavy weight jobs',
      metric: mainNode.ec2InstanceMetrics.memUsed.with({ statistic: 'avg' }),
      evaluationPeriods: 5,
      threshold: 50,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.IGNORE,
    }));

    this.alarms.push(new Alarm(stack, 'MainNodeCloudwatchEvents', {
      alarmDescription: `Cloudwatch events have stopped being received from the main node.
Use session manager to exam the host and the /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log`,
      metric: mainNode.ec2InstanceMetrics.memUsed.with({ statistic: 'n' }),
      evaluationPeriods: 1,
      /**
       * Memory metrics are reported every second, 60 in 1 minute
       * Period is set to 5 minute, in 1 evaluation periods = 300 events
       * Allowing for 20% loss, 240 events the min threshold
       */
      threshold: 240,
      comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.MISSING,
    }));

    this.alarms
      .map((alarm) => new AlarmWidget({ alarm }))
      .forEach((widget) => dashboard.addWidgets(widget));
  }
}
