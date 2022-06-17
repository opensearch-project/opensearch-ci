/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from '@aws-cdk/core';
import { countResources, expect, haveResourceLike } from '@aws-cdk/assert';
import { CiCdnStack } from '../lib/ci-cdn-stack';

test('CDN Stack Resources', () => {
  const cdnApp = new App({
    context: { useSsl: 'true', runWithOidc: 'true', additionalCommands: './test/data/hello-world.py' },
  });

  // WHEN
  const cdnStack = new CiCdnStack(cdnApp, 'cdnTestStack', {});

  // THEN
  expect(cdnStack).to(countResources('AWS::IAM::Role', 2));
  expect(cdnStack).to(countResources('AWS::IAM::Policy', 2));
  expect(cdnStack).to(countResources('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1));
  expect(cdnStack).to(countResources('AWS::CloudFront::Distribution', 1));
  expect(cdnStack).to(haveResourceLike('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        DefaultTTL: 300,
      },
    },
  }));
  expect(cdnStack).to(countResources('AWS::Lambda::Function', 1));
});
