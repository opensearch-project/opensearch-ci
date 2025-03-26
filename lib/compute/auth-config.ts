/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

export interface FineGrainedAccessSpecs {
  users: string[],
  roleName: string,
  pattern: string,
  templateName: string
}

export class AuthConfig {
  private static readonly adminRolePermissions: string[] = [
    'Overall/Administer',
    'Overall/Read',
    'Job/Move',
    'Job/Build',
    'Job/Read',
    'Job/Delete',
    'Job/Create',
    'Job/Discover',
    'Job/Cancel',
    'Job/Configure',
    'Job Config History/DeleteEntry',
    'Job/Workspace',
    'Credentials/Delete',
    'Credentials/ManageDomains',
    'Credentials/Update',
    'Credentials/View',
    'Credentials/Create',
    'Manage ownership/Nodes',
    'Manage ownership/Jobs',
    'Agent/Configure',
    'Agent/Create',
    'Agent/Build',
    'Agent/Provision',
    'Agent/Connect',
    'Agent/Delete',
    'Agent/Disconnect',
    'Run/Replay',
    'Run/Delete',
    'Run/Update',
    'View/Delete',
    'View/Read',
    'View/Create',
    'View/Configure',
    'SCM/Tag',
  ];

  private static readonly readOnlyRolePermissions: string[] = [
    'Overall/Read',
    'Job/Read',
    'View/Read',
  ];

  private static readonly builderTemplatePermissions: string[] = [
    'Job/Build',
    'Job/Cancel',
    'Job/Discover',
    'Job/Read',
    'Lockable Resources/View',
    'Run/Replay',
    'Metrics/View',
    'View/Read',
  ];

  public static addOidcConfigToJenkinsYaml(yamlObject: any, authType: string, admins?: string[], fineGrainedAccessItems?: FineGrainedAccessSpecs[]): any {
    const jenkinsYaml: any = yamlObject;
    let adminUsers: string[] = ['admin'];
    const readOnlyUsers: string[] = ['authenticated'];

    if (admins) {
      adminUsers = adminUsers.concat(admins);
    }

    const oidcConfig: { [x: string]: any; } = {
      oic: {
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        disableSslVerification: false,
        userNameField: 'sub',
        escapeHatchEnabled: false,
        logoutFromOpenidProvider: true,
        postLogoutRedirectUrl: '',
        escapeHatchSecret: 'random',
        serverConfiguration: {},
      },
    };

    const githubAuthConfig: { [x: string]: any; } = {
      github: {
        githubWebUri: 'https://github.com',
        githubApiUri: 'https://api.github.com',
        clientID: 'clientID',
        clientSecret: 'clientSecret',
        oauthScopes: 'read:org,user:email',
      },
    };

    const rolesAndPermissions: { [x: string]: any; } = {
      roleBased: {
        permissionTemplates: [{
          name: 'builder-template',
          permissions: AuthConfig.builderTemplatePermissions,
        }],
        roles: {
          global: [{
            entries: adminUsers.map((user) => ({ user })),
            name: 'admin',
            pattern: '.*',
            permissions: AuthConfig.adminRolePermissions
            ,
          },
          {
            entries: readOnlyUsers.map((user) => ({ user })),
            name: 'read',
            pattern: '.*',
            permissions: AuthConfig.readOnlyRolePermissions,
          },
          ],
        },
      },
    };

    jenkinsYaml.jenkins.authorizationStrategy = rolesAndPermissions;
    if (typeof fineGrainedAccessItems !== 'undefined') {
      jenkinsYaml.jenkins.authorizationStrategy.roleBased.roles.items = fineGrainedAccessItems.map((item) => ({
        entries: item.users.map((user) => ({ user })),
        name: item.roleName,
        pattern: item.pattern,
        templateName: item.templateName,
      }));
    }
    if (authType === 'github') {
      jenkinsYaml.jenkins.securityRealm = githubAuthConfig;
    } else {
      jenkinsYaml.jenkins.securityRealm = oidcConfig;
    }
    return jenkinsYaml;
  }
}
