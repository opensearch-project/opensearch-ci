import {
  Construct, RemovalPolicy, Stack, StackProps,
} from '@aws-cdk/core';
import { Repository, TagMutability } from '@aws-cdk/aws-ecr';
import {
  ArnPrincipal, IRole, ManagedPolicy, PolicyStatement, Role,
} from '@aws-cdk/aws-iam';

export interface ecrStackProps extends StackProps {
  /** Main Node role arn */
  mainNodeRoleArn: string;
  removalPolicy?: RemovalPolicy;
  createRepositories?: boolean;
}

export class CiEcrStack extends Stack {
  public readonly ecrRoleArn: string;

  public readonly roleName: string;

  public readonly role: IRole;

  constructor(scope: Construct, id: string, props: ecrStackProps) {
    super(scope, id, props);

    if (props.createRepositories ?? false) {
      CiEcrStack.createRepositories(this, props.removalPolicy ?? RemovalPolicy.RETAIN);
    }
    const ecrPolicy = CiEcrStack.createEcrPolicy(this, id);

    const role = CiEcrStack.createEcrRole(this, ecrPolicy, props.mainNodeRoleArn);

    this.ecrRoleArn = role.roleArn;

    this.roleName = role.roleName;
  }

  public static createEcrRole(stack: Stack, ecrPolicy: ManagedPolicy, mainNodeRoleArn: string) : IRole {
    return new Role(stack, 'ecr-role', {
      roleName: `${stack.stackName}-ecr-role`,
      assumedBy: new ArnPrincipal(mainNodeRoleArn),
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
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new Repository(stack, 'opensearch', {
      repositoryName: 'opensearch',
      imageTagMutability: TagMutability.IMMUTABLE,
    });

    new Repository(stack, 'data-prepper', {
      repositoryName: 'data-prepper',
      imageTagMutability: TagMutability.IMMUTABLE,
    });

    new Repository(stack, 'logstash-oss-with-opensearch-output-plugin', {
      repositoryName: 'logstash-oss-with-opensearch-output-plugin',
      imageTagMutability: TagMutability.IMMUTABLE,
    });

    new Repository(stack, 'opensearch-dashboards', {
      repositoryName: 'opensearch-dashboards',
      imageTagMutability: TagMutability.IMMUTABLE,
    });
  }
}
