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
  CfnOutput,
  CfnParameter, Construct, Fn, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import { ListenerCertificate } from '@aws-cdk/aws-elasticloadbalancingv2';
import { FileSystem } from '@aws-cdk/aws-efs';
import { Bucket } from '@aws-cdk/aws-s3';
import { CIConfigStack } from './ci-config-stack';
import { JenkinsMainNode } from './compute/jenkins-main-node';
import { JenkinsMonitoring } from './monitoring/ci-alarms';
import { JenkinsExternalLoadBalancer } from './network/ci-external-load-balancer';
import { JenkinsSecurityGroups } from './security/ci-security-groups';
import { CiAuditLogging } from './auditing/ci-audit-logging';
import { AgentNodeProps } from './compute/agent-node-config';
import { AgentNodes } from './compute/agent-nodes';
import { RunAdditionalCommands } from './compute/run-additional-commands';

export interface CIStackProps extends StackProps {
  /** Should the Jenkins use https  */
  readonly useSsl?: boolean;
  /** Should an OIDC provider be installed on Jenkins. */
  readonly runWithOidc?: boolean;
  /** Additional verification during deployment and resource startup. */
  readonly ignoreResourcesFailures?: boolean;
  /** Users with admin access during initial deployment */
  readonly adminUsers?: string[];
  /** Additional logic that needs to be run on Master Node. The value has to be path to a file */
  readonly additionalCommands?: string;
  /** Do you want to retain jenkins jobs and build history */
  readonly dataRetention?: boolean;
  /** Policy for agent node role to assume a cross-account role */
  readonly agentAssumeRole?: string;
  /** File path containing global environment variables to be added to jenkins enviornment */
  readonly envVarsFilePath?: string;
}

export class CIStack extends Stack {
  public readonly monitoring: JenkinsMonitoring;

  constructor(scope: Construct, id: string, props: CIStackProps) {
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

    const agentAssumeRoleContext = `${props?.agentAssumeRole ?? this.node.tryGetContext('agentAssumeRole')}`;

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

    const additionalCommandsContext = `${props?.additionalCommands ?? this.node.tryGetContext('additionalCommands')}`;

    // Setting CfnParameters to record the value in cloudFormation
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
    const importedReloadPasswordSecretsArn = Fn.importValue(`${CIConfigStack.CASC_RELOAD_TOKEN_SECRET_EXPORT_VALUE}`);
    const listenerCertificate = ListenerCertificate.fromArn(certificateArn.secretValue.toString());
    const agentNode = new AgentNodes();
    const agentNodes: AgentNodeProps[] = [agentNode.AL2_X64, agentNode.AL2_X64_DOCKER_HOST, agentNode.AL2_X64_DOCKER_HOST_PERF_TEST,
      agentNode.AL2_ARM64, agentNode.AL2_ARM64_DOCKER_HOST, agentNode.UBUNTU_X64, agentNode.UBUNTU_X64_DOCKER_BUILDER];

    const mainJenkinsNode = new JenkinsMainNode(this, {
      vpc,
      sg: securityGroups.mainNodeSG,
      efsSG: securityGroups.efsSG,
      dataRetention: props.dataRetention ?? false,
      envVarsFilePath: props.envVarsFilePath ?? '',
      reloadPasswordSecretsArn: importedReloadPasswordSecretsArn.toString(),
      sslCertContentsArn: importedContentsSecretBucketValue.toString(),
      sslCertChainArn: importedContentsChainBucketValue.toString(),
      sslCertPrivateKeyContentsArn: importedCertSecretBucketValue.toString(),
      redirectUrlArn: importedRedirectUrlSecretBucketValue.toString(),
      oidcCredArn: importedOidcConfigValuesSecretBucketValue.toString(),
      useSsl,
      runWithOidc,
      failOnCloudInitError: props?.ignoreResourcesFailures,
      adminUsers: props?.adminUsers,
      agentNodeSecurityGroup: securityGroups.agentNodeSG.securityGroupId,
      subnetId: vpc.publicSubnets[0].subnetId,
    }, agentNodes, agentAssumeRoleContext.toString());

    const externalLoadBalancer = new JenkinsExternalLoadBalancer(this, {
      vpc,
      sg: securityGroups.externalAccessSG,
      targetInstance: mainJenkinsNode.ec2Instance,
      listenerCertificate,
      useSsl,
    });

    const artifactBucket = new Bucket(this, 'BuildBucket');

    this.monitoring = new JenkinsMonitoring(this, externalLoadBalancer, mainJenkinsNode);

    if (additionalCommandsContext.toString() !== 'undefined') {
      new RunAdditionalCommands(this, additionalCommandsContext.toString());
    }

    new CfnOutput(this, 'Artifact Bucket Arn', {
      value: artifactBucket.bucketArn.toString(),
      exportName: 'buildBucketArn',
    });
  }
}
