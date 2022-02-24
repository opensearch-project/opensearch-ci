import {
  CfnParameter, Construct, Stack,
} from '@aws-cdk/core';
import { CiEcrStack, EcrStackProps } from './ci-ecr-stack';

export interface DeployAssetsProps extends EcrStackProps {
  readonly envName: string;
}

export class DeployAWSAssets extends Stack {
  constructor(scope: Construct, id: string, props: DeployAssetsProps) {
    super(scope, id, props);
    const deployECRParameter = `${props?.deployECR ?? this.node.tryGetContext('deployEcr')}`;

    new CfnParameter(this, 'deployEcr', {
      description: 'Should ECR repositories + roles be created',
      default: deployECRParameter === 'true',
    });

    if (deployECRParameter === 'true') {
      DeployAWSAssets.deployEcrStack(this, props);
    }
  }

  public static deployEcrStack(scope: Construct, props: DeployAssetsProps): void {
    new CiEcrStack(scope, `OpenSearch-CI-ECR-${props.envName}`, props.envName, props);
  }
}
