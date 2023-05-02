/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Duration, Stack } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl, ObjectOwnership } from 'aws-cdk-lib/aws-s3';

export class CiAuditLogging {
  public readonly bucket: Bucket;

  constructor(stack: Stack) {
    this.bucket = new Bucket(stack, 'jenkinsAuditBucket', {
      serverAccessLogsBucket: this.bucket,
      serverAccessLogsPrefix: 's3AccessLogs/',
      accessControl: BucketAccessControl.LOG_DELIVERY_WRITE,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
      lifecycleRules: [
        {
          expiration: Duration.days(3650),
        },
      ],
    });
  }
}
