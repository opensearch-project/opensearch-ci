/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import { AmazonLinuxCpuType, MachineImage } from 'aws-cdk-lib/aws-ec2';
import { AgentNodeProps } from './agent-node-config';

export class AgentNodes {
  // Refer: https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/ec2/model/InstanceType.html for instance types
  readonly AL2023_X64: AgentNodeProps;

  readonly AL2_X64_DOCKER_HOST: AgentNodeProps;

  readonly AL2023_X64_DOCKER_HOST: AgentNodeProps;

  readonly AL2023_ARM64: AgentNodeProps;

  readonly AL2_ARM64_DOCKER_HOST: AgentNodeProps;

  readonly AL2023_ARM64_DOCKER_HOST: AgentNodeProps;

  readonly AL2023_X64_BENCHMARK_TEST: AgentNodeProps;

  readonly UBUNTU2004_X64_GRADLE_CHECK: AgentNodeProps;

  readonly UBUNTU2404_X64_GRADLE_CHECK: AgentNodeProps;

  readonly UBUNTU2404_X64_DOCKER_BUILDER: AgentNodeProps;

  readonly MACOS13_X64_MULTI_HOST: AgentNodeProps;

  readonly MACOS13_ARM64_MULTI_HOST: AgentNodeProps;

  readonly WINDOWS2019_X64_DOCKER_HOST: AgentNodeProps;

  readonly WINDOWS2019_X64_DOCKER_BUILDER: AgentNodeProps;

  readonly WINDOWS2019_X64_GRADLE_CHECK: AgentNodeProps;

  readonly AL2_X64_DEFAULT_AGENT: AgentNodeProps;

  readonly AL2_ARM64_DEFAULT_AGENT: AgentNodeProps;

