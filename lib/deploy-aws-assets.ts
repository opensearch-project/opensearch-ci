import {
  CfnParameter, Construct, Stack, StackProps,
} from '@aws-cdk/core';

export interface DeployAssetsProps extends StackProps {
  /** Environment in which assets are being deployed */
  readonly envName: string;
}

export class DeployAwsAssets extends Stack {
  constructor(scope: Construct, id: string, props: DeployAssetsProps) {
    super(scope, id, props);
  }
}
