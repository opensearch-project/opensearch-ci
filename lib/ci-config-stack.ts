/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  CfnOutput, Construct, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import { Key } from '@aws-cdk/aws-kms';
import { Secret } from '@aws-cdk/aws-secretsmanager';

export class CIConfigStack extends Stack {
    static readonly CERTIFICATE_ARN_SECRET_EXPORT_VALUE: string = 'certificateArnSecret';

    static readonly CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE: string = 'certContentsSecret';

    static readonly CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE: string = 'certChainSecret';

    static readonly PRIVATE_KEY_SECRET_EXPORT_VALUE: string = 'privateKeySecret';

    static readonly REDIRECT_URL_SECRET_EXPORT_VALUE: string = 'redirectUrlSecret';

    static readonly OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE: string = 'OIDCConfigValueSecret';

    constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id, props);


      const kmsKey = new Key(this, 'ciKey', {
        description: 'KMS key for encrypting ci-config secrets',
        enableKeyRotation: true,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      const arnSecret = new Secret(this, 'certificateArn', {
        encryptionKey: kmsKey,
      });
      const certContentsSecret = new Secret(this, 'certContents', {
        encryptionKey: kmsKey,
      });
      const certChainSecret = new Secret(this, 'certChain', {
        encryptionKey: kmsKey,
      });
      const privateKeySecret = new Secret(this, 'privateKey', {
        encryptionKey: kmsKey,
      });
      const redirectUrlSecret = new Secret(this, 'redirectUrl', {
        encryptionKey: kmsKey,
      });
      const OIDCConfigValuesSecret = new Secret(this, 'OIDCConfigValues', {
        encryptionKey: kmsKey,
      });

      new CfnOutput(this, 'certificateArnSecret', {
        value: arnSecret.secretArn,
        exportName: CIConfigStack.CERTIFICATE_ARN_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'certContentsSecret', {
        value: certContentsSecret.secretArn,
        exportName: CIConfigStack.CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'certChainSecret', {
        value: certChainSecret.secretArn,
        exportName: CIConfigStack.CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'privateKeySecret', {
        value: privateKeySecret.secretArn,
        exportName: CIConfigStack.PRIVATE_KEY_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'redirectUrlSecret', {
        value: redirectUrlSecret.secretArn,
        exportName: CIConfigStack.REDIRECT_URL_SECRET_EXPORT_VALUE,
      });

      new CfnOutput(this, 'OIDCConfigValuesSecret', {
        value: OIDCConfigValuesSecret.secretArn,
        exportName: CIConfigStack.OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE,
      });
    }
}
