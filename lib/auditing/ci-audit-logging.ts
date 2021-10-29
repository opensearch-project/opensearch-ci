/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Bucket, BucketAccessControl } from '@aws-cdk/aws-s3';
import { Duration, Stack } from '@aws-cdk/core';

export class CiAuditLogging {
  public readonly bucket : Bucket;

  constructor(stack: Stack) {
    this.bucket = new Bucket(stack, 'jenkinsAuditBucket', {
      serverAccessLogsBucket: this.bucket,
      serverAccessLogsPrefix: 's3AccessLogs/',
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      lifecycleRules: [
        {
          expiration: Duration.days(3650),
        },
      ],
    });
  }
}
