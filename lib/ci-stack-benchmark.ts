/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { CfnOutput, CfnParameter, Fn, Stack, StackProps } from 'aws-cdk-lib';
import {
  IPeer, Peer, Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationTargetGroup,
  ListenerCertificate, Protocol, ListenerCondition, ApplicationListener,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { CIConfigStackBenchmark } from './ci-config-stack-benchmark';
import { AgentNodeProps } from './compute/agent-node-config';
import { AgentNodesBenchmark } from './compute/agent-nodes-benchmark';
import { JenkinsMainNodeBenchmark } from './compute/jenkins-main-node-benchmark';
import { RunAdditionalCommands } from './compute/run-additional-commands';
import { JenkinsMonitoringBenchmark } from './monitoring/ci-alarms-benchmark';
import { JenkinsSecurityGroups } from './security/ci-security-groups';

export interface CIStackPropsBenchmark extends StackProps {
  /** Should the Jenkins use https  */
  readonly useSsl?: boolean;
  /** Should an OIDC provider be installed on Jenkins. */
  readonly runWithOidc?: boolean;
  /** Restrict jenkins access to */
  readonly restrictServerAccessTo?: IPeer;
  /** Additional verification during deployment and resource startup. */
  readonly ignoreResourcesFailures?: boolean;
  /** Users with admin access during initial deployment */
  readonly adminUsers?: string[];
  /** Additional logic that needs to be run on Master Node. The value has to be path to a file */
  readonly additionalCommands?: string;
  /** Do you want to retain jenkins jobs and build history */
  readonly dataRetention?: boolean;
  /** IAM role ARN to be assumed by jenkins agent nodes eg: cross-account */
  readonly agentAssumeRole?: string[];
  /** File path containing global environment variables to be added to jenkins enviornment */
  readonly envVarsFilePath?: string;
  /** Add Mac agent to jenkins */
  readonly macAgent?: boolean;
  /** Enable views on jenkins UI */
  readonly enableViews?: boolean;
  /** Use Production Agents */
  readonly useProdAgents?: boolean;
}

function getServerAccess(serverAccessType: string, restrictServerAccessTo: string) : IPeer {
  if (typeof restrictServerAccessTo === 'undefined') {
    throw new Error('restrictServerAccessTo should be specified');
  }
  switch (serverAccessType) {
  case 'ipv4':
    return restrictServerAccessTo === 'all' ? Peer.anyIpv4() : Peer.ipv4(restrictServerAccessTo);
  case 'ipv6':
    return restrictServerAccessTo === 'all' ? Peer.anyIpv6() : Peer.ipv6(restrictServerAccessTo);
  case 'prefixList':
    return Peer.prefixList(restrictServerAccessTo);
  case 'securityGroupId':
    return Peer.securityGroupId(restrictServerAccessTo);
  default:
    throw new Error('serverAccessType should be one of the below values: ipv4, ipv6, prefixList or  securityGroupId');
  }
}

export class CIStackBenchmark extends Stack {
  public readonly monitoring: JenkinsMonitoringBenchmark;

  public readonly agentNodesBenchmark: AgentNodeProps[];

  public readonly securityGroups: JenkinsSecurityGroups;

  constructor(scope: Construct, id: string, props: CIStackPropsBenchmark) {
    // @ts-ignore
    super(scope, id, props);
    const accessPort = props.useSsl ? 443 : 80;
    // @ts-ignore
    const vpcId = Fn.importValue('CIstackVPCId');
    const vpc = Vpc.fromVpcAttributes(this, 'VPC', {
      availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
      vpcCidrBlock: '10.0.0.0/16',
      privateSubnetIds: [
        Fn.importValue('CIstackVPCPrivateSubnets-0'),
        Fn.importValue('CIstackVPCPrivateSubnets-1'),
        Fn.importValue('CIstackVPCPrivateSubnets-2'),
      ],
      publicSubnetIds: [
        Fn.importValue('CIstackVPCPublicSubnets-0'),
        Fn.importValue('CIstackVPCPublicSubnets-1'),
        Fn.importValue('CIstackVPCPublicSubnets-2'),
      ],
      vpcId,
    });

    const listenerArn = Fn.importValue('ALBListenerArn');

    const macAgentParameter = `${props?.macAgent ?? this.node.tryGetContext('macAgent')}`;

    const useSslParameter = `${props?.useSsl ?? this.node.tryGetContext('useSsl')}`;
    if (useSslParameter !== 'true' && useSslParameter !== 'false') {
      throw new Error('useSsl parameter is required to be set as - true or false');
    }

    const useSsl = useSslParameter === 'true';

    const runWithOidcParameter = `${props?.runWithOidc ?? this.node.tryGetContext('runWithOidc')}`;
    if (runWithOidcParameter !== 'true' && runWithOidcParameter !== 'false') {
      throw new Error('runWithOidc parameter is required to be set as - true or false');
    }

    let useProdAgents = `${props?.useProdAgents ?? this.node.tryGetContext('useProdAgents')}`;
    if (useProdAgents.toString() === 'undefined') {
      useProdAgents = 'false';
    }

    const runWithOidc = runWithOidcParameter === 'true';

    const serverAccessType = this.node.tryGetContext('serverAccessType');
    const restrictServerAccessTo = this.node.tryGetContext('restrictServerAccessTo');
    const serverAcess = props?.restrictServerAccessTo ?? getServerAccess(serverAccessType, restrictServerAccessTo);
    if (!serverAcess) {
      throw new Error('serverAccessType and restrictServerAccessTo parameters are required - eg: serverAccessType=ipv4 restrictServerAccessTo=10.10.10.10/32');
    }

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

    this.securityGroups = new JenkinsSecurityGroups(this, vpc, useSsl, serverAcess, 'benchmarkCI');
    const importedContentsSecretBucketValue = Fn.importValue(`${CIConfigStackBenchmark.CERTIFICATE_CONTENTS_SECRET_EXPORT_VALUE}`);
    const importedContentsChainBucketValue = Fn.importValue(`${CIConfigStackBenchmark.CERTIFICATE_CHAIN_SECRET_EXPORT_VALUE}`);
    const importedCertSecretBucketValue = Fn.importValue(`${CIConfigStackBenchmark.PRIVATE_KEY_SECRET_EXPORT_VALUE}`);
    const importedArnSecretBucketValue = Fn.importValue(`${CIConfigStackBenchmark.CERTIFICATE_ARN_SECRET_EXPORT_VALUE}`);
    const importedRedirectUrlSecretBucketValue = Fn.importValue(`${CIConfigStackBenchmark.REDIRECT_URL_SECRET_EXPORT_VALUE}`);
    const importedOidcConfigValuesSecretBucketValue = Fn.importValue(`${CIConfigStackBenchmark.OIDC_CONFIGURATION_VALUE_SECRET_EXPORT_VALUE}`);
    const certificateArn = Secret.fromSecretCompleteArn(this, 'certificateArn', importedArnSecretBucketValue.toString());
    const importedReloadPasswordSecretsArn = Fn.importValue(`${CIConfigStackBenchmark.CASC_RELOAD_TOKEN_SECRET_EXPORT_VALUE}`);
    const listenerCertificate = ListenerCertificate.fromArn(certificateArn.secretValue.toString());

    // @ts-ignore
    const agentNodeBenchmark = new AgentNodesBenchmark(this);
    if (useProdAgents.toString() === 'true') {
      // eslint-disable-next-line no-console
      console.warn('Please note that if you have decided to use the provided production jenkins agents then '
        + 'please make sure that you are deploying the stack in US-EAST-1 region as the AMIs used are only publicly '
        + 'available in US-EAST-1 region. '
        + 'If you want to deploy the stack in another region then please make sure you copy the public AMIs used '
        + 'from us-east-1 region to your region of choice and update the ami-id in agent-nodes.ts file accordingly. '
        + 'If you do not copy the AMI in required region and update the code then the jenkins agents will not spin up.');

      this.agentNodesBenchmark = [
        agentNodeBenchmark.AL2023_X64,
        agentNodeBenchmark.AL2_X64_DOCKER_HOST,
        agentNodeBenchmark.AL2023_X64_DOCKER_HOST,
        agentNodeBenchmark.AL2023_ARM64,
        agentNodeBenchmark.AL2_ARM64_DOCKER_HOST,
        agentNodeBenchmark.AL2023_ARM64_DOCKER_HOST,
        agentNodeBenchmark.AL2023_X64_BENCHMARK_TEST,
        agentNodeBenchmark.UBUNTU2004_X64_GRADLE_CHECK,
        agentNodeBenchmark.UBUNTU2004_X64_DOCKER_BUILDER,
        agentNodeBenchmark.MACOS12_X64_MULTI_HOST,
        agentNodeBenchmark.WINDOWS2019_X64_DOCKER_HOST,
        agentNodeBenchmark.WINDOWS2019_X64_DOCKER_BUILDER,
        agentNodeBenchmark.WINDOWS2019_X64_GRADLE_CHECK,
      ];
    } else {
      this.agentNodesBenchmark = [agentNodeBenchmark.AL2_X64_DEFAULT_AGENT, agentNodeBenchmark.AL2_ARM64_DEFAULT_AGENT];
    }

    // @ts-ignore
    const mainJenkinsNodeBenchmark = new JenkinsMainNodeBenchmark(this, {
      vpc,
      sg: this.securityGroups.mainNodeSG,
      efsSG: this.securityGroups.efsSG,
      dataRetention: props.dataRetention ?? false,
      envVarsFilePath: props.envVarsFilePath ?? '',
      enableViews: props.enableViews ?? false,
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
      agentNodeSecurityGroup: this.securityGroups.agentNodeSG.securityGroupId,
      subnetId: vpc.privateSubnets[0].subnetId,
    }, this.agentNodesBenchmark, macAgentParameter.toString(), props?.agentAssumeRole);

    const targetGroupBenchmark = new ApplicationTargetGroup(this, 'MainJenkinsNodeTargetBenchmark', {
      port: accessPort,
      vpc,
      targets: [mainJenkinsNodeBenchmark.mainNodeBenchAsg],
      healthCheck: {
        protocol: props.useSsl ? Protocol.HTTPS : Protocol.HTTP,
        path: '/benchmark/',
      },
    });

    const existingListener = ApplicationListener.fromApplicationListenerAttributes(this, 'ALB listener', {
      listenerArn,
      securityGroup: this.securityGroups.mainNodeSG,
    });

    existingListener.addTargetGroups('targetGroupBenchmark', {
      priority: 1,
      conditions: [ListenerCondition.pathPatterns(['/benchmark*'])],
      targetGroups: [targetGroupBenchmark],
    });

    const artifactBucket = new Bucket(this, 'BuildBucketBenchmark');

    // @ts-ignore
    this.monitoring = new JenkinsMonitoringBenchmark(this, mainJenkinsNodeBenchmark);

    if (additionalCommandsContext.toString() !== 'undefined') {
      // @ts-ignore
      new RunAdditionalCommands(this, additionalCommandsContext.toString());
    }

    new CfnOutput(this, 'Artifact Bucket Arn Benchmark', {
      value: artifactBucket.bucketArn.toString(),
      exportName: 'buildBucketArnBenchmark',
    });
  }
}
