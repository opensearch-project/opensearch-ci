import {
  Construct, NestedStack, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import { CfnPublicRepository } from '@aws-cdk/aws-ecr';
import {
  ArnPrincipal, IRole, ManagedPolicy, PolicyStatement, Role,
} from '@aws-cdk/aws-iam';

export interface EcrStackProps extends StackProps {
  /** Should we deploy ECR */
  readonly deployECR?: boolean;
  /** Main Node role arn */
  readonly mainNodeAccountNumber: string;
  /** removal policy for the ECR Repositories */
  readonly removalPolicy?: RemovalPolicy;
  /** should we skip creating ecr  */
  readonly createEcrRepositories?: boolean;
}

export class CiEcrStack extends NestedStack {
  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);
    if (props.createEcrRepositories ?? false) {
      CiEcrStack.createRepositories(scope, this, props.removalPolicy ?? RemovalPolicy.RETAIN);
    }
    const ecrPolicy = CiEcrStack.createEcrPolicy(this, id);

    CiEcrStack.createEcrRole(this, ecrPolicy, props.mainNodeAccountNumber);
  }

  public static createEcrRole(stack: Stack, ecrPolicy: ManagedPolicy, mainNodeAccountNumber: string) : IRole {
    return new Role(stack, 'ecr-stack-role', {
      roleName: 'OpenSearch-CI-ECR-ecr-role',
      assumedBy: new ArnPrincipal(`arn:aws:iam::${mainNodeAccountNumber}:role/OpenSearch-CI-MainNodeRole`),
      managedPolicies: [
        ecrPolicy,
      ],
    });
  }

  public static createEcrPolicy(stack: Stack, id: String) : ManagedPolicy {
    return new ManagedPolicy(stack, 'ecr-policy',
      {
        description: 'Policy for uploading images to ECR',
        managedPolicyName: `${id}-ecr-policy`,
        statements: [new PolicyStatement({
          actions: [
            'ecr-public:BatchCheckLayerAvailability',
            'ecr-public:CompleteLayerUpload',
            'ecr-public:InitiateLayerUpload',
            'ecr-public:PutImage',
            'ecr-public:UploadLayerPart',
          ],
          resources: ['*'],
        }),
        new PolicyStatement({
          actions: [
            'ecr-public:GetAuthorizationToken',
            'sts:GetServiceBearerToken',
          ],
          resources: ['*'],
        })],
      });
  }

  public static createRepositories(scope: Construct, stack: Stack, removalPolicy : RemovalPolicy) : void {
    new CfnPublicRepository(scope, 'ci-runner', {
      repositoryName: 'ci-runner',
    }).applyRemovalPolicy(removalPolicy);

    new CfnPublicRepository(stack, 'opensearch', {
      repositoryName: 'opensearch',
    }).applyRemovalPolicy(removalPolicy);

    new CfnPublicRepository(stack, 'data-prepper', {
      repositoryName: 'data-prepper',
    }).applyRemovalPolicy(removalPolicy);

    new CfnPublicRepository(stack, 'logstash-oss-with-opensearch-output-plugin', {
      repositoryName: 'logstash-oss-with-opensearch-output-plugin',
    }).applyRemovalPolicy(removalPolicy);

    new CfnPublicRepository(stack, 'opensearch-dashboards', {
      repositoryName: 'opensearch-dashboards',
    }).applyRemovalPolicy(removalPolicy);
  }
}
