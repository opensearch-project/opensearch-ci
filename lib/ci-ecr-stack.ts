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
  /** list of ecr repositories to be deployed  */
  readonly repositories?: string[];
}

export class CiEcrStack extends NestedStack {
  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    if (props.repositories !== undefined && props.repositories.length > 0) {
      CiEcrStack.createRepositories(scope, this, props.removalPolicy ?? RemovalPolicy.RETAIN, props.repositories ?? []);
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

  public static createRepositories(scope: Construct, stack: Stack, removalPolicy : RemovalPolicy, repositories: string[]) : void {
    repositories.map((repoName) => new CfnPublicRepository(scope, repoName, {
      repositoryName: repoName,
    }).applyRemovalPolicy(removalPolicy));
  }
}
