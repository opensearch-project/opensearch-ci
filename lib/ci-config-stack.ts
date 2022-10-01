/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class CIConfigStack extends Stack {
  static readonly CERTIFICATE_ARN_SECRET_EXPORT_VALUE: string = 'certificateArnSecret';

  static readonly CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE: string = 'certContentsSecret';

  static readonly CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE: string = 'certChainSecret';

  static readonly PRIVATE_KEY_SECRET_EXPORT_VALUE: string = 'privateKeySecret';

  static readonly REDIRECT_URL_SECRET_EXPORT_VALUE: string = 'redirectUrlSecret';

  static readonly OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE: string = 'OIDCConfigValueSecret';

  static readonly CASC_RELOAD_TOKEN_SECRET_EXPORT_VALUE: string = 'casc';

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const arnSecret = new Secret(this, 'certificateArn', {
      description: 'Certificate ARN retrieved after uploading certificate to IAM server',
    });
    const certContentsSecret = new Secret(this, 'certContents', {
      description: 'Contents of public key of the SSL certificate',
    });
    const certChainSecret = new Secret(this, 'certChain', {
      description: 'Contents of the SSL certificate chain',
    });
    const privateKeySecret = new Secret(this, 'privateKey', {
      description: 'Contents of private key of the SSL certificate',
    });
    const redirectUrlSecret = new Secret(this, 'redirectUrl', {
      description: 'Redirect url for Jenkins',
    });
    const OIDCConfigValuesSecret = new Secret(this, 'OIDCConfigValues', {
      description: 'OIDC params in JSON format',
    });
    const CascReloadTokenValuesSecret = new Secret(this, 'CascReloadTokenValue', {
      description: 'Reload token (password) required for configuration as code plugin',
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

    new CfnOutput(this, 'cascSecretValue', {
      value: CascReloadTokenValuesSecret.secretArn,
      exportName: CIConfigStack.CASC_RELOAD_TOKEN_SECRET_EXPORT_VALUE,
    });
  }
}
