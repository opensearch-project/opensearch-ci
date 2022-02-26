import {
  CfnParameter, Construct, Stack,
} from '@aws-cdk/core';
import { CiEcrStack, EcrStackProps } from './ci-ecr-stack';

export interface DeployAssetsProps extends EcrStackProps {
  /** Environment in which assets are being deployed */
  readonly envName: string;
}

export class DeployAwsAssets extends Stack {
  constructor(scope: Construct, id: string, props: DeployAssetsProps) {
    super(scope, id, props);
    const deployECRParameter = `${props?.deployECR ?? this.node.tryGetContext('deployEcr')}`;

    new CfnParameter(this, 'deployEcr', {
      description: 'Should ECR repositories + roles be created',
      default: deployECRParameter === 'true',
    });

    if (deployECRParameter === 'true') {
      DeployAwsAssets.deployEcrStack(this, props);
    }
  }

  public static deployEcrStack(scope: Construct, props: DeployAssetsProps): void {
    new CiEcrStack(scope, `OpenSearch-CI-ECR-${props.envName}`, props);
  }
}
