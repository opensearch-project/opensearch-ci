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
import { AgentNodeProps } from './agent-node-config';

export class AgentNodes {
    // Refer: https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/ec2/model/InstanceType.html for instance types
    readonly AL2_X64: AgentNodeProps;

    readonly AL2_X64_DOCKER_HOST: AgentNodeProps;

    readonly AL2_ARM64: AgentNodeProps;

    readonly AL2_ARM64_DOCKER_HOST: AgentNodeProps;

    readonly UBUNTU_X64: AgentNodeProps;

    readonly UBUNTU_X64_DOCKER_BUILDER: AgentNodeProps;

    constructor() {
      this.AL2_X64 = {
        workerLabelString: 'Jenkins-Agent-al2-x64-c54xlarge-Single-Host',
        instanceType: 'C54xlarge',
        remoteUser: 'ec2-user',
        numExecutors: 1,
        amiId: 'ami-00a07e55fcad01043',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_X64_DOCKER_HOST = {
        workerLabelString: 'Jenkins-Agent-al2-x64-c54xlarge-Docker-Host',
        instanceType: 'C54xlarge',
        remoteUser: 'ec2-user',
        numExecutors: 8,
        amiId: 'ami-00a07e55fcad01043',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_ARM64 = {
        workerLabelString: 'Jenkins-Agent-al2-arm64-c6g4xlarge-Single-Host',
        instanceType: 'C6g4xlarge',
        remoteUser: 'ec2-user',
        numExecutors: 1,
        amiId: 'ami-020c52efb1a60f1ae',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_ARM64_DOCKER_HOST = {
        workerLabelString: 'Jenkins-Agent-al2-arm64-c6g4xlarge-Docker-Host',
        instanceType: 'C6g4xlarge',
        remoteUser: 'ec2-user',
        numExecutors: 8,
        amiId: 'ami-020c52efb1a60f1ae',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.UBUNTU_X64 = {
        workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-c524xlarge-Single-Host',
        instanceType: 'C524xlarge',
        remoteUser: 'ubuntu',
        numExecutors: 1,
        amiId: 'ami-0f6ceb3b3687a3fba',
        initScript: 'sudo apt-mark hold docker docker.io openssh-server && docker ps &&'
        + ' sudo apt-get update -y && sudo apt-get upgrade -y && sudo apt-get install docker-compose -y',
      };
      this.UBUNTU_X64_DOCKER_BUILDER = {
        workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-m52xlarge-Docker-Builder',
        instanceType: 'M52xlarge',
        remoteUser: 'ubuntu',
        numExecutors: 1,
        amiId: 'ami-0f6ceb3b3687a3fba',
        initScript: 'sudo apt-mark hold docker docker.io openssh-server && docker ps &&'
        + ' sudo apt-get update -y && sudo apt-get upgrade -y',
      };
    }
}
