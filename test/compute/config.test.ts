/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dump, load } from 'js-yaml';
import { EnvConfig } from '../../lib/compute/env-config';
import { JenkinsMainNode } from '../../lib/compute/jenkins-main-node';
import { ViewsConfig } from '../../lib/compute/views';

describe('Config', () => {
  // WHEN
  const jenkinsYaml: any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));

  const envVarConfig = EnvConfig.addEnvConfigToJenkinsYaml(jenkinsYaml, 'test/data/env.yaml');
  const viewsConfig = ViewsConfig.addViewsConfigToJenkinsYaml(jenkinsYaml);

  // THEN
  test('Verify env variables', async () => {
    const envConfig = {
      envVars: {
        env: [
          { key: 's3Bucket', value: 'artifactBucket' },
          { key: 'account', value: 1234 },
          { key: 'isStaging', value: true },
          { key: 'url', value: 'https://url.com' },
        ],
      },
    };
    const addedEnvConfig = jenkinsYaml.jenkins.globalNodeProperties;
    expect(addedEnvConfig).toEqual([envConfig]);
  });

  test('Verify logger', async () => {
    const workflowLogger = {
      recorders: [
        {
          name: 'workflowRun',
          loggers: [{
            level: 'FINE',
            name: 'org.jenkinsci.plugins.workflow.job.WorkflowRun',
          },
          ],
        },
      ],
    };
    const getlog = jenkinsYaml.jenkins.log;
    expect(getlog).toEqual(workflowLogger);
  });

  test('Verify views', async () => {
    const buildView = {
      list: {
        columns: [
          'status',
          'weather',
          'jobName',
          'lastSuccess',
          'lastFailure',
          'lastDuration',
          'buildButton',
          'favoriteColumn',
        ],
        includeRegex: '.*build.*',
        name: 'Build',
      },
    };
    const testView = {
      list: {
        columns: [
          'status',
          'weather',
          'jobName',
          'lastSuccess',
          'lastFailure',
          'lastDuration',
          'buildButton',
          'favoriteColumn',
        ],
        includeRegex: '.*test.*',
        name: 'Test',
      },
    };
    const releaseView = {
      list: {
        columns: [
          'status',
          'weather',
          'jobName',
          'lastSuccess',
          'lastFailure',
          'lastDuration',
          'buildButton',
          'favoriteColumn',
        ],
        includeRegex: '.*release.*',
        name: 'Release',
      },
    };
    const miscView = {
      list: {
        columns: [
          'status',
          'weather',
          'jobName',
          'lastSuccess',
          'lastFailure',
          'lastDuration',
          'buildButton',
          'favoriteColumn',
        ],
        includeRegex: '(?!.*(test|build|release).*).*',
        name: 'Misc',
      },
    };
    const getViews = jenkinsYaml.jenkins.views;
    expect(getViews).toContainEqual(buildView);
    expect(getViews).toContainEqual(testView);
    expect(getViews).toContainEqual(releaseView);
    expect(getViews).toContainEqual(miscView);
  });
});
