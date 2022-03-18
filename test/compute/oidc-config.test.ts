/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { OidcConfig } from '../../lib/compute/oidc-config';

describe('JenkinsMainNode Config Elements', () => {
  // WHEN
  const testYaml = 'test/jenkins.yaml';

  const oidcConfig = {
    authorizationServerUrl: 'http://localhost',
    clientId: 'clientId',
    disableSslVerification: true,
    emailFieldName: 'emailFieldName',
    escapeHatchEnabled: true,
    escapeHatchGroup: 'escapeHatchGroup',
    escapeHatchUsername: 'escapeHatchUsername',
    fullNameFieldName: 'fullNameFieldName',
    groupsFieldName: 'groupsFieldName',
    logoutFromOpenidProvider: true,
    scopes: 'scopes',
    tokenServerUrl: 'http://localhost',
    userNameField: 'userNameField',
  };
  const admins = ['admin1', 'admin2'];
  OidcConfig.addOidcConfigToJenkinsYaml(testYaml, admins);
  const yml: any = load(readFileSync(testYaml, 'utf-8'));

  // THEN
  test('Verify oidcConfig', async () => {
    const addedOidcConfig = yml.jenkins.securityRealm.oic;
    expect(addedOidcConfig).toEqual(oidcConfig);
  });

  test('Verify oidcConfig', async () => {
    const adminRole = yml.jenkins.authorizationStrategy.roleBased.roles.global[0].assignments;
    expect(adminRole).toEqual(['admin', 'admin1', 'admin2']);
  });
});
