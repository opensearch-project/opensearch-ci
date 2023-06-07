/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { InitFile, InitFileOptions } from 'aws-cdk-lib/aws-ec2';
import { CloudwatchAgentSection } from './cloudwatch/agent-section';
import { CloudwatchMetricsSection } from './cloudwatch/metrics-section';
import { CloudwatchLogsSection } from './cloudwatch/logs-section';

export interface CloudwatchAgentConfig {
  agent: CloudwatchAgentSection;
  metrics: CloudwatchMetricsSection;
  logs: CloudwatchLogsSection;
}

export class CloudwatchAgent {
  /**
   * Creates a cloudwatch agent config file as an InitFile that can be deployed onto an EC2 instance
   */
  public static asInitFile(filePath: string, config: CloudwatchAgentConfig, options?: InitFileOptions): InitFile {
    const configAsString = JSON.stringify(config, undefined, 2);
    return InitFile.fromString(filePath, configAsString, options);
  }
}
