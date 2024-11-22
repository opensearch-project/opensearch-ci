/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { JenkinsMainNode } from '../../lib/compute/jenkins-main-node';
import { AuthConfig } from '../../lib/compute/auth-config';

describe('Test authType OIDC', () => {
  // WHEN
  const testYaml = 'test/data/jenkins.yaml';

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
  const jenkinsYaml = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
  AuthConfig.addOidcConfigToJenkinsYaml(jenkinsYaml, 'oidc', admins);
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

describe('Test authType github', () => {
  // WHEN
  const testYaml = 'test/data/github_auth.yaml';
  const admins = ['foo', 'bar'];
  const jenkinsYaml = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
  AuthConfig.addOidcConfigToJenkinsYaml(jenkinsYaml, 'github', admins);
  const yml: any = load(readFileSync(testYaml, 'utf-8'));
  const globalRoles = yml.jenkins.authorizationStrategy.roleBased.roles.global;

  const githubAuthConfig: { [x: string]: any; } = {
    githubWebUri: 'https://github.com',
    githubApiUri: 'https://api.github.com',
    clientID: 'clientID',
    clientSecret: 'clientSecret',
    oauthScopes: 'read:org,user:email',
  };

  // THEN
  test('Verify github config', async () => {
    const addedGithubConfig = yml.jenkins.securityRealm.github;
    expect(addedGithubConfig).toEqual(githubAuthConfig);
  });

  test('Verify roles', async () => {
    const roleNames = globalRoles.map((role: any) => role.name);
    expect(roleNames).toEqual(['admin', 'read']);
  });

  test('Verify github admins', async () => {
    // Find the admin role
    const adminRole = globalRoles.find((role: any) => role.name === 'admin');

    // Check admin users
    const adminUsers = adminRole.entries.map((entry: any) => entry.user);
    expect(adminUsers).toEqual(['bar', 'foo']);
  });

  test('Verify read only', async () => {
    // Find the read role
    const readRole = globalRoles.find((role: any) => role.name === 'read');
    expect(readRole).toBeTruthy();

    // Check read users
    const readUsers = readRole.entries.map((entry: any) => entry.user);
    expect(readUsers).toEqual(['anonymous']);
  });
});
