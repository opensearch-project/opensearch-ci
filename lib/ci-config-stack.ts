/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  CfnOutput, Construct, Stack, StackProps,
} from '@aws-cdk/core';

import { Secret } from '@aws-cdk/aws-secretsmanager';

export class CIConfigStack extends Stack {
    static readonly CERTIFICATE_ARN_SECRET_EXPORT_VALUE: string = 'certificateArnSecret';

    static readonly CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE: string = 'certContentsSecret';

    static readonly PRIVATE_KEY_SECRET_EXPORT_VALUE: string = 'privateKeySecret';

    static readonly REDIRECT_URL_SECRET_EXPORT_VALUE: string = 'redirectUrlSecret';

    constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id, props);

      const arnSecret = new Secret(this, 'certificateArn', {});
      const certContentsSecret = new Secret(this, 'certContents', {});
      const privateKeySecret = new Secret(this, 'privateKey', {});
      const redirectUrlSecret = new Secret(this, 'redirectUrl', {});

      new CfnOutput(this, 'certificateArnSecret', {
        value: arnSecret.secretArn,
        exportName: CIConfigStack.CERTIFICATE_ARN_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'certContentsSecret', {
        value: certContentsSecret.secretArn,
        exportName: CIConfigStack.CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'privateKeySecret', {
        value: privateKeySecret.secretArn,
        exportName: CIConfigStack.PRIVATE_KEY_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'redirectUrlSecret', {
        value: redirectUrlSecret.secretArn,
        exportName: CIConfigStack.REDIRECT_URL_SECRET_EXPORT_VALUE,
      });
    }
}
