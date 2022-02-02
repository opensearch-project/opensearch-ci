/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  FlowLogDestination,
  FlowLogTrafficType,
  Vpc,
} from '@aws-cdk/aws-ec2';
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
import { CloudAgentNodeConfig } from './compute/agent-node-config';

export interface CIStackProps extends StackProps {
  /** Should the Jenkins use https  */
  useSsl?: boolean;
  /** Should an OIDC provider be installed on Jenkins. */
  runWithOidc?: boolean;
  /** Additional verification during deployment and resource startup. */
  strictMode?: boolean;
}

export class CIStack extends Stack {
  constructor(scope: Construct, id: string, props?: CIStackProps) {
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

    const useSslParameter = `${props?.useSsl ?? this.node.tryGetContext('useSsl')}`;
    if (useSslParameter !== 'true' && useSslParameter !== 'false') {
      throw new Error('useSsl parameter is required to be set as - true or false');
    }

    const useSsl = useSslParameter === 'true';

    const runWithOidcParameter = `${props?.runWithOidc ?? this.node.tryGetContext('runWithOidc')}`;
    if (runWithOidcParameter !== 'true' && runWithOidcParameter !== 'false') {
      throw new Error('runWithOidc parameter is required to be set as - true or false');
    }

    const runWithOidc = runWithOidcParameter === 'true';

    // Setting CfnParameters to recorded the value in cloudFormation
    new CfnParameter(this, 'runWithOidc', {
      description: 'If the jenkins instance should use OIDC + federate',
      default: runWithOidc,
    });

    // Setting CfnParameters to record the value in cloudFormation
    new CfnParameter(this, 'useSsl', {
      description: 'If the jenkins instance should be access via SSL',
      default: useSsl,
    });

    const securityGroups = new JenkinsSecurityGroups(this, vpc, useSsl);
    const importedContentsSecretBucketValue = Fn.importValue(`${CIConfigStack.CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE}`);
    const importedContentsChainBucketValue = Fn.importValue(`${CIConfigStack.CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE}`);
    const importedCertSecretBucketValue = Fn.importValue(`${CIConfigStack.PRIVATE_KEY_SECRET_EXPORT_VALUE}`);
    const importedArnSecretBucketValue = Fn.importValue(`${CIConfigStack.CERTIFICATE_ARN_SECRET_EXPORT_VALUE}`);
    const importedRedirectUrlSecretBucketValue = Fn.importValue(`${CIConfigStack.REDIRECT_URL_SECRET_EXPORT_VALUE}`);
    const importedOidcConfigValuesSecretBucketValue = Fn.importValue(`${CIConfigStack.OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE}`);
    const certificateArn = Secret.fromSecretCompleteArn(this, 'certificateArn', importedArnSecretBucketValue.toString());
    const listenerCertificate = ListenerCertificate.fromArn(certificateArn.secretValue.toString());
    const agentNodesConfig = new CloudAgentNodeConfig(this);

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
      failOnCloudInitError: props?.strictMode,
    },
    {
      agentNodeSecurityGroup: securityGroups.agentNodeSG.securityGroupId,
      subnetId: vpc.publicSubnets[0].subnetId,
    },
    agentNodesConfig);

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
