/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import { AmazonLinuxCpuType, AmazonLinuxGeneration, MachineImage } from 'aws-cdk-lib/aws-ec2';
import { AgentNodeProps } from './agent-node-config';

export class AgentNodes {
  // Refer: https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/ec2/model/InstanceType.html for instance types
  readonly AL2_X64: AgentNodeProps;

  readonly AL2_X64_DOCKER_HOST: AgentNodeProps;

  readonly AL2_X64_DOCKER_HOST_PERF_TEST: AgentNodeProps;

  readonly AL2_ARM64: AgentNodeProps;

  readonly AL2_ARM64_DOCKER_HOST: AgentNodeProps;

  readonly UBUNTU2004_X64: AgentNodeProps;

  readonly UBUNTU2004_X64_DOCKER_BUILDER: AgentNodeProps;

  readonly MACOS12_X64_MULTI_HOST: AgentNodeProps;

  readonly WINDOWS2019_X64: AgentNodeProps;

  readonly AL2_X64_DEFAULT_AGENT: AgentNodeProps;

  readonly AL2_ARM64_DEFAULT_AGENT: AgentNodeProps;

  constructor(stack: Stack) {
    this.AL2_X64 = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-AL2-X64-C54xlarge-Single-Host',
      instanceType: 'C54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-066d38ff7bb447e31',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
      + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2_X64_DOCKER_HOST = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-AL2-X64-C54xlarge-Docker-Host',
      instanceType: 'C54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 2,
      numExecutors: 4,
      amiId: 'ami-066d38ff7bb447e31',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
      + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2_X64_DOCKER_HOST_PERF_TEST = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-AL2-X64-M52xlarge-Docker-Host-Perf-Test',
      instanceType: 'M52xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 8,
      amiId: 'ami-066d38ff7bb447e31',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
      + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2_ARM64 = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-AL2-Arm64-C6g4xlarge-Single-Host',
      instanceType: 'C6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-0627f82eac555c057',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
      + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2_ARM64_DOCKER_HOST = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-AL2-Arm64-C6g4xlarge-Docker-Host',
      instanceType: 'C6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 2,
      numExecutors: 4,
      amiId: 'ami-0627f82eac555c057',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
      + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.UBUNTU2004_X64 = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-C524xlarge-Single-Host',
      instanceType: 'C524xlarge',
      remoteUser: 'ubuntu',
      maxTotalUses: 1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-0cb8e4972ce3b3ab3',
      initScript: 'sudo apt-mark hold docker docker.io openssh-server gh && docker ps &&'
      + ' sudo apt-get update -y && (sudo killall -9 apt-get apt 2>&1 || echo) && sudo apt-get upgrade -y',
      remoteFs: '/var/jenkins',
    };
    this.UBUNTU2004_X64_DOCKER_BUILDER = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-M52xlarge-Docker-Builder',
      instanceType: 'M52xlarge',
      remoteUser: 'ubuntu',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-0cb8e4972ce3b3ab3',
      initScript: 'sudo apt-mark hold docker docker.io openssh-server gh && docker ps &&'
      + ' sudo apt-get update -y && (sudo killall -9 apt-get apt 2>&1 || echo) && sudo apt-get upgrade -y',
      remoteFs: '/var/jenkins',
    };
    this.MACOS12_X64_MULTI_HOST = {
      agentType: 'mac',
      workerLabelString: 'Jenkins-Agent-MacOS12-X64-Mac1Metal-Multi-Host',
      instanceType: 'Mac1Metal',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 6,
      amiId: 'ami-02d7dad69f9d334e5',
      initScript: 'echo',
      remoteFs: '/var/jenkins',
    };
    this.WINDOWS2019_X64 = {
      agentType: 'windows',
      workerLabelString: 'Jenkins-Agent-Windows2019-X64-C54xlarge-Single-Host',
      instanceType: 'C54xlarge',
      remoteUser: 'Administrator',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 2,
      numExecutors: 1,
      amiId: 'ami-0e6529e2a3c55ac1a',
      initScript: 'echo',
      remoteFs: 'C:\\Users\\Administrator\\jenkins',
    };
    this.AL2_X64_DEFAULT_AGENT = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Default-Agent-X64-C5xlarge-Single-Host',
      instanceType: 'C54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.X86_64,
      }).getImage(stack).imageId.toString(),
      initScript: 'sudo yum install -y java-1.8.0-openjdk cmake python3 python3-pip && '
          + 'sudo yum groupinstall -y \'Development Tools\' && sudo ln -sfn `which pip3` /usr/bin/pip && '
          + 'pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin',
      remoteFs: '/home/ec2-user',
    };
    this.AL2_ARM64_DEFAULT_AGENT = {
      agentType: 'unix',
      workerLabelString: 'Jenkins-Default-Agent-ARM64-C5xlarge-Single-Host',
      instanceType: 'C6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.ARM_64,
      }).getImage(stack).imageId.toString(),
      initScript: 'sudo yum install -y java-1.8.0-openjdk cmake python3 python3-pip && '
          + 'sudo yum groupinstall -y \'Development Tools\' && sudo ln -sfn `which pip3` /usr/bin/pip && '
          + 'pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin',
      remoteFs: '/home/ec2-user',
    };
  }
}
