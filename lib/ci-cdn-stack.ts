/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ArtifactsPublicAccess } from './buildArtifacts/artifacts-public-access';
import { BuildArtifactsPermissions } from './buildArtifacts/build-artifacts-permissions';

export class CiCdnStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    const mainNodeRoleArn = Fn.importValue('mainNodeRoleArn');
    const agentNodeRoleArn = Fn.importValue('agentNodeRoleArn');
    const buildBucketArn = Fn.importValue('buildBucketArn');

    const buildArtifacts = new BuildArtifactsPermissions(this, {
      mainNodeArn: mainNodeRoleArn,
      agentNodeArn: agentNodeRoleArn,
      buildBucketArn,
    });

    const artifactPublicAccess = new ArtifactsPublicAccess(this, buildBucketArn);
  }
}
