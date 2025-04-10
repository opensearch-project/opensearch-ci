/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { CfnOutput, Stack } from 'aws-cdk-lib';
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
        AutoScalingGroupName: mainNode.mainNodeAsg.autoScalingGroupName,
      },
    });

    const cpuAlarm = new Alarm(stack, 'AverageMainNodeCpuUtilization', {
      alarmDescription: 'Overall EC2 avg CPU Utilization',
      evaluationPeriods: 3,
      metric: cpuMetric,
      threshold: 75,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    this.alarms.push(cpuAlarm);
    /* The export output id is same for Beta and Prod stacks
    TODO: This hack to export the alarms to be referenced by internal monitoring system. Remove this once we move to publicly available notification system.
     */
    new CfnOutput(stack, 'ExportsOutputRefAverageMainNodeCpuUtilization6436B02FB9AFEC33', {
      value: cpuAlarm.alarmName,
      exportName: `${stack.stackName}:ExportsOutputRefAverageMainNodeCpuUtilization6436B02FB9AFEC33`,
    });

    const extAlbUnhealthyHostsAlarm = new Alarm(stack, 'ExternalLoadBalancerUnhealthyHosts', {
      alarmDescription: 'If any hosts behind the load balancer are unhealthy',
      metric: externalLoadBalancer.targetGroup.metrics.unhealthyHostCount(),
      evaluationPeriods: 3,
      threshold: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.BREACHING,
    });

    this.alarms.push(extAlbUnhealthyHostsAlarm);
    new CfnOutput(stack, 'ExportsOutputRefExternalLoadBalancerUnhealthyHostsB6562F3767963B76', {
      value: extAlbUnhealthyHostsAlarm.alarmName,
      exportName: `${stack.stackName}:ExportsOutputRefExternalLoadBalancerUnhealthyHostsB6562F3767963B76`,
    });

    /**
     *If the Jenkins over the last 15 (evaluationPeriods:3 * Period:5) minutes period is less than 1 (jenkins down) for at least 2 times. */

    const mainNodeProcessNotFoundAlarm = new Alarm(stack, 'MainNodeJenkinsProcessNotFound', {
      alarmDescription: 'Jenkins process is not running',
      metric: mainNode.ec2InstanceMetrics.foundJenkinsProcessCount.with({ statistic: 'avg' }),
      evaluationPeriods: 3,
      threshold: 1,
      datapointsToAlarm: 3,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.IGNORE,
    });
    this.alarms.push(mainNodeProcessNotFoundAlarm);
    new CfnOutput(stack, 'ExportsOutputRefMainNodeJenkinsProcessNotFoundF6687D218EF830FD', {
      value: mainNodeProcessNotFoundAlarm.alarmName,
      exportName: `${stack.stackName}:ExportsOutputRefMainNodeJenkinsProcessNotFoundF6687D218EF830FD`,
    });

    const mainNodeHighMemAlarm = new Alarm(stack, 'MainNodeHighMemoryUtilization', {
      alarmDescription: 'The jenkins process is using more memory than expected, it should be investigated for a large number of jobs or heavy weight jobs',
      metric: mainNode.ec2InstanceMetrics.memUsed.with({ statistic: 'avg' }),
      evaluationPeriods: 5,
      threshold: 65,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.IGNORE,
    });

    this.alarms.push(mainNodeHighMemAlarm);
    new CfnOutput(stack, 'ExportsOutputRefMainNodeHighMemoryUtilization17FAC56343DA2EB3', {
      value: mainNodeHighMemAlarm.alarmName,
      exportName: `${stack.stackName}:ExportsOutputRefMainNodeHighMemoryUtilization17FAC56343DA2EB3`,
    });

    this.alarms
      .map((alarm) => new AlarmWidget({ alarm }))
      .forEach((widget) => dashboard.addWidgets(widget));
  }
}
