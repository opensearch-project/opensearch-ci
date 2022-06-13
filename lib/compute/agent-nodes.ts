/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
  AmazonLinuxCpuType, AmazonLinuxGeneration, MachineImage,
} from '@aws-cdk/aws-ec2';
import { Stack } from '@aws-cdk/core';
import { AgentNodeProps } from './agent-node-config';

export class AgentNodes {
    // Refer: https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/ec2/model/InstanceType.html for instance types
    readonly AL2_X64: AgentNodeProps;

    readonly AL2_X64_DOCKER_1: AgentNodeProps;

    readonly AL2_ARM64: AgentNodeProps;

    readonly AL2_ARM64_DOCKER_1: AgentNodeProps;

    readonly UBUNTU_X64_DOCKER: AgentNodeProps;

    constructor(stack: Stack) {
      this.AL2_X64 = {
        workerLabelString: 'AL2-X64',
        instanceType: 'C54xlarge',
        remoteUser: 'ec2-user',
        amiId: MachineImage.latestAmazonLinux({
          generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
          cpuType: AmazonLinuxCpuType.X86_64,
        }).getImage(stack).imageId.toString(),
        initScript: 'sudo mkdir -p /var/jenkins/ && sudo chown -R ec2-user:ec2-user /var/jenkins &&'
        + ' sudo yum install -y java-1.8.0-openjdk cmake python3 python3-pip python3-devel && sudo yum groupinstall -y "Development Tools" &&'
        + ' sudo ln -sfn `which pip3` /usr/bin/pip && pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin',
      };
      this.AL2_X64_DOCKER_1 = {
        workerLabelString: 'Jenkins-Agent-al2-x64-c54xlarge-Docker-Host',
        instanceType: 'C54xlarge',
        remoteUser: 'ec2-user',
        amiId: 'ami-00a07e55fcad01043',
        initScript: 'sudo yum update -y || sudo yum update -y',
      };
      this.AL2_ARM64 = {
        workerLabelString: 'AL2-ARM64',
        instanceType: 'C6g4xlarge',
        remoteUser: 'ec2-user',
        amiId: MachineImage.latestAmazonLinux({
          generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
          cpuType: AmazonLinuxCpuType.ARM_64,
        }).getImage(stack).imageId.toString(),
        initScript: 'sudo mkdir -p /var/jenkins/ && sudo chown -R ec2-user:ec2-user /var/jenkins &&'
        + ' sudo yum install -y java-1.8.0-openjdk cmake python3 python3-pip python3-devel && sudo yum groupinstall -y "Development Tools" &&'
        + ' sudo ln -sfn `which pip3` /usr/bin/pip && pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin',
      };
      this.AL2_ARM64_DOCKER_1 = {
        workerLabelString: 'Jenkins-Agent-al2-arm64-c6g4xlarge-Docker-Host',
        instanceType: 'C6g4xlarge',
        remoteUser: 'ec2-user',
        amiId: 'ami-020c52efb1a60f1ae',
        initScript: 'sudo yum update -y || sudo yum update -y',
      };
      this.UBUNTU_X64_DOCKER = {
        workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-m52xlarge-Docker-Builder',
        instanceType: 'M52xlarge',
        remoteUser: 'ubuntu',
        amiId: 'ami-0f6ceb3b3687a3fba',
        initScript: 'sudo apt-mark hold docker docker.io openssh-server && docker ps',
      };
    }
}
