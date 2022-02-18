import {
  Arn,
  Construct, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import {
  ArnPrincipal, Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal,
} from '@aws-cdk/aws-iam';
import { CiEcrStack } from '../lib/ci-ecr-stack';
import { CIStack } from '../lib/ci-stack';

export interface deployAssetsProps extends StackProps {
  /** Should we deploy ECR */
  deployECR?: boolean;
  removalPolicy?: RemovalPolicy;
  ciStack: CIStack;
}

export class DeployAssets extends Stack {
  constructor(scope: Construct, id: string, props: deployAssetsProps) {
    super(scope, id, props);
    const deployECRParameter = `${props?.deployECR ?? this.node.tryGetContext('deployEcr')}`;

    const deployECR = deployECRParameter === 'true';

    if (deployECR) {
      DeployAssets.deployEcrStack(scope, props);
    }
  }

  public static deployEcrStack(scope: Construct, props: deployAssetsProps): CiEcrStack {
    const ecrStack = new CiEcrStack(scope, 'CI-ECR-Dev', {
      mainNodeRoleArn: props.ciStack.mainJenkinsNode.ec2Instance.role.roleArn,
      removalPolicy: props.removalPolicy,
    });

    // const policy = new Policy(props.ciStack, 'myLambda_policy', {
    //   statements: [new PolicyStatement({
    //     actions: ['sts:AssumeRole'],
    //     effect: Effect.ALLOW,
    //     principals: [new ArnPrincipal(ecrStack.ecrRoleArn)],
    //   })],
    // });

    // policy.attachToRole(ecrStack.role);

    console.log('***********');
    console.log(ecrStack.ecrRoleArn.toString());

    // props.ciStack.mainJenkinsNode.ec2Instance.role.attachInlinePolicy(
    //   new Policy(props.ciStack, 'new-policy', {
    //     statements: [new PolicyStatement({
    //       actions: ['sts:AssumeRole'],
    //       effect: Effect.ALLOW,
    //       principals: [new ArnPrincipal(ecrStack.ecrRoleArn.toString())],
    //     })],
    //   }),
    // );
    //

    // props.ciStack.mainJenkinsNode.ec2Instance.role?.grant(new ArnPrincipal(ecrStack.ecrRoleArn.toString()));

    // props.ciStack.mainJenkinsNode.ec2Instance.role.addToPrincipalPolicy(
    //   new PolicyStatement({
    //     actions: ['sts:AssumeRole'],
    //     effect: Effect.ALLOW,
    //     principals: [new ArnPrincipal('arn:aws:iam::*:role/ecr-role')],
    //     resources: ['*'],
    //   }),
    // );
    //
    props.ciStack.mainJenkinsNode.ec2Instance.role?.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(ecrStack.ecrRoleArn.toString())],
        resources: ['*'],
      }),
    );

    return ecrStack;
  }
}
