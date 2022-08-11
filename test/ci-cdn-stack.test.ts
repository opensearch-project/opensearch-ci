/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CiCdnStack } from '../lib/ci-cdn-stack';

test('CDN Stack Resources', () => {
  const cdnApp = new App({
    context: { useSsl: 'true', runWithOidc: 'true', additionalCommands: './test/data/hello-world.py' },
  });

  // WHEN
  const cdnStack = new CiCdnStack(cdnApp, 'cdnTestStack', {});
  const template = Template.fromStack(cdnStack);

  // THEN
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::IAM::Policy', 2);
  template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  template.resourceCountIs('AWS::Lambda::Function', 1);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        DefaultTTL: 300,
      },
    },
  });
});

test('CDN Stack Resources With mac agent', () => {
  const cdnApp = new App({
    context: {
      useSsl: 'true', runWithOidc: 'true', additionalCommands: './test/data/hello-world.py', macAgent: true,
    },
  });

  // WHEN
  const cdnStack = new CiCdnStack(cdnApp, 'cdnTestStack', {});
  const template = Template.fromStack(cdnStack);

  // THEN
  template.resourceCountIs('AWS::IAM::Role', 2);
  template.resourceCountIs('AWS::IAM::Policy', 2);
  template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 1);
  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  template.resourceCountIs('AWS::Lambda::Function', 1);
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultCacheBehavior: {
        DefaultTTL: 300,
      },
    },
  });
});