  constructor(stack: Stack) {
    this.AL2023_X64 = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2023-X64-C54xlarge-Single-Host', 'BTR'],
      instanceType: 'C54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-0e8c1c93cdfb4ce70',
      initScript: 'sudo dnf clean all && sudo rm -rf /var/cache/dnf && sudo dnf repolist &&'
        + ' sudo dnf update --releasever=latest --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* --exclude=openssl* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2_X64_DOCKER_HOST = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2-X64-C54xlarge-Docker-Host', 'BTR'],
      instanceType: 'C54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 4,
      amiId: 'ami-047328312ef36d12b',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2023_X64_DOCKER_HOST = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:600:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2023-X64-M54xlarge-Docker-Host', 'BTR'],
      instanceType: 'M54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 4,
      numExecutors: 3,
      amiId: 'ami-0e8c1c93cdfb4ce70',
      initScript: 'sudo dnf clean all && sudo rm -rf /var/cache/dnf && sudo dnf repolist &&'
        + ' sudo dnf update --releasever=latest --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* --exclude=openssl* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2023_ARM64 = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2023-Arm64-C6g4xlarge-Single-Host', 'BTR'],
      instanceType: 'C6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-07171e0264441db0a',
      initScript: 'sudo dnf clean all && sudo rm -rf /var/cache/dnf && sudo dnf repolist &&'
        + ' sudo dnf update --releasever=latest --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* --exclude=openssl* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2_ARM64_DOCKER_HOST = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2-Arm64-C6g4xlarge-Docker-Host', 'BTR'],
      instanceType: 'C6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 4,
      amiId: 'ami-06ba4c81e8dd7ab49',
      initScript: 'sudo yum clean all && sudo rm -rf /var/cache/yum /var/lib/yum/history && sudo yum repolist &&'
        + ' sudo yum update --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2023_ARM64_DOCKER_HOST = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:600:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2023-Arm64-M6g4xlarge-Docker-Host', 'BTR'],
      instanceType: 'M6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 4,
      numExecutors: 3,
      amiId: 'ami-07171e0264441db0a',
      initScript: 'sudo dnf clean all && sudo rm -rf /var/cache/dnf && sudo dnf repolist &&'
        + ' sudo dnf update --releasever=latest --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* --exclude=openssl* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.AL2023_X64_BENCHMARK_TEST = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-AL2023-X64-M52xlarge-Benchmark-Test', 'benchmark'],
      instanceType: 'M52xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 2,
      amiId: 'ami-09f55bf0827296c51',
      initScript: 'sudo dnf clean all && sudo rm -rf /var/cache/dnf && sudo dnf repolist &&'
        + ' sudo dnf update --releasever=latest --skip-broken --exclude=openssh* --exclude=docker* --exclude=gh* --exclude=openssl* -y && docker ps',
      remoteFs: '/var/jenkins',
    };
    this.UBUNTU2004_X64_GRADLE_CHECK = {
      agentType: 'unix',
      customDeviceMapping: '/dev/sda1=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-Ubuntu2004-X64-M58xlarge-Single-Host', 'gradle'],
      instanceType: 'M58xlarge',
      remoteUser: 'ubuntu',
      maxTotalUses: 1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-0cdc3fd42e6dc728c',
      initScript: 'sudo apt-mark hold docker docker.io openssh-server gh grub-efi* shim-signed && docker ps &&'
        + ' sudo apt-get update -y && (sudo killall -9 apt-get apt 2>&1 || echo) && sudo env "DEBIAN_FRONTEND=noninteractive" apt-get upgrade -y &&'
        + ' sudo update-alternatives --set "java" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/java" && java -version',
      remoteFs: '/var/jenkins',
    };
    this.UBUNTU2404_X64_GRADLE_CHECK = {
      agentType: 'unix',
      customDeviceMapping: '/dev/sda1=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-Ubuntu2404-X64-M58xlarge-Single-Host', 'gradle'],
      instanceType: 'M58xlarge',
      remoteUser: 'ubuntu',
      maxTotalUses: 1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-003ac353b208c956a',
      initScript: 'docker ps && sudo apt-get update -y && sudo env "DEBIAN_FRONTEND=noninteractive" apt-get upgrade -y &&'
        + ' sudo update-alternatives --set "java" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/java" && java -version',
      remoteFs: '/var/jenkins',
    };
    this.UBUNTU2404_X64_DOCKER_BUILDER = {
      agentType: 'unix',
      customDeviceMapping: '/dev/sda1=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-Ubuntu2404-X64-M52xlarge-Docker-Builder', 'BTR'],
      instanceType: 'M52xlarge',
      remoteUser: 'ubuntu',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 2,
      numExecutors: 1,
      amiId: 'ami-003ac353b208c956a',
      initScript: 'docker ps && sudo apt-get update -y && sudo env "DEBIAN_FRONTEND=noninteractive" apt-get upgrade -y &&'
        + ' sudo update-alternatives --set "java" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/java" && java -version',
      remoteFs: '/var/jenkins',
    };
    this.MACOS13_X64_MULTI_HOST = {
      agentType: 'mac',
      customDeviceMapping: '/dev/sda1=:300:true:gp3::encrypted',
      workerLabelString: ['Jenkins-Agent-MacOS13-X64-Mac1Metal-Multi-Host', 'BTR'],
      instanceType: 'Mac1Metal',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 4,
      amiId: 'ami-09db87000b6d76316',
      initScript: 'echo',
      remoteFs: '/var/jenkins',
    };
    this.MACOS13_ARM64_MULTI_HOST = {
      agentType: 'mac',
      customDeviceMapping: '/dev/sda1=:300:true:gp3::encrypted',
      workerLabelString: ['Jenkins-Agent-MacOS13-ARM64-Mac2M2proMetal-Multi-Host', 'BTR'],
      instanceType: 'Mac2M2proMetal',
      remoteUser: 'ec2-user',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 4,
      amiId: 'ami-0897a08c9555774b1',
      initScript: 'echo',
      remoteFs: '/var/jenkins',
    };
    this.WINDOWS2019_X64_DOCKER_HOST = {
      agentType: 'windows',
      customDeviceMapping: '/dev/sda1=:600:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-Windows2019-X64-M54xlarge-Docker-Host', 'BTR'],
      instanceType: 'M54xlarge',
      remoteUser: 'Administrator',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 4,
      numExecutors: 3,
      amiId: 'ami-021eaef5ecf03ae4c',
      initScript: 'echo %USERNAME% && dockerd --register-service && net start docker && echo started docker deamon && docker ps && '
        + 'echo initializing docker images now waiting for 5min && git clone https://github.com/opensearch-project/opensearch-build.git && '
        + 'bash.exe -c "docker run --rm -it  --name docker-windows-test -d `opensearch-build/docker/ci/get-ci-images.sh '
        + '-p windows2019 -u opensearch -t build | head -1` bash.exe && sleep 5" && docker exec docker-windows-test whoami && '
        + 'docker ps && docker stop docker-windows-test && docker ps && rm -rf opensearch-build',
      remoteFs: 'C:/Users/Administrator/jenkins',
    };
    this.WINDOWS2019_X64_DOCKER_BUILDER = {
      agentType: 'windows',
      customDeviceMapping: '/dev/sda1=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-Windows2019-X64-M54xlarge-Docker-Builder', 'BTR'],
      instanceType: 'M54xlarge',
      remoteUser: 'Administrator',
      maxTotalUses: 10,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-021eaef5ecf03ae4c',
      initScript: 'echo %USERNAME% && dockerd --register-service && net start docker && echo started docker deamon && docker ps && '
        + 'echo initializing docker images now waiting for 5min && git clone https://github.com/opensearch-project/opensearch-build.git && '
        + 'bash.exe -c "docker run --rm -it  --name docker-windows-test -d `opensearch-build/docker/ci/get-ci-images.sh '
        + '-p windows2019 -u opensearch -t build | head -1` bash.exe && sleep 5" && docker exec docker-windows-test whoami && '
        + 'docker ps && docker stop docker-windows-test && docker ps && rm -rf opensearch-build',
      remoteFs: 'C:/Users/Administrator/jenkins',
    };
    this.WINDOWS2019_X64_GRADLE_CHECK = {
      agentType: 'windows',
      customDeviceMapping: '/dev/sda1=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Agent-Windows2019-X64-C524xlarge-Single-Host', 'gradle'],
      instanceType: 'C524xlarge',
      remoteUser: 'Administrator',
      maxTotalUses: 1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: 'ami-0ca4f0ba85855e148',
      initScript: 'echo',
      remoteFs: 'C:/Users/Administrator/jenkins',
    };
    this.AL2_X64_DEFAULT_AGENT = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Default-Agent-X64-C5xlarge-Single-Host', 'default'],
      instanceType: 'C54xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: MachineImage.latestAmazonLinux2023({
        cpuType: AmazonLinuxCpuType.X86_64,
      }).getImage(stack).imageId.toString(),
      initScript: 'sudo amazon-linux-extras install java-openjdk11 -y && sudo yum install -y cmake python3 python3-pip && '
        + 'sudo yum groupinstall -y \'Development Tools\' && sudo ln -sfn `which pip3` /usr/bin/pip && '
        + 'pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin',
      remoteFs: '/home/ec2-user',
    };
    this.AL2_ARM64_DEFAULT_AGENT = {
      agentType: 'unix',
      customDeviceMapping: '/dev/xvda=:300:true:::encrypted',
      workerLabelString: ['Jenkins-Default-Agent-ARM64-C5xlarge-Single-Host', 'default'],
      instanceType: 'C6g4xlarge',
      remoteUser: 'ec2-user',
      maxTotalUses: -1,
      minimumNumberOfSpareInstances: 1,
      numExecutors: 1,
      amiId: MachineImage.latestAmazonLinux2023({
        cpuType: AmazonLinuxCpuType.ARM_64,
      }).getImage(stack).imageId.toString(),
      initScript: 'sudo amazon-linux-extras install java-openjdk11 -y && sudo yum install -y cmake python3 python3-pip && '
        + 'sudo yum groupinstall -y \'Development Tools\' && sudo ln -sfn `which pip3` /usr/bin/pip && '
        + 'pip3 install pipenv && sudo ln -s ~/.local/bin/pipenv /usr/local/bin',
      remoteFs: '/home/ec2-user',
    };
  }

  public getRequiredAgentNodes(type: string): any[] {
    return Object.keys(this)
      .filter((key) => {
        const agent = (this as any)[key];
        // If condition will be omitted once we maintain individual jenkins for BTR , Benchmark, Gradle
        if (type === 'BTR') {
          return !agent?.workerLabelString?.some((label: string) => label.toLowerCase() === 'default');
        }
        return agent?.workerLabelString?.some((label: string) => label.includes(type));
      })
      .map((key) => (this as any)[key]);
  }
}
