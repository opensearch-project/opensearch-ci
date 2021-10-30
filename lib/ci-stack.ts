/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { FlowLogDestination, FlowLogTrafficType, Vpc } from '@aws-cdk/aws-ec2';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import {
  CfnParameter, Construct, Fn, Stack, StackProps,
} from '@aws-cdk/core';
import { ListenerCertificate } from '@aws-cdk/aws-elasticloadbalancingv2';
import { CIConfigStack } from './ci-config-stack';
import { JenkinsMainNode } from './compute/jenkins-main-node';
import { JenkinsMonitoring } from './monitoring/ci-alarms';
import { JenkinsExternalLoadBalancer } from './network/ci-external-load-balancer';
import { JenkinsSecurityGroups } from './security/ci-security-groups';
import { CiAuditLogging } from './auditing/ci-audit-logging';

export class CIStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const auditloggingS3Bucket = new CiAuditLogging(this);
    const vpc = new Vpc(this, 'JenkinsVPC', {
      flowLogs: {
        s3: {
          destination: FlowLogDestination.toS3(auditloggingS3Bucket.bucket, 'vpcFlowLogs'),
          trafficType: FlowLogTrafficType.ALL,
        },
      },
    });

    const useSslParameter = new CfnParameter(this, 'useSsl', {
      description: 'If the jenkins instance should be access via SSL',
      allowedValues: ['true', 'false'],

    });

    const runWithOidcParameter = new CfnParameter(this, 'runWithOidc', {
      description: 'If the jenkins instance should use OIDC + federate',
      allowedValues: ['true', 'false'],
    });

    const useSsl = useSslParameter.valueAsString === 'true';
    const runWithOidc = runWithOidcParameter.valueAsString === 'true';

    const securityGroups = new JenkinsSecurityGroups(this, vpc, useSsl);

    const importedContentsSecretBucketValue = Fn.importValue(`${CIConfigStack.CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE}`);
    const importedContentsChainBucketValue = Fn.importValue(`${CIConfigStack.CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE}`);
    const importedCertSecretBucketValue = Fn.importValue(`${CIConfigStack.PRIVATE_KEY_SECRET_EXPORT_VALUE}`);
    const importedArnSecretBucketValue = Fn.importValue(`${CIConfigStack.CERTIFICATE_ARN_SECRET_EXPORT_VALUE}`);
    const importedRedirectUrlSecretBucketValue = Fn.importValue(`${CIConfigStack.REDIRECT_URL_SECRET_EXPORT_VALUE}`);
    const importedOidcConfigValuesSecretBucketValue = Fn.importValue(`${CIConfigStack.OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE}`);
    const certificateArn = Secret.fromSecretCompleteArn(this, 'certificateArn', importedArnSecretBucketValue.toString());
    const listenerCertificate = ListenerCertificate.fromArn(certificateArn.secretValue.toString());

    const mainJenkinsNode = new JenkinsMainNode(this, {
      vpc,
      sg: securityGroups.mainNodeSG,
      sslCertContentsArn: importedContentsSecretBucketValue.toString(),
      sslCertChainArn: importedContentsChainBucketValue.toString(),
      sslCertPrivateKeyContentsArn: importedCertSecretBucketValue.toString(),
      redirectUrlArn: importedRedirectUrlSecretBucketValue.toString(),
      oidcCredArn: importedOidcConfigValuesSecretBucketValue.toString(),
      useSsl,
      runWithOidc,
    });

    const externalLoadBalancer = new JenkinsExternalLoadBalancer(this, {
      vpc,
      sg: securityGroups.externalAccessSG,
      targetInstance: mainJenkinsNode.ec2Instance,
      listenerCertificate,
      useSsl,
    });

    const monitoring = new JenkinsMonitoring(this, externalLoadBalancer, mainJenkinsNode);
  }
}
