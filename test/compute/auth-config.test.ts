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
import { AuthConfig, FineGrainedAccessSpecs } from '../../lib/compute/auth-config';

describe('Test authType OIDC', () => {
  // WHEN
  const oidcConfig = {
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    disableSslVerification: false,
    userNameField: 'sub',
    escapeHatchEnabled: false,
    logoutFromOpenidProvider: true,
    postLogoutRedirectUrl: '',
    escapeHatchSecret: 'random',
    serverConfiguration: {},
  };
  const admins = ['admin1', 'admin2'];
  const yml : any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
  AuthConfig.addOidcConfigToJenkinsYaml(yml, 'oidc', admins);

  // THEN
  test('Verify oidcConfig', async () => {
    const addedOidcConfig = yml.jenkins.securityRealm.oic;
    expect(addedOidcConfig).toEqual(oidcConfig);
  });

  test('Verify admins', async () => {
    const adminRole = yml.jenkins.authorizationStrategy.roleBased.roles.global[0].entries;
    const adminUsernames = adminRole.map((entry: { user: any; }) => entry.user);
    expect(adminUsernames).toEqual(['admin', 'admin1', 'admin2']);
  });
});

describe('Test authType github', () => {
  // WHEN
  const admins = ['foo', 'bar'];
  const yml: any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
  const fineGrainedAccess: FineGrainedAccessSpecs = {
    users: ['user1', 'user2', 'user3'],
    roleName: 'builder-job-role',
    pattern: '((distribution|integ).*)',
    templateName: 'builder-template',
  };
  AuthConfig.addOidcConfigToJenkinsYaml(yml, 'github', admins, [fineGrainedAccess]);
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
    expect(adminUsers).toEqual(['admin', 'foo', 'bar']);
  });

  test('Verify read only access', async () => {
    // Find the read role
    const readRole = globalRoles.find((role: any) => role.name === 'read');
    expect(readRole).toBeTruthy();

    // Check read users
    const readUsers = readRole.entries.map((entry: any) => entry.user);
    expect(readUsers).toEqual(['anonymous', 'authenticated']);
  });

  test('Verify fine grained access', async () => {
    // Find the builder role
    const builderRole = yml.jenkins.authorizationStrategy.roleBased.roles.items.find((role: any) => role.name === 'builder-job-role');

    // Check users
    const buildUsers = builderRole.entries.map((entry: any) => entry.user);
    expect(buildUsers).toEqual(['user1', 'user2', 'user3']);
  });
});
