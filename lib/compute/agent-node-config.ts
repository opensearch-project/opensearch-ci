/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */


 import * as iam from '@aws-cdk/aws-iam';
 import { Fn, Stack, Tags } from '@aws-cdk/core';
 import { KeyPair } from 'cdk-ec2-key-pair';
 import { readFileSync } from 'fs';
 import { load } from 'js-yaml';
 import { JenkinsMainNode } from './jenkins-main-node';
 
 
 export interface AgentNodeProps {
   amiId: string;
   instanceType: string;
   workerLabelString: string;
   remoteUser: string;
   initScript: string
 }
 
 export interface AgentNodeNetworkProps {
   readonly agentNodeSecurityGroup: string;
   readonly subnetId: string;
 }
 
 export class AgentNodeConfig {
   public readonly AgentNodeInstanceProfileArn: string;
 
   public readonly STACKREGION: string;
 
   private readonly ACCOUNT: string;
 
   public readonly SSHEC2KeySecretId: string;
 
   constructor(stack: Stack) {
     this.STACKREGION = stack.region;
     this.ACCOUNT = stack.account;
     const key = new KeyPair(stack, 'AgentNode-KeyPair', {
       name: 'AgentNodeKeyPair',
       description: 'KeyPair used by Jenkins Main Node to SSH into Agent Nodes',
     });
     Tags.of(key)
       .add('jenkins:credentials:type', 'sshUserPrivateKey');
     const AgentNodeRole = new iam.Role(stack, 'OpenSearch-CI-AgentNodeRole', {
       assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
       //assumedBy: new iam.AccountPrincipal(this.ACCOUNT),
       description: 'Jenkins agents Node Role',
       roleName: 'OpenSearch-CI-AgentNodeRole',
     });
 
     const ecrManagedPolicy = new iam.ManagedPolicy(stack, 'OpenSearch-CI-AgentNodePolicy', {
       description: 'Jenkins agents Node Policy',
       managedPolicyName: 'OpenSearch-CI-AgentNodePolicy',
       statements: [
         new iam.PolicyStatement({
           effect: iam.Effect.ALLOW,
           actions: [
             "ecr-public:BatchCheckLayerAvailability",
             "ecr-public:GetRepositoryPolicy",
             "ecr-public:DescribeRepositories",
             "ecr-public:DescribeRegistries",
             "ecr-public:DescribeImages",
             "ecr-public:DescribeImageTags",
             "ecr-public:GetRepositoryCatalogData",
             "ecr-public:GetRegistryCatalogData",
             "ecr-public:InitiateLayerUpload",
             "ecr-public:UploadLayerPart",
             "ecr-public:CompleteLayerUpload",
             "ecr-public:PutImage",
           ],
           resources: ['arn:aws:ecr-public::'+this.ACCOUNT+':repository/*'],
           conditions: {
            'StringEquals': {
              'aws:RequestedRegion': this.STACKREGION,
              'aws:PrincipalAccount': [this.ACCOUNT],
            },
          },
         }),
       ],
       roles: [AgentNodeRole],
     });
     ecrManagedPolicy.addStatements(
      new iam.PolicyStatement({
        actions: [
          'ecr-public:GetAuthorizationToken',
          'sts:GetServiceBearerToken',
        ],
        resources: ['*'],
        conditions: {
          'StringEquals': {
            'aws:RequestedRegion': this.STACKREGION,
            'aws:PrincipalAccount': [this.ACCOUNT],
          },
        },
      }),
    );
     const AgentNodeInstanceProfile = new iam.CfnInstanceProfile(stack, 'JenkinsAgentNodeInstanceProfile', { roles: [AgentNodeRole.roleName] });
     this.AgentNodeInstanceProfileArn = AgentNodeInstanceProfile.attrArn.toString();
     this.SSHEC2KeySecretId = Fn.join('/', ['ec2-ssh-key', key.keyPairName.toString(), 'private']);
   }
 
   public addAgentConfigToJenkinsYaml(templates: AgentNodeProps[], props: AgentNodeNetworkProps): any {
     const jenkinsYaml: any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
     const configTemplates: any = [];
 
     templates.forEach((element) => {
       configTemplates.push(this.getTemplate(element, props));
     });
 
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
 
   private getTemplate(config: AgentNodeProps, props: AgentNodeNetworkProps): { [x: string]: any; } {
     return {
       ami: config.amiId,
       amiType:
         { unixData: { sshPort: '22' } },
       associatePublicIp: false,
       connectBySSHProcess: false,
       connectionStrategy: 'PRIVATE_IP',
       customDeviceMapping: '/dev/xvda=:100:true:::encrypted',
       deleteRootOnTermination: true,
       description: `jenkinsAgentNode-${config.workerLabelString}`,
       ebsEncryptRootVolume: 'ENCRYPTED',
       ebsOptimized: false,
       hostKeyVerificationStrategy: 'OFF',
       iamInstanceProfile: this.AgentNodeInstanceProfileArn,
       idleTerminationMinutes: '30',
       initScript: config.initScript,
       labelString: config.workerLabelString,
       launchTimeoutStr: '300',
       maxTotalUses: -1,
       minimumNumberOfInstances: 0,
       minimumNumberOfSpareInstances: 1,
       mode: 'EXCLUSIVE',
       monitoring: true,
       numExecutors: 1,
       remoteAdmin: config.remoteUser,
       remoteFS: '/var/jenkins',
       securityGroups: props.agentNodeSecurityGroup,
       stopOnTerminate: false,
       subnetId: props.subnetId,
       t2Unlimited: false,
       tags: [{
         name: 'Name',
         value: 'OpenSearch-CI-Prod/AgentNode',
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
 }
 