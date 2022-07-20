/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { AgentNodeProps } from './agent-node-config';

export class AgentNodes {
    // Refer: https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/ec2/model/InstanceType.html for instance types
    readonly AL2_X64: AgentNodeProps;

    readonly AL2_X64_DOCKER_HOST: AgentNodeProps;

    readonly AL2_X64_DOCKER_HOST_PERF_TEST: AgentNodeProps;

    readonly AL2_ARM64: AgentNodeProps;

    readonly AL2_ARM64_DOCKER_HOST: AgentNodeProps;

    readonly UBUNTU_X64: AgentNodeProps;

    readonly UBUNTU_X64_DOCKER_BUILDER: AgentNodeProps;

    constructor() {
      this.AL2_X64 = {
        workerLabelString: 'Jenkins-Agent-AL2-X64-C54xlarge-Single-Host',
        instanceType: 'C54xlarge',
        remoteUser: 'ec2-user',
        maxTotalUses: -1,
        numExecutors: 1,
        amiId: 'ami-00a07e55fcad01043',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_X64_DOCKER_HOST = {
        workerLabelString: 'Jenkins-Agent-AL2-X64-C54xlarge-Docker-Host',
        instanceType: 'C54xlarge',
        remoteUser: 'ec2-user',
        maxTotalUses: -1,
        numExecutors: 8,
        amiId: 'ami-00a07e55fcad01043',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_X64_DOCKER_HOST_PERF_TEST = {
        workerLabelString: 'Jenkins-Agent-AL2-X64-M52xlarge-Docker-Host-Perf-Test',
        instanceType: 'M52xlarge',
        remoteUser: 'ec2-user',
        maxTotalUses: -1,
        numExecutors: 8,
        amiId: 'ami-00a07e55fcad01043',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_ARM64 = {
        workerLabelString: 'Jenkins-Agent-AL2-Arm64-C6g4xlarge-Single-Host',
        instanceType: 'C6g4xlarge',
        remoteUser: 'ec2-user',
        maxTotalUses: -1,
        numExecutors: 1,
        amiId: 'ami-020c52efb1a60f1ae',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.AL2_ARM64_DOCKER_HOST = {
        workerLabelString: 'Jenkins-Agent-AL2-Arm64-C6g4xlarge-Docker-Host',
        instanceType: 'C6g4xlarge',
        remoteUser: 'ec2-user',
        maxTotalUses: -1,
        numExecutors: 8,
        amiId: 'ami-020c52efb1a60f1ae',
        initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum/* && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y',
      };
      this.UBUNTU_X64 = {
        workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-C524xlarge-Single-Host',
        instanceType: 'C524xlarge',
        remoteUser: 'ubuntu',
        maxTotalUses: 1,
        numExecutors: 1,
        amiId: 'ami-0f6ceb3b3687a3fba',
        initScript: 'sudo apt-mark hold docker docker.io openssh-server && docker ps &&'
        + ' sudo apt-get update -y && sudo apt-get upgrade -y && sudo apt-get install docker-compose -y',
      };
      this.UBUNTU_X64_DOCKER_BUILDER = {
        workerLabelString: 'Jenkins-Agent-Ubuntu2004-X64-M52xlarge-Docker-Builder',
        instanceType: 'M52xlarge',
        remoteUser: 'ubuntu',
        maxTotalUses: -1,
        numExecutors: 1,
        amiId: 'ami-0f6ceb3b3687a3fba',
        initScript: 'sudo apt-mark hold docker docker.io openssh-server && docker ps &&'
        + ' sudo apt-get update -y && sudo apt-get upgrade -y',
      };
    }
}
