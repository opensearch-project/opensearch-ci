/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { JenkinsMainNodeBenchmark } from '../../lib/compute/jenkins-main-node-benchmark';

describe('JenkinsMainNode Config Elements', () => {
  // WHEN
  const configElements = JenkinsMainNodeBenchmark.configElements('MyTestStack', 'us-west-2', {
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
    expect(configElements.filter((e) => e.elementType === 'COMMAND')).toHaveLength(20);
    expect(configElements.filter((e) => e.elementType === 'PACKAGE')).toHaveLength(9);
    expect(configElements.filter((e) => e.elementType === 'FILE')).toHaveLength(4);
  });

  test('Does not use service in config elements', async () => {
    expect(configElements.filter((e) => e.elementType === 'SERVICE')).toHaveLength(0);
  });
});
