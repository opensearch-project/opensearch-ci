import {
  AmazonLinuxCpuType, AmazonLinuxGeneration, InstanceClass, InstanceSize, InstanceType, MachineImage,
} from '@aws-cdk/aws-ec2';
import { Stack } from '@aws-cdk/core';
import { AgentNodeConfig } from './agent-nodes';

export class CloudAgentNodeConfig {
  readonly AL2_X64: AgentNodeConfig;

  readonly AL2_ARM64: AgentNodeConfig;

  constructor(stack: Stack) {
    this.AL2_X64 = {
      ec2CloudName: 'AL2-X64',
      instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.XLARGE4).toString(),
      workerLabelString: 'AL2-X64',
      numberOfExecutors: '2',
      remoteUser: 'ec2-user',
      amiId: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.X86_64,
      }).getImage(stack).imageId.toString(),
    };
    this.AL2_ARM64 = {
      ec2CloudName: 'AL2-ARM64',
      instanceType: InstanceType.of(InstanceClass.C6G, InstanceSize.XLARGE4).toString(),
      workerLabelString: 'AL2-ARM64',
      numberOfExecutors: '2',
      remoteUser: 'ec2-user',
      amiId: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.ARM_64,
      }).getImage(stack).imageId.toString(),
    };
  }
}
