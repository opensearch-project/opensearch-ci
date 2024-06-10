/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { JenkinsMainNode } from '../../lib/compute/jenkins-main-node';

describe('JenkinsMainNode Config Elements', () => {
  // WHEN
  const configElements = JenkinsMainNode.configElements('MyTestStack', 'us-west-2', {
    redirectUrlArn: 'ARN:ABC',
    sslCertContentsArn: 'ARN:BCD',
    sslCertPrivateKeyContentsArn: 'ARN:CDE',
    sslCertChainArn: 'ARN:DEF',
    useSsl: true,
  }, {
    oidcCredArn: 'ABC:EFG',
    runWithOidc: true,
  }, {
    dataRetention: true,
  }, 'test/data/jenkins.yaml',
  'ARN:ABC');

  // THEN
  test('Config elements expected counts', async () => {
    expect(configElements.filter((e) => e.elementType === 'COMMAND')).toHaveLength(24);
    expect(configElements.filter((e) => e.elementType === 'PACKAGE')).toHaveLength(10);
    expect(configElements.filter((e) => e.elementType === 'FILE')).toHaveLength(4);
  });

  test('Does not use service in config elements', async () => {
    expect(configElements.filter((e) => e.elementType === 'SERVICE')).toHaveLength(0);
  });
});
