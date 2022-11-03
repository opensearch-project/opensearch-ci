/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import {
  Alarm, AlarmWidget, ComparisonOperator, Dashboard, Metric, TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { JenkinsMainNode } from '../compute/jenkins-main-node';
import { JenkinsExternalLoadBalancer } from '../network/ci-external-load-balancer';

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

    this.alarms.push(new Alarm(stack, 'MainNodeJenkinsProcessNotFound', {
      alarmDescription: 'Jenkins process is not running',
      metric: mainNode.ec2InstanceMetrics.foundJenkinsProcessCount.with({ statistic: 'avg' }),
      evaluationPeriods: 1,
      threshold: 1,
      datapointsToAlarm: 1,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
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

    this.alarms
      .map((alarm) => new AlarmWidget({ alarm }))
      .forEach((widget) => dashboard.addWidgets(widget));
  }
}
