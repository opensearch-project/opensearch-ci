/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  Role, ManagedPolicy, PolicyStatement, Effect, CfnInstanceProfile, ServicePrincipal,
} from '@aws-cdk/aws-iam';
import {
  Fn, Stack, Tags, CfnOutput,
} from '@aws-cdk/core';
import { KeyPair } from 'cdk-ec2-key-pair';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { JenkinsMainNode } from './jenkins-main-node';

export interface AgentNodeProps {
   amiId: string;
   instanceType: string;
   workerLabelString: string;
   remoteUser: string;
   maxTotalUses: number;
   numExecutors: number;
   initScript: string
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

   constructor(stack: Stack, assumeRole: string) {
     this.STACKREGION = stack.region;
     this.ACCOUNT = stack.account;

     const key = new KeyPair(stack, 'AgentNode-KeyPair', {
       name: 'AgentNodeKeyPair',
       description: 'KeyPair used by Jenkins Main Node to SSH into Agent Nodes',
     });
     Tags.of(key)
       .add('jenkins:credentials:type', 'sshUserPrivateKey');
     const AgentNodeRole = new Role(stack, 'OpenSearch-CI-AgentNodeRole', {
       assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
       // assumedBy: new AccountPrincipal(this.ACCOUNT),
       description: 'Jenkins agents Node Role',
       roleName: 'OpenSearch-CI-AgentNodeRole',
     });

     const ecrManagedPolicy = new ManagedPolicy(stack, 'OpenSearch-CI-AgentNodePolicy', {
       description: 'Jenkins agents Node Policy',
       managedPolicyName: 'OpenSearch-CI-AgentNodePolicy',
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
     if (assumeRole.toString() !== 'undefined') {
       // policy to allow assume role AssumeRole
       AgentNodeRole.addToPolicy(
         new PolicyStatement({
           resources: [assumeRole],
           actions: ['sts:AssumeRole'],
         }),
       );
     }
     AgentNodeRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
     const AgentNodeInstanceProfile = new CfnInstanceProfile(stack, 'JenkinsAgentNodeInstanceProfile', { roles: [AgentNodeRole.roleName] });
     this.AgentNodeInstanceProfileArn = AgentNodeInstanceProfile.attrArn.toString();
     this.SSHEC2KeySecretId = Fn.join('/', ['ec2-ssh-key', key.keyPairName.toString(), 'private']);

     new CfnOutput(stack, 'Jenkins Agent Node Role Arn', {
       value: `${AgentNodeRole.roleArn}`,
       exportName: 'agentNodeRoleArn',
     });
   }

   public addAgentConfigToJenkinsYaml(stack: Stack, templates: AgentNodeProps[], props: AgentNodeNetworkProps, macAgent: string): any {
     const jenkinsYaml: any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
     const configTemplates: any = [];

     templates.forEach((element) => {
       configTemplates.push(this.getTemplate(stack, element, props));
     });
     if (macAgent == 'true') {
       configTemplates.push(this.getMacTemplate(stack, props));
     }

     const agentNodeYamlConfig = [{
       amazonEC2: {
         cloudName: 'Amazon_ec2_cloud',
         region: this.STACKREGION,
         sshKeysCredentialsId: this.SSHEC2KeySecretId,
         templates: configTemplates,
         useInstanceProfileForCredentials: true,
       },
     }];
     jenkinsYaml.jenkins.clouds = agentNodeYamlConfig;
     return jenkinsYaml;
   }

   private getTemplate(stack: Stack, config: AgentNodeProps, props: AgentNodeNetworkProps): { [x: string]: any; } {
     return {
       ami: config.amiId,
       amiType:
         { unixData: { sshPort: '22' } },
       associatePublicIp: false,
       connectBySSHProcess: false,
       connectionStrategy: 'PRIVATE_IP',
       customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
       deleteRootOnTermination: true,
       description: `jenkinsAgentNode-${config.workerLabelString}`,
       ebsEncryptRootVolume: 'ENCRYPTED',
       ebsOptimized: false,
       hostKeyVerificationStrategy: 'OFF',
       iamInstanceProfile: this.AgentNodeInstanceProfileArn,
       idleTerminationMinutes: '60',
       initScript: config.initScript,
       labelString: config.workerLabelString,
       launchTimeoutStr: '300',
       maxTotalUses: config.maxTotalUses,
       minimumNumberOfInstances: 0,
       minimumNumberOfSpareInstances: 1,
       mode: 'EXCLUSIVE',
       monitoring: true,
       numExecutors: config.numExecutors,
       remoteAdmin: config.remoteUser,
       remoteFS: '/var/jenkins',
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
       useEphemeralDevices: false,
     };
   }

   private getMacTemplate(stack: Stack, props: AgentNodeNetworkProps): { [x: string]: any; } {
     return {
       ami: 'ami-0379811a08268a97e',
       amiType:
        { macData: { sshPort: '22' } },
       associatePublicIp: false,
       connectBySSHProcess: false,
       connectionStrategy: 'PRIVATE_IP',
       customDeviceMapping: '/dev/sda1=:300:true:gp3::encrypted',
       deleteRootOnTermination: true,
       description: 'jenkinsAgentNode-Jenkins-Agent-MacOS12-X64-Mac1Metal-Multi-Host',
       ebsEncryptRootVolume: 'ENCRYPTED',
       ebsOptimized: true,
       hostKeyVerificationStrategy: 'OFF',
       iamInstanceProfile: this.AgentNodeInstanceProfileArn,
       labelString: 'Jenkins-Agent-MacOS12-X64-Mac1Metal-Multi-Host',
       maxTotalUses: -1,
       minimumNumberOfInstances: 1,
       minimumNumberOfSpareInstances: 0,
       mode: 'EXCLUSIVE',
       monitoring: true,
       numExecutors: '6',
       remoteAdmin: 'ec2-user',
       remoteFS: '/var/jenkins',
       securityGroups: props.agentNodeSecurityGroup,
       stopOnTerminate: false,
       subnetId: props.subnetId,
       t2Unlimited: false,
       tags: [
         {
           name: 'Name',
           value: `${stack.stackName}/AgentNode/Jenkins-Agent-MacOS12-X64-Mac1Metal-Multi-Host`,
         },
         {
           name: 'type',
           value: 'jenkinsAgentNode-Jenkins-Agent-MacOS12-X64-Mac1Metal-Multi-Host',
         },
       ],
       tenancy: 'Host',
       type: 'Mac1Metal',
       nodeProperties: [
         {
           envVars: {
             env: [
               {
                 key: 'Path',
                 /* eslint-disable max-len */
                 value: '/usr/local/opt/python@3.7/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/Cellar/python@3.7/3.7.13_1/Frameworks/Python.framework/Versions/3.7/bin',
               },
             ],
           },
         },
       ],
       useEphemeralDevices: false,
     };
   }
}
