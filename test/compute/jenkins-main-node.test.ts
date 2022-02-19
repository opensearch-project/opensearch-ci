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
    oidcCredArn: 'ARN:DEF',
    runWithOidc: false,
  });

  // THEN
  test('Config elements expected counts', async () => {
    expect(configElements.filter((e) => e.elementType === 'COMMAND')).toHaveLength(37);
    expect(configElements.filter((e) => e.elementType === 'PACKAGE')).toHaveLength(14);
    expect(configElements.filter((e) => e.elementType === 'FILE')).toHaveLength(3);
  });

  test('Does not use service in config elements', async () => {
    expect(configElements.filter((e) => e.elementType === 'SERVICE')).toHaveLength(0);
  });
});

test('Verify config.xml fields for jenkins OIDC', async () => {
  expect(JenkinsMainNode.oidcConfigFields()).toBeInstanceOf(Array);

  const oidcConfigFields : string[][] = [['clientId', 'replace'],
    ['clientSecret', 'replace'],
    ['wellKnownOpenIDConfigurationUrl', 'replace'],
    ['tokenServerUrl', 'replace'],
    ['authorizationServerUrl', 'replace'],
    ['userInfoServerUrl', 'replace'],
    ['userNameField', 'sub'],
    ['scopes', 'openid'],
    ['disableSslVerification', 'false'],
    ['logoutFromOpenidProvider', 'true'],
    ['postLogoutRedirectUrl', ''],
    ['escapeHatchEnabled', 'false'],
    ['escapeHatchSecret', 'random']];

  expect(JSON.stringify(JenkinsMainNode.oidcConfigFields()) === JSON.stringify(oidcConfigFields)).toBeTruthy();
});

test('Verify config.xml fields for jenkins Role Based Auth', async () => {
  expect(JenkinsMainNode.rolePermissions()).toBeInstanceOf(Array);

  const rolePermissions : string[] = ['hudson.model.Hudson.Manage',
    'hudson.model.Computer.Connect',
    'hudson.model.Hudson.UploadPlugins',
    'com.synopsys.arc.jenkins.plugins.ownership.OwnershipPlugin.Jobs',
    'hudson.model.Hudson.ConfigureUpdateCenter',
    'hudson.model.Hudson.Administer',
    'hudson.model.Item.Cancel',
    'com.cloudbees.plugins.credentials.CredentialsProvider.View',
    'hudson.model.Computer.Delete',
    'hudson.model.Item.Build',
    'hudson.plugins.jobConfigHistory.JobConfigHistory.DeleteEntry',
    'hudson.model.Item.Move',
    'com.cloudbees.plugins.credentials.CredentialsProvider.Update',
    'org.jenkins.plugins.lockableresources.LockableResourcesManager.Steal',
    'hudson.model.Item.Create',
    'com.cloudbees.plugins.credentials.CredentialsProvider.Delete',
    'hudson.model.Run.Replay',
    'hudson.model.Item.WipeOut',
    'hudson.model.Hudson.RunScripts',
    'hudson.model.Hudson.SystemRead',
    'hudson.model.View.Create',
    'hudson.model.Computer.ExtendedRead',
    'hudson.model.Computer.Configure',
    'com.synopsys.arc.jenkins.plugins.ownership.OwnershipPlugin.Nodes',
    'com.cloudbees.plugins.credentials.CredentialsProvider.UseOwn',
    'hudson.model.Run.Update',
    'hudson.model.View.Delete',
    'hudson.model.Run.Delete',
    'com.cloudbees.plugins.credentials.CredentialsProvider.ManageDomains',
    'hudson.model.Computer.Create',
    'hudson.model.View.Configure',
    'hudson.model.Computer.Build',
    'hudson.model.Item.Configure',
    'hudson.model.Item.Read',
    'org.jenkins.plugins.lockableresources.LockableResourcesManager.Unlock',
    'hudson.model.Item.ExtendedRead',
    'hudson.scm.SCM.Tag',
    'hudson.model.Item.Discover',
    'hudson.model.Hudson.Read',
    'hudson.model.Item.Workspace',
    'hudson.model.Computer.Provision',
    'hudson.model.View.Read',
    'org.jenkins.plugins.lockableresources.LockableResourcesManager.View',
    'hudson.model.Item.Delete',
    'com.cloudbees.plugins.credentials.CredentialsProvider.Create',
    'hudson.model.Computer.Disconnect',
    'hudson.model.Run.Artifacts',
    'com.cloudbees.plugins.credentials.CredentialsProvider.UseItem',
    'org.jenkins.plugins.lockableresources.LockableResourcesManager.Reserve'];

  expect(JSON.stringify(JenkinsMainNode.rolePermissions()) === JSON.stringify(rolePermissions)).toBeTruthy();
});

test('Verify initial admin users for when OIDC is enabled', async () => {
  expect(JenkinsMainNode.admins()).toBeInstanceOf(Array);

  const admins : string[] = [
    'admin',
    'gaiksaya',
    'zhujiaxi',
    'abhng',
    'bbarani',
    'zelinhao',
  ];

  expect(JSON.stringify(JenkinsMainNode.admins()) === JSON.stringify(admins)).toBeTruthy();
});

test('createPluginInstallCommands breaks apart many plugins', async () => {
  const plugins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `${n}`);
  const commands = JenkinsMainNode.createPluginInstallCommands(plugins);
  expect(commands).toHaveLength(2);
});

test('createPluginInstallCommands works with one plugin', async () => {
  const plugins = ['0'];
  const commands = JenkinsMainNode.createPluginInstallCommands(plugins);
  expect(commands).toHaveLength(1);
});
