/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */
import { readFileSync, writeFileSync } from 'fs';
import { load, dump } from 'js-yaml';
import { JenkinsMainNode } from './jenkins-main-node';

export class OidcConfig {
    public static readonly adminRolePermissions: string[] = [
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
      'Lockable Resources/View',
      'Lockable Resources/Unlock',
      'Lockable Resources/Reserve',
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

    public static readonly readOnlyRolePermissions: string[] = [
      'Overall/Read',
      'Job/Read',
    ];

    public static addOidcConfigToJenkinsYaml(newYamlPath: string, admins?: string[]): void {
      const jenkinsYaml: any = load(readFileSync(JenkinsMainNode.BASE_JENKINS_YAML_PATH, 'utf-8'));
      let adminUsers: string[] = ['admin'];
      const readOnlyUsers: string[] = ['anyonomous'];

      if (admins) {
        adminUsers = adminUsers.concat(admins);
      }

      const oidcConfig: { [x: string]: any; } = {
        oic: {
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
        },
      };
      const rolesAndPermissions: { [x: string]: any; } = {
        authorizationStrategy: {
          roleBased: {
            roles: {
              global: [{
                assignments: adminUsers,
                name: 'admin',
                pattern: '.*',
                permissions: OidcConfig.adminRolePermissions
                ,
              },
              {
                assignments: readOnlyUsers,
                name: 'read',
                pattern: '.*',
                permissions: OidcConfig.readOnlyRolePermissions,
              },

              ],
            },
          },
        },
      };
      delete jenkinsYaml.jenkins.securityRealm.local;
      delete jenkinsYaml.jenkins.authorizationStrategy;
      jenkinsYaml.jenkins = rolesAndPermissions;
      jenkinsYaml.jenkins.securityRealm = oidcConfig;
      const newyaml = dump(jenkinsYaml);
      writeFileSync(newYamlPath, newyaml, 'utf-8');
    }
}
