/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import {
  ArnPrincipal, Effect, Policy, PolicyStatement, Role,
} from 'aws-cdk-lib/aws-iam';
import { CiCdnStack } from '../ci-cdn-stack';

export interface buildArtifactProps {
  mainNodeArn: string,
  agentNodeArn: string,
  buildBucketArn: string
}

export class BuildArtifactsPermissions {
  private static readonly BUNDLE_ROLE_NAME = 'opensearch-bundle';

  constructor(stack: CiCdnStack, props: buildArtifactProps) {
    const opensearchBundleRole = new Role(stack, BuildArtifactsPermissions.BUNDLE_ROLE_NAME, {
      assumedBy: Role.fromRoleArn(stack, 'MainNodeRole', `${props.mainNodeArn}`),
      roleName: 'opensearch-bundle',
    });

    opensearchBundleRole.assumeRolePolicy?.addStatements(new PolicyStatement({
      actions: ['sts:AssumeRole'],
      principals: [new ArnPrincipal(`${props.agentNodeArn}`)],
    }));

    const opensearchBundlePolicies = BuildArtifactsPermissions.getOpensearchBundlePolicies(stack, props.buildBucketArn);
    opensearchBundlePolicies.forEach((policy) => {
      policy.attachToRole(opensearchBundleRole);
    });
  }

  private static getOpensearchBundlePolicies(scope: Stack, s3BucketArn: string): Policy[] {
    const policies: Policy[] = [];
    const signingPolicy = new Policy(scope, 'signing-policy', {
      statements: [
        new PolicyStatement(
          {
            actions: ['sts:AssumeRole'],
            resources: ['arn:aws:iam::447201093745:role/OpenSearchSignerPGPSigning-ArtifactAccessRole'],
            effect: Effect.ALLOW,
          },
        ),
      ],
    });

    const openSearchBundlePolicy = new Policy(scope, 'opensearch-bundle-policy', {
      statements: [
        new PolicyStatement({
          actions: [
            's3:GetObject*',
            's3:ListBucket',
          ],
          resources: [`${s3BucketArn}`],
          effect: Effect.ALLOW,
        }),
        new PolicyStatement(
          {
            actions: [
              's3:GetObject*',
              's3:ListBucket',
              's3:PutObject',
              's3:PutObjectLegalHold',
              's3:PutObjectRetention',
              's3:PutObjectTagging',
              's3:PutObjectVersionTagging',
              's3:Abort*',
            ],
            resources: [
              `${s3BucketArn}/*/builds/*`,
              `${s3BucketArn}/*/shas/*`,
              `${s3BucketArn}/*/dist/*`,
              `${s3BucketArn}/*/index.json`,
            ],
            effect: Effect.ALLOW,
          },
        ),
      ],
    });
    policies.push(signingPolicy, openSearchBundlePolicy);
    return policies;
  }
}
