/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  CfnOutput, Fn, Stack, Tags,
} from 'aws-cdk-lib';
import {
  CfnInstanceProfile, Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { CfnKeyPair } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { JenkinsMainNode } from './jenkins-main-node';

export interface AgentNodeProps {
  agentType: string;
  amiId: string;
  instanceType: string;
  customDeviceMapping: string;
  workerLabelString: string;
  remoteUser: string;
  maxTotalUses: number;
  minimumNumberOfSpareInstances: number;
  numExecutors: number;
  initScript: string;
  remoteFs: string;
}
export interface AgentNodeNetworkProps {
  readonly agentNodeSecurityGroup: string;
  readonly subnetId: string;
}

export class AgentNodeConfig {
  public readonly AgentNodeInstanceProfileArn: string;

  public readonly STACKREGION: string;

  public readonly ACCOUNT: string;

  public readonly SSHEC2KeySecretId: string;

  constructor(stack: Stack, assumeRole?: string[]) {
    this.STACKREGION = stack.region;
    this.ACCOUNT = stack.account;

    const key = new CfnKeyPair(stack, 'AgentNode-KeyPair', {
      keyName: 'AgentNodeKeyPair',
      tags: [
        {
          key: 'jenkins:credentials:type',
          value: 'sshUserPrivateKey',
        },
      ],
    });

    // Create a secret for storing the actaul value of key-pair so that jenkins secret-manager plugin is able to fetch it
    const keyPairSecret = new Secret(stack, 'AgentNodeKeyPair', {
      secretName: 'jenkins-agent-node-key-pair',
      description: 'ssh key for jenkins main node to connect to agent nodes',
    });
    Tags.of(keyPairSecret).add('jenkins:credentials:type', 'sshUserPrivateKey');
    Tags.of(keyPairSecret).add('jenkins:credentials:username', 'ec2-user');

    const AgentNodeRole = new Role(stack, 'OpenSearch-CI-AgentNodeRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      // assumedBy: new AccountPrincipal(this.ACCOUNT),
      description: 'Jenkins agents Node Role',
      roleName: 'OpenSearch-CI-AgentNodeRole',
    });

    const ecrManagedPolicy = new ManagedPolicy(stack, 'OpenSearch-CI-AgentNodePolicy', {
      description: 'Jenkins agents Node Policy',
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'ecr-public:BatchCheckLayerAvailability',
            'ecr-public:GetRepositoryPolicy',
            'ecr-public:DescribeRepositories',
            'ecr-public:DescribeRegistries',
            'ecr-public:DescribeImages',
            'ecr-public:DescribeImageTags',
            'ecr-public:GetRepositoryCatalogData',
            'ecr-public:GetRegistryCatalogData',
            'ecr-public:InitiateLayerUpload',
            'ecr-public:UploadLayerPart',
            'ecr-public:CompleteLayerUpload',
            'ecr-public:PutImage',
          ],
          resources: [`arn:aws:ecr-public::${this.ACCOUNT}:repository/*`],
          conditions: {
            StringEquals: {
              'aws:RequestedRegion': this.STACKREGION,
              'aws:PrincipalAccount': [this.ACCOUNT],
            },
          },
        }),
      ],
      roles: [AgentNodeRole],
    });
    ecrManagedPolicy.addStatements(
      new PolicyStatement({
        actions: [
          'ecr-public:GetAuthorizationToken',
          'sts:GetServiceBearerToken',
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'aws:RequestedRegion': this.STACKREGION,
            'aws:PrincipalAccount': [this.ACCOUNT],
          },
        },
      }),
    );

    /* eslint-disable eqeqeq */
    if (assumeRole) {
      // policy to allow assume role AssumeRole
      AgentNodeRole.addToPolicy(
        new PolicyStatement({
          resources: assumeRole,
          actions: ['sts:AssumeRole'],
        }),
      );
    }
    AgentNodeRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
    const AgentNodeInstanceProfile = new CfnInstanceProfile(stack, 'JenkinsAgentNodeInstanceProfile', { roles: [AgentNodeRole.roleName] });
    this.AgentNodeInstanceProfileArn = AgentNodeInstanceProfile.attrArn.toString();
    this.SSHEC2KeySecretId = 'jenkins-agent-node-key-pair';

    new CfnOutput(stack, 'Jenkins Agent Node Role Arn', {
      value: `${AgentNodeRole.roleArn}`,
      exportName: 'agentNodeRoleArn',
    });
  }

  public addAgentConfigToJenkinsYaml(stack: Stack, templates: AgentNodeProps[], props: AgentNodeNetworkProps, macAgent: string): any {
    const jenkinsYaml: any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
    const configTemplates: any = [];

    templates.forEach((element) => {
      if (element.agentType == 'unix') {
        configTemplates.push(this.getUnixTemplate(stack, element, props));
      } else if (element.agentType == 'mac' && macAgent == 'true') {
        configTemplates.push(this.getMacTemplate(stack, element, props));
      } else if (element.agentType == 'windows') {
        configTemplates.push(this.getWindowsTemplate(stack, element, props));
      }
    });

    const agentNodeYamlConfig = [{
      amazonEC2: {
        name: 'Amazon_ec2_cloud',
        region: this.STACKREGION,
        sshKeysCredentialsId: this.SSHEC2KeySecretId,
        templates: configTemplates,
        useInstanceProfileForCredentials: true,
      },
    }];
    jenkinsYaml.jenkins.clouds = agentNodeYamlConfig;
    return jenkinsYaml;
  }

  private getUnixTemplate(stack: Stack, config: AgentNodeProps, props: AgentNodeNetworkProps): { [x: string]: any; } {
    return {
      ami: config.amiId,
      amiType:
        { unixData: { sshPort: '22' } },
      associatePublicIp: false,
      connectBySSHProcess: false,
      connectionStrategy: 'PRIVATE_IP',
      customDeviceMapping: config.customDeviceMapping,
      deleteRootOnTermination: true,
      description: `jenkinsAgentNode-${config.workerLabelString}`,
      ebsEncryptRootVolume: 'ENCRYPTED',
      ebsOptimized: false,
      metadataTokensRequired: true,
      metadataHopsLimit: '2',
      hostKeyVerificationStrategy: 'OFF',
      iamInstanceProfile: this.AgentNodeInstanceProfileArn,
      idleTerminationMinutes: '60',
      initScript: config.initScript,
      labelString: config.workerLabelString,
      launchTimeoutStr: '300',
      maxTotalUses: config.maxTotalUses,
      minimumNumberOfInstances: 0,
      minimumNumberOfSpareInstances: config.minimumNumberOfSpareInstances,
      mode: 'EXCLUSIVE',
      monitoring: true,
      numExecutors: config.numExecutors,
      remoteAdmin: config.remoteUser,
      remoteFS: config.remoteFs,
      securityGroups: props.agentNodeSecurityGroup,
      stopOnTerminate: false,
      subnetId: props.subnetId,
      t2Unlimited: false,
      tags: [{
        name: 'Name',
        value: `${stack.stackName}/AgentNode/${config.workerLabelString}`,
      },
      {
        name: 'type',
        value: `jenkinsAgentNode-${config.workerLabelString}`,
      },
      ],
      tenancy: 'Default',
      type: config.instanceType,
      nodeProperties: [
        {
          envVars: {
            env: [
              {
                key: 'JENKINS_HOME_PATH',
                value: config.remoteFs,
              },
              {
                key: 'JAVA8_HOME',
                value: '/usr/lib/jvm/temurin-8-jdk-amd64',
              },
              {
                key: 'JAVA11_HOME',
                value: '/usr/lib/jvm/temurin-11-jdk-amd64',
              },
              {
                key: 'JAVA14_HOME',
                value: '/usr/lib/jvm/adoptopenjdk-14-amd64',
              },
              {
                key: 'JAVA17_HOME',
                value: '/usr/lib/jvm/temurin-17-jdk-amd64',
              },
              {
                key: 'JAVA19_HOME',
                value: '/usr/lib/jvm/temurin-19-jdk-amd64',
              },
              {
                key: 'JAVA20_HOME',
                value: '/usr/lib/jvm/temurin-20-jdk-amd64',
              },
              {
                key: 'JAVA21_HOME',
                value: '/usr/lib/jvm/temurin-21-jdk-amd64',
              },
            ],
          },
        },
      ],
      useEphemeralDevices: false,
    };
  }

  private getMacTemplate(stack: Stack, config: AgentNodeProps, props: AgentNodeNetworkProps): { [x: string]: any; } {
    return {
      ami: config.amiId,
      amiType:
        { macData: { sshPort: '22' } },
      associatePublicIp: false,
      connectBySSHProcess: false,
      connectionStrategy: 'PRIVATE_IP',
      customDeviceMapping: config.customDeviceMapping,
      deleteRootOnTermination: true,
      description: `jenkinsAgentNode-${config.workerLabelString}`,
      ebsEncryptRootVolume: 'ENCRYPTED',
      ebsOptimized: true,
      metadataTokensRequired: true,
      metadataHopsLimit: '2',
      hostKeyVerificationStrategy: 'OFF',
      iamInstanceProfile: this.AgentNodeInstanceProfileArn,
      idleTerminationMinutes: '720',
      labelString: config.workerLabelString,
      launchTimeoutStr: '1000',
      initScript: config.initScript,
      maxTotalUses: config.maxTotalUses,
      minimumNumberOfInstances: 1,
      minimumNumberOfSpareInstances: config.minimumNumberOfSpareInstances,
      mode: 'EXCLUSIVE',
      monitoring: true,
      numExecutors: config.numExecutors,
      remoteAdmin: config.remoteUser,
      remoteFS: config.remoteFs,
      securityGroups: props.agentNodeSecurityGroup,
      stopOnTerminate: false,
      subnetId: props.subnetId,
      t2Unlimited: false,
      tags: [
        {
          name: 'Name',
          value: `${stack.stackName}/AgentNode/${config.workerLabelString}`,
        },
        {
          name: 'type',
          value: `jenkinsAgentNode-${config.workerLabelString}`,
        },
      ],
      tenancy: 'Host',
      type: config.instanceType,
      nodeProperties: [
        {
          envVars: {
            env: [
              {
                key: 'JENKINS_HOME_PATH',
                value: config.remoteFs,
              },
            ],
          },
        },
      ],
      useEphemeralDevices: false,
    };
  }

  private getWindowsTemplate(stack: Stack, config: AgentNodeProps, props: AgentNodeNetworkProps): { [x: string]: any; } {
    return {
      ami: config.amiId,
      amiType:
         {
           windowsData: {
             allowSelfSignedCertificate: false, bootDelay: '7.5', specifyPassword: false, useHTTPS: false,
           },
         },
      associatePublicIp: false,
      connectBySSHProcess: false,
      connectionStrategy: 'PRIVATE_IP',
      customDeviceMapping: config.customDeviceMapping,
      deleteRootOnTermination: true,
      description: `jenkinsAgentNode-${config.workerLabelString}`,
      ebsEncryptRootVolume: 'ENCRYPTED',
      ebsOptimized: true,
      metadataTokensRequired: true,
      metadataHopsLimit: '2',
      hostKeyVerificationStrategy: 'OFF',
      iamInstanceProfile: this.AgentNodeInstanceProfileArn,
      idleTerminationMinutes: '120',
      initScript: config.initScript,
      labelString: config.workerLabelString,
      launchTimeoutStr: '1200',
      maxTotalUses: config.maxTotalUses,
      minimumNumberOfInstances: 0,
      minimumNumberOfSpareInstances: config.minimumNumberOfSpareInstances,
      mode: 'EXCLUSIVE',
      monitoring: true,
      numExecutors: config.numExecutors,
      remoteAdmin: config.remoteUser,
      remoteFS: config.remoteFs,
      securityGroups: props.agentNodeSecurityGroup,
      stopOnTerminate: false,
      subnetId: props.subnetId,
      t2Unlimited: false,
      tags: [{
        name: 'Name',
        value: `${stack.stackName}/AgentNode/${config.workerLabelString}`,
      },
      {
        name: 'type',
        value: `jenkinsAgentNode-${config.workerLabelString}`,
      },
      ],
      tenancy: 'Default',
      type: config.instanceType,
      nodeProperties: [
        {
          envVars: {
            env: [
              {
                key: 'JENKINS_HOME_PATH',
                value: config.remoteFs,
              },
            ],
          },
        },
      ],
      useEphemeralDevices: false,
    };
  }
}
