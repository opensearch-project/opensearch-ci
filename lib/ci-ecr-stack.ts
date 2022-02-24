import {
  Construct, NestedStack, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import { Repository, TagMutability } from '@aws-cdk/aws-ecr';
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
  readonly createRepositories?: boolean;
}

export class CiEcrStack extends NestedStack {
  constructor(scope: Construct, id: string, envName: string, props: EcrStackProps) {
    super(scope, id, props);
    if (props.createRepositories ?? false) {
      CiEcrStack.createRepositories(this, props.removalPolicy ?? RemovalPolicy.RETAIN);
    }
    const ecrPolicy = CiEcrStack.createEcrPolicy(this, id);

    CiEcrStack.createEcrRole(this, ecrPolicy, props.mainNodeAccountNumber, envName);
  }

  public static createEcrRole(stack: Stack, ecrPolicy: ManagedPolicy, mainNodeAccountNumber: string, envName: String) : IRole {
    return new Role(stack, 'ecr-stack-role', {
      roleName: `OpenSearch-CI-ECR-${envName}-ecr-role`,
      assumedBy: new ArnPrincipal(`arn:aws:iam::${mainNodeAccountNumber}:role/OpenSearch-CI-${envName}-MainNodeRole`),
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

  public static createRepositories(stack: Stack, removalPolicy : RemovalPolicy) : void {
    new Repository(stack, 'ci-runner', {
      repositoryName: 'ci-runner',
      imageTagMutability: TagMutability.IMMUTABLE,
      removalPolicy,
    });

    new Repository(stack, 'opensearch', {
      repositoryName: 'opensearch',
      imageTagMutability: TagMutability.IMMUTABLE,
      removalPolicy,
    });

    new Repository(stack, 'data-prepper', {
      repositoryName: 'data-prepper',
      imageTagMutability: TagMutability.IMMUTABLE,
      removalPolicy,
    });

    new Repository(stack, 'logstash-oss-with-opensearch-output-plugin', {
      repositoryName: 'logstash-oss-with-opensearch-output-plugin',
      imageTagMutability: TagMutability.IMMUTABLE,
      removalPolicy,
    });

    new Repository(stack, 'opensearch-dashboards', {
      repositoryName: 'opensearch-dashboards',
      imageTagMutability: TagMutability.IMMUTABLE,
      removalPolicy,
    });
  }
}
