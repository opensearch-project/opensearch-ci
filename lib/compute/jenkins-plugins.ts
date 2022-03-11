/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

export class JenkinsPlugins {
  // Below are the list of plugins (sorted alphabetically) and their dependencies currently in use in prod
  static readonly plugins: string[] = [
    'ace-editor:1.1',
    'adoptopenjdk:1.4',
    'ansicolor:1.0.0',
    'ant:1.13',
    'antisamy-markup-formatter:2.1',
    'apache-httpcomponents-client-4-api:4.5.13-1.0',
    'audit-trail:3.10',
    'authentication-tokens:1.4',
    'aws-credentials:189.v3551d5642995',
    'aws-java-sdk-cloudformation:1.12.148-310.v5e3b_c2681d79',
    'aws-secrets-manager-credentials-provider:0.5.6',
    'bootstrap4-api:4.6.0-3',
    'bouncycastle-api:2.25',
    'branch-api:2.6.2',
    'build-timeout:1.20',
    'build-timestamp:1.0.3',
    'build-with-parameters:1.6',
    'caffeine-api:2.9.2-29.v717aac953ff3',
    'checks-api:1.7.2',
    'cloudbees-folder:6.688.vfc7a_a_69059e0',
    'command-launcher:1.6',
    'config-file-provider:3.8.0',
    'configuration-as-code:1.55.1',
    'copyartifact:1.46.2',
    'credentials-binding:1.27.1',
    'credentials:2.6.1',
    'description-setter:1.10',
    'disable-github-multibranch-status:1.2',
    'display-url-api:2.3.5',
    'docker-commons:1.19',
    'docker-custom-build-environment:1.7.3',
    'docker-workflow:1.28',
    'durable-task:1.37',
    'ec2:1.58',
    'echarts-api:5.2.1-2',
    'email-ext:2.84',
    'environment-script:1.2.6',
    'extensible-choice-parameter:1.8.0',
    'external-monitor-job:191.v363d0d1efdf8',
    'font-awesome-api:5.15.4-1',
    'generic-webhook-trigger:1.83',
    'ghprb:1.42.2',
    'git-client:3.9.0',
    'git-parameter:0.9.13',
    'git-server:1.9',
    'git:4.8.3',
    'github-api:1.301-378.v9807bd746da5',
    'github-branch-source:2.9.9',
    'github:1.34.2',
    'gradle:1.38',
    'greenballs:1.15.1',
    'handlebars:3.0.8',
    'hidden-parameter:0.0.4',
    'ivy:2.1',
    'jackson2-api:2.13.1-246.va8a9f3eaf46a',
    'javadoc:217.v905b_86277a_2a_',
    'jdk-tool:1.5',
    'jjwt-api:0.11.2-9.c8b45b8bb173',
    'job-dsl:1.78.3',
    'job-restrictions:0.8',
    'jobConfigHistory:2.31-rc1107.2354f08725a_8',
    'jquery3-api:3.6.0-2',
    'jquery:1.12.4-1',
    'jsch:0.1.55.2',
    'junit:1.53',
    'ldap:1.26',
    'lockable-resources:2.14',
    'login-theme:1.1',
    'mailer:1.34.2',
    'managed-scripts:1.5.3',
    'matrix-auth:3.0.1',
    'matrix-project:1.18.1',
    'maven-plugin:3.8.1',
    'momentjs:1.1.1',
    'multi-branch-project-plugin:0.7',
    'node-iterator-api:1.5.1',
    'nodelabelparameter:1.9.2',
    'nvm-wrapper:0.1.7',
    'oic-auth:1.8',
    'okhttp-api:4.9.3-105.vb96869f8ac3a',
    'ownership:0.13.0',
    'pam-auth:1.6.1',
    'parameterized-scheduler:1.0',
    'pipeline-aws:1.43',
    'pipeline-build-step:2.16',
    'pipeline-github-lib:1.0',
    'pipeline-graph-analysis:1.11',
    'pipeline-input-step:427.va6441fa17010',
    'pipeline-milestone-step:1.3.2',
    'pipeline-model-api:1.9.3',
    'pipeline-model-definition:1.9.3',
    'pipeline-model-extensions:1.9.3',
    'pipeline-rest-api:2.21',
    'pipeline-stage-step:291.vf0a8a7aeeb50',
    'pipeline-stage-tags-metadata:1.9.3',
    'pipeline-stage-view:2.21',
    'plain-credentials:1.8',
    'plugin-util-api:2.5.0',
    'popper-api:1.16.1-2',
    'popper2-api:2.10.2-1',
    'postbuild-task:1.9',
    'postbuildscript:2.11.0',
    'powershell:1.7',
    'preSCMbuildstep:0.3',
    'project-description-setter:1.2',
    'python:1.3',
    'readonly-parameters:1.0.0',
    'rebuild:1.33',
    'resource-disposer:0.17',
    'role-strategy:3.2.0',
    's3:0.11.8.1',
    'saml:1.1.8',
    'scm-api:2.6.5',
    'script-security:1131.v8b_b_5eda_c328e',
    'simple-theme-plugin:103.va_161d09c38c7',
    'snakeyaml-api:1.29.1',
    'ssh-credentials:1.18.1',
    'ssh-slaves:1.31.5',
    'strict-crumb-issuer:2.1.0',
    'structs:308.v852b473a2b8c',
    'throttle-concurrents:2.6',
    'timestamper:1.16',
    'token-macro:2.13',
    'trilead-api:1.0.13',
    'uno-choice:2.5.7',
    'validating-string-parameter:2.8',
    'variant:1.4',
    'windows-slaves:1.8',
    'workflow-aggregator:2.6',
    'workflow-api:1138.v619fd5201b_2f',
    'workflow-basic-steps:2.24',
    'workflow-cps-global-lib:2.19',
    'workflow-cps:2659.v52d3de6044d0',
    'workflow-durable-task-step:2.40',
    'workflow-job:1145.v7f2433caa07f',
    'workflow-multibranch:2.24',
    'workflow-scm-step:2.13',
    'workflow-step-api:622.vb_8e7c15b_c95a_',
    'workflow-support:3.8',
    'ws-cleanup:0.40',
    'xml-job-to-job-dsl:0.1.13',
  ];
}
