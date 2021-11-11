/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { CfnInstanceProfile, ServicePrincipal, Role } from '@aws-cdk/aws-iam';
import { Fn, Stack, Tags } from '@aws-cdk/core';
import { KeyPair } from 'cdk-ec2-key-pair';
import {
  InitCommand, InitElement, InitFile, InitFileOptions,
} from '@aws-cdk/aws-ec2';

export interface AgentNodeConfig{
  amiId : string;
  ec2CloudName : string;
  instanceType : string;
  workerLabelString : string;
  numberOfExecutors : string;
  remoteUser : string;
}

export interface AgentNodeProps{
  readonly agentNodeSecurityGroup : string;
  readonly subnetId : string;
}

export class AgentNode {
  public readonly AgentNodeInstanceProfileArn: string;

  public readonly SSHEC2KeySecretId: string;

  public readonly InitScript: string = 'sudo mkdir -p /var/jenkins/ && sudo chown -R ec2-user:ec2-user /var/jenkins '
    + '&& sudo yum install -y java-1.8.0-openjdk cmake python3 python3-pip && sudo yum groupinstall -y \'Development Tools\' '
    + '&& sudo ln -sfn `which pip3` /usr/bin/pip && pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin';

  constructor(stack: Stack) {
    const key = new KeyPair(stack, 'AgentNode-KeyPair', {
      name: 'AgentNodeKeyPair',
      description: 'KeyPair used by Jenkins Main Node to SSH into Agent Nodes',
    });
    Tags.of(key)
      .add('jenkins:credentials:type', 'sshUserPrivateKey');
    const AgentNodeRole = new Role(stack, 'JenkinsAgentNodeRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    });
    const AgentNodeInstanceProfile = new CfnInstanceProfile(stack, 'JenkinsAgentNodeInstanceProfile', { roles: [AgentNodeRole.roleName] });
    this.AgentNodeInstanceProfileArn = AgentNodeInstanceProfile.attrArn.toString();
    this.SSHEC2KeySecretId = Fn.join('/', ['ec2-ssh-key', key.keyPairName.toString(), 'private']);
  }

  public asInitFile(filePath: string, stackConfig: AgentNodeProps, config: AgentNodeConfig, stackRegion: string, options?: InitFileOptions): InitFile {
    return InitFile.fromString(filePath,
      `
    import hudson.model.*
    import jenkins.model.*
    import hudson.plugins.ec2.*
    import com.amazonaws.services.ec2.model.InstanceType

    def instance = Jenkins.getInstance()
    def init_script = "${this.InitScript}"
    def instance_profile_arn = "${this.AgentNodeInstanceProfileArn}"
    def sshKeysASMSecretId = "${this.SSHEC2KeySecretId}"

    // Agent node configuration specific to each node
    def ec2_cloud_name = "${config.ec2CloudName}"
    def instance_type = "${config.instanceType}"
    def worker_label_string = "${config.workerLabelString}"
    def number_of_executors = "${config.numberOfExecutors}"
    def remote_user = "${config.remoteUser}"
    def ami_id = "${config.amiId}"

    // Values that are imported from the stack
    def region = "${stackRegion}"
    def security_group = "${stackConfig.agentNodeSecurityGroup}"
    def subnet_id = "${stackConfig.subnetId}"
    def ec2_tags = [new EC2Tag('Name', 'jenkins-agent-node')]
    
    
    // SlaveTemplate ref: https://github.com/jenkinsci/ec2-plugin/blob/master/src/main/java/hudson/plugins/ec2/SlaveTemplate.java
    def agent_node_template = new SlaveTemplate(
      // String ami
      ami_id,
      // String zone
      '',
      // SpotConfiguration spotConfig
      null,
      // String securityGroups
      security_group,
      // String remoteFS
      '/var/jenkins',
      // InstanceType type
      InstanceType.fromValue(instance_type),
      // boolean ebsOptimized
      false,
      // String labelString
      worker_label_string,
      // Node.Mode mode
      Node.Mode.NORMAL,
      // String description
      'Jenkins Agent Node',
      // String initScript
      init_script,
      // String tmpDir
      '',
      // String userData
      '',
      // String numExecutors
      number_of_executors,
      // String remoteAdmin
      remote_user,
      // AMITypeData amiType
      new UnixData(null, null, null, null),
      // String jvmopts
      '',
      // boolean stopOnTerminate
      false,
      // String subnetId
      subnet_id,
      // List<EC2Tag> tags
      ec2_tags,
      // String idleTerminationMinutes
      '30',
      //int minimumNumberOfInstances,
      1,
      //int minimumNumberOfSpareInstances,
      1,
      // String instanceCapStr
      '20',
      // String iamInstanceProfile
      instance_profile_arn,
      //  boolean deleteRootOnTermination
      true,
      // boolean useEphemeralDevices
      false,
      // String launchTimeoutStr
      '1800',
      // boolean associatePublicIp
      false,
      // String customDeviceMapping
      '/dev/xvda=:100:true:::encrypted',
      // boolean connectBySSHProcess
      false,
      // boolean monitoring,
      true,
      // boolean t2Unlimited,
      false,
      // ConnectionStrategy connectionStrategy,
      null,
      // int maxTotalUses,
      -1,
      // List<? extends NodeProperty<?>> nodeProperties,
      null,
      // HostKeyVerificationStrategyEnum hostKeyVerificationStrategy,
      HostKeyVerificationStrategyEnum.OFF,
      //Tenancy tenancy,
      Tenancy.Default,
      //EbsEncryptRootVolume ebsEncryptRootVolume,
      EbsEncryptRootVolume.ENCRYPTED,
    )
    
    // AmazonEC2Cloud ref: https://github.com/jenkinsci/ec2-plugin/blob/master/src/main/java/hudson/plugins/ec2/AmazonEC2Cloud.java
    def new_cloud = new AmazonEC2Cloud(
      // String cloudName
      ec2_cloud_name,
      // boolean useInstanceProfileForCredentials
      true,
      // String credentialsId
      '',
      // String region
      region,
      // String privateKey
      null,
      // String sshKeysCredentialsId
      sshKeysASMSecretId,
      // String instanceCapStr
      "10",
      // List<? extends SlaveTemplate> templates
      [agent_node_template],
      // String roleArn: We have instance profile with a role attached to the instance
      '',
      // String roleSessionName
      ''
    )

    instance.clouds.add(new_cloud)
    instance.save()`);
  }

  public configElements(stackRegion: string, agentNodeProps: AgentNodeProps, al2x64AgentNodeConfig: AgentNodeConfig,
    al2arm64AgentNodeConfig: AgentNodeConfig): InitElement[] {
    return [
    // Create groovy script that holds the agent Node config for EC2 plugin ref:https://gist.github.com/vrivellino/97954495938e38421ba4504049fd44ea
      this.asInitFile(`/${al2x64AgentNodeConfig.ec2CloudName}.groovy`, agentNodeProps, al2x64AgentNodeConfig, stackRegion),

      // Run the above groovy script
      // eslint-disable-next-line max-len
      InitCommand.shellCommand(`java -jar /jenkins-cli.jar -s http://localhost:8080 -auth @/var/lib/jenkins/secrets/myIdPassDefault groovy = < /${al2x64AgentNodeConfig.ec2CloudName}.groovy`),

      // Generating groovy script for arm64 Agent Node
      this.asInitFile(`/${al2arm64AgentNodeConfig.ec2CloudName}.groovy`, agentNodeProps, al2arm64AgentNodeConfig, stackRegion),

      // Run the arm64 groovy script to set up ARM64 agent
      // eslint-disable-next-line max-len
      InitCommand.shellCommand(`java -jar /jenkins-cli.jar -s http://localhost:8080 -auth @/var/lib/jenkins/secrets/myIdPassDefault groovy = < /${al2arm64AgentNodeConfig.ec2CloudName}.groovy`),
    ];
  }
}
