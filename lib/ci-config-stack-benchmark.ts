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

export class CIConfigStackBenchmark extends Stack {
  static readonly CERTIFICATE_ARN_SECRET_EXPORT_VALUE: string = 'certificateArnSecretBenchmark';

  static readonly CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE: string = 'certContentsSecretBenchmark';

  static readonly CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE: string = 'certChainSecretBenchmark';

  static readonly PRIVATE_KEY_SECRET_EXPORT_VALUE: string = 'privateKeySecretBenchmark';

  static readonly REDIRECT_URL_SECRET_EXPORT_VALUE: string = 'redirectUrlSecretBenchmark';

  static readonly OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE: string = 'OIDCConfigValueSecretBenchmark';

  static readonly CASC_RELOAD_TOKEN_SECRET_EXPORT_VALUE: string = 'cascBenchmark';

  constructor(scope: Construct, id: string, props?: StackProps) {
    // @ts-ignore
    super(scope, id, props);

    const arnSecret = new Secret(this, 'certificateArnBenchmark', {
      description: 'Certificate ARN retrieved after uploading certificate to IAM server',
    });
    const certContentsSecret = new Secret(this, 'certContentsBenchmark', {
      description: 'Contents of public key of the SSL certificate',
    });
    const certChainSecret = new Secret(this, 'certChainBenchmark', {
      description: 'Contents of the SSL certificate chain',
    });
    const privateKeySecret = new Secret(this, 'privateKeyBenchmark', {
      description: 'Contents of private key of the SSL certificate',
    });
    const redirectUrlSecret = new Secret(this, 'redirectUrlBenchmark', {
      description: 'Redirect url for Jenkins',
    });
    const OIDCConfigValuesSecret = new Secret(this, 'OIDCConfigValuesBenchmark', {
      description: 'OIDC params in JSON format',
    });
    const CascReloadTokenValuesSecret = new Secret(this, 'CascReloadTokenValueBenchmark', {
      description: 'Reload token (password) required for configuration as code plugin',
      generateSecretString: {
        excludeCharacters: '#$_!"%&\'()*+,./:;<=>?@[\\]^`{|}~',
        passwordLength: 5,
      },
    });

    new CfnOutput(this, 'certificateArnSecretBenchmark', {
      value: arnSecret.secretArn,
      exportName: CIConfigStackBenchmark.CERTIFICATE_ARN_SECRET_EXPORT_VALUE,
    });

    new CfnOutput(this, 'certContentsSecretBenchmark', {
      value: certContentsSecret.secretArn,
      exportName: CIConfigStackBenchmark.CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE,
    });

    new CfnOutput(this, 'certChainSecretBenchmark', {
      value: certChainSecret.secretArn,
      exportName: CIConfigStackBenchmark.CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE,
    });

    new CfnOutput(this, 'privateKeySecretBenchmark', {
      value: privateKeySecret.secretArn,
      exportName: CIConfigStackBenchmark.PRIVATE_KEY_SECRET_EXPORT_VALUE,
    });

    new CfnOutput(this, 'redirectUrlSecretBenchmark', {
      value: redirectUrlSecret.secretArn,
      exportName: CIConfigStackBenchmark.REDIRECT_URL_SECRET_EXPORT_VALUE,
    });

    new CfnOutput(this, 'OIDCConfigValuesSecretBenchmark', {
      value: OIDCConfigValuesSecret.secretArn,
      exportName: CIConfigStackBenchmark.OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE,
    });

    new CfnOutput(this, 'cascSecretValueBenchmark', {
      value: CascReloadTokenValuesSecret.secretArn,
      exportName: CIConfigStackBenchmark.CASC_RELOAD_TOKEN_SECRET_EXPORT_VALUE,
    });
  }
}
