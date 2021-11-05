import { CfnInstanceProfile, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Fn, Stack, Tags } from '@aws-cdk/core';
import { KeyPair } from 'cdk-ec2-key-pair';
import { InitFile, InitFileOptions } from '@aws-cdk/aws-ec2';
import { AgentNodeProps } from './jenkins-main-node';

/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

export interface AgentNodeConfig{
  // eslint-disable-next-line camelcase
  ami_id : string;
  // eslint-disable-next-line camelcase
  ec2_cloud_name : string;
  // eslint-disable-next-line camelcase
  instance_type : string;
  // eslint-disable-next-line camelcase
  worker_label_string : string;
  // eslint-disable-next-line camelcase
  number_of_executors : string;
  // eslint-disable-next-line camelcase
  remote_user : string;
}
export class AgentNode {
  public readonly AgentNodeInstanceProfileArn: string;

  public readonly SSHEC2KeySecretId: string;

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

  public asInitFile(filePath: string, stackConfig: AgentNodeProps, config: AgentNodeConfig, options?: InitFileOptions): InitFile {
    return InitFile.fromString(filePath,
      `import hudson.model.*
    import jenkins.model.*
    import hudson.plugins.ec2.*
    import com.amazonaws.services.ec2.model.InstanceType

    def instance = Jenkins.getInstance()
    def init_script = 'sudo mkdir -p /var/jenkins/ && sudo chown -R ec2-user:ec2-user /var/jenkins \
    && sudo yum install -y java-1.8.0-openjdk cmake python3 python3-pip && sudo yum groupinstall -y "Development Tools" \
    && sudo ln -sfn \`which pip3\` /usr/bin/pip && pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin'

// variables
    def ec2_cloud_name = "${config.ec2_cloud_name}"
    def instance_type = "${config.instance_type}"
    def worker_label_string = "${config.worker_label_string}"
    def number_of_executors = "${config.number_of_executors}"
    def remote_user = "${config.remote_user}"
    def ami_id = "${config.ami_id}"

// info imported the stack
    def region = "${stackConfig.region}"
    def security_group = "${stackConfig.agent_node_security_group}"
    def subnet_id = "${stackConfig.subnet_id}"
    def instance_profile_arn = "${this.AgentNodeInstanceProfileArn}"
    def sshKeysASMSecretId = "${this.SSHEC2KeySecretId}"
    def ec2_tags = [new EC2Tag('Name', 'jenkins-agent-node')]

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
      // String roleArn
      '',
      // String roleSessionName
      ''
    )

    instance.clouds.add(new_cloud)
    instance.save()`);
  }
}
