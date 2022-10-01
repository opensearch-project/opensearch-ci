/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Unit } from 'aws-cdk-lib/aws-cloudwatch';

type MeasurementDefinition = string | { name: string, rename?: string, unit?: Unit }

interface ProcstatMetricDefinition {
  pattern?: string;
  // eslint-disable-next-line camelcase
  append_dimensions?: string[];
  measurement: string[]; // procstat doesn't support the common measurement standard for rename/unit
  // eslint-disable-next-line camelcase
  metrics_collection_interval: number;
}

interface MetricDefinition {
  resources?: string[],
  measurement: MeasurementDefinition[],
  // eslint-disable-next-line camelcase
  metrics_collection_interval?: number,
}

interface EditableCloudwatchMetricsSection {
  namespace?: string;
  // eslint-disable-next-line camelcase
  append_dimensions?: any;
  // eslint-disable-next-line camelcase
  aggregation_dimensions?: [[string] | []]; // Create rollups without instance id
  // eslint-disable-next-line camelcase
  metrics_collected: {
    procstat?: ProcstatMetricDefinition[],
    cpu?: MetricDefinition,
    mem?: MetricDefinition,
    disk?: MetricDefinition,
    diskio?: MetricDefinition,
    swap?: MetricDefinition,
    net?: MetricDefinition,
    netstat?: MetricDefinition,

  };
}

/**
 * Cloudwatch configuration - Metrics Section
 *
 * See definition at https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html#CloudWatch-Agent-Configuration-File-Metricssection
 *
 * Example configuration:
 * ```
  metrics: {
    namespace: `${stack.stackName}/JenkinsMainNode`,
    append_dimensions: {
      // eslint-disable-next-line no-template-curly-in-string
      InstanceId: '${aws:InstanceId}',
    },
    aggregation_dimensions: [[]], // Create rollups without instance id
    metrics_collected: {
      procstat: [
        {
          pattern: 'jenkins',
          measurement: [
            'cpu_time',
            'cpu_time_system',
            'cpu_time_user',
            'pid_count',
            'memory_vms',
            'signals_pending',
            'rlimit_file_locks_hard',
            'rlimit_file_locks_soft',
          ],
          metrics_collection_interval: 10,
        },
      ],
      mem: {
        measurement: [
          'mem_used',
          'mem_cached',
          'mem_total',
        ],
        metrics_collection_interval: 1,
      },
    },
  }
 * ```
 */
export type CloudwatchMetricsSection = Readonly<EditableCloudwatchMetricsSection>;
