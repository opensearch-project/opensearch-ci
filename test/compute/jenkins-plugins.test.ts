/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { JenkinsPlugins } from '../../lib/compute/jenkins-plugins';

test('Verify if the plugin list is sorted', async () => {
  const sortedPluginsArr = JenkinsPlugins.plugins.slice().sort();
  expect(JSON.stringify(sortedPluginsArr) === JSON.stringify(JenkinsPlugins.plugins)).toBeTruthy();
});
