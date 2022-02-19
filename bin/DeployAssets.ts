import {
  Arn, CfnParameter,
  Construct, Fn, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import {
  ArnPrincipal, Effect, IRole, ManagedPolicy, Policy, PolicyStatement, Role,
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

    new CfnParameter(this, 'runWithOidc', {
      description: 'Should ECR repositories + roles be created',
      default: deployECRParameter === 'true',
    });

    if (deployECRParameter === 'true') {
      DeployAssets.deployEcrStack(scope, this, props);
    }
  }

  public static deployEcrStack(scope: Construct, stack: Stack, props: deployAssetsProps): CiEcrStack {
    const importedMainNodeRoleArn = Fn.importValue(`${CIStack.MAIN_NODE_ROLE_ARN_EXPORT_VALUE}`);

    const ecrStack = new CiEcrStack(scope, 'CI-ECR-Dev', {
      mainNodeRoleArn: importedMainNodeRoleArn,
      removalPolicy: props.removalPolicy,
      createRepositories: false,
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

    const mainNodeRole = Role.fromRoleArn(
      stack,
      'imported-role',
      importedMainNodeRoleArn,
      { mutable: false },
    );

    mainNodeRole.addToPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(ecrStack.ecrRoleArn.toString())],
        resources: ['*'],
      }),
    );

    // mainNodeRole.attachInlinePolicy(
    //   new Policy(props.ciStack, 'ecr-policy-main-node', {
    //     statements: [new PolicyStatement({
    //       actions: ['sts:AssumeRole'],
    //       effect: Effect.ALLOW,
    //       principals: [new ArnPrincipal(ecrStack.ecrRoleArn.toString())],
    //       resources: ['*'],
    //     })],
    //   }),
    // );

    // mainNodeRole.addManagedPolicy(
    //   new ManagedPolicy(props.ciStack, 'ecr-policy-main-node', {
    //     statements: [new PolicyStatement({
    //       actions: ['sts:AssumeRole'],
    //       effect: Effect.ALLOW,
    //       principals: [new ArnPrincipal(ecrStack.ecrRoleArn.toString())],
    //       resources: ['*'],
    //     })],
    //   }),
    // );

    mainNodeRole.grant(new ArnPrincipal(ecrStack.ecrRoleArn.toString()), 'sts:AssumeRole');

    mainNodeRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: Effect.ALLOW,
        principals: [new ArnPrincipal(ecrStack.ecrRoleArn.toString())],
        resources: ['*'],
      }),
    );

    // props.ciStack.mainJenkinsNode.ec2Instance.role?.grant(new ArnPrincipal(ecrStack.ecrRoleArn.toString()));

    // props.ciStack.mainJenkinsNode.ec2Instance.role.addToPrincipalPolicy(
    //   new PolicyStatement({
    //     actions: ['sts:AssumeRole'],
    //     effect: Effect.ALLOW,
    //     principals: [new ArnPrincipal('arn:aws:iam::*:role/ecr-role')],
    //     resources: ['*'],
    //   }),
    // );

    // mainNodeRole.assumeRolePolicy?.addToPrincipalPolicy(
    //   new PolicyStatement({
    //     actions: ['sts:AssumeRole'],
    //     effect: Effect.ALLOW,
    //     principals: [new ArnPrincipal(ecrStack.ecrRoleArn)],
    //     resources: ['*'],
    //   }),
    // );

    return ecrStack;
  }
}
