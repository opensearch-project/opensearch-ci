/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

export class JenkinsMainNodeConfig {
  public static oidcConfigFields() : string[][] {
    return [['clientId', 'replace'],
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
  }

  public static adminRolePermissions() : string[] {
    return ['hudson.model.Hudson.Manage',
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
  }

  public static readOnlyRolePermissions(): string[] {
    return [
      'hudson.model.Hudson.Read',
      'hudson.model.Item.Read',
    ];
  }
}
