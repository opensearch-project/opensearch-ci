/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  AutoScalingGroup, BlockDeviceVolume, Monitoring, Signals,
} from 'aws-cdk-lib/aws-autoscaling';
import { Metric, Unit } from 'aws-cdk-lib/aws-cloudwatch';
import {
  AmazonLinuxCpuType,
  CloudFormationInit,
  InitCommand,
  InitElement,
  InitFile,
  InitPackage,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { FileSystem, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import {
  IManagedPolicy, ManagedPolicy, PolicyStatement, Role, ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { writeFileSync } from 'fs';
import { dump } from 'js-yaml';
import { join } from 'path';
import { CloudwatchAgent } from '../constructs/cloudwatch-agent';
import { AgentNodeConfig, AgentNodeNetworkProps, AgentNodeProps } from './agent-node-config';
import { EnvConfig } from './env-config';
import { OidcConfig } from './oidc-config';
import { ViewsConfig } from './views';

interface HttpConfigProps {
  readonly redirectUrlArn: string;
  readonly sslCertContentsArn: string;
  readonly sslCertChainArn: string;
  readonly sslCertPrivateKeyContentsArn: string;
  readonly useSsl: boolean;
}

interface OidcFederateProps {
  readonly oidcCredArn: string;
  readonly runWithOidc: boolean;
  readonly adminUsers?: string[];
}

interface DataRetentionProps {
  readonly dataRetention?: boolean;
  readonly efsSG?: SecurityGroup;
}

export interface JenkinsMainNodeProps extends HttpConfigProps, OidcFederateProps, AgentNodeNetworkProps, DataRetentionProps {
  readonly vpc: Vpc;
  readonly sg: SecurityGroup;
  readonly envVarsFilePath: string;
  readonly reloadPasswordSecretsArn: string;
  readonly enableViews: boolean;
  readonly failOnCloudInitError?: boolean;
}

export class JenkinsMainNode {
  static readonly BASE_JENKINS_YAML_PATH: string = join(__dirname, '../../resources/baseJenkins.yaml');

  static readonly NEW_JENKINS_YAML_PATH: string = join(__dirname, '../../resources/jenkins.yaml');

  static readonly CERTIFICATE_FILE_PATH: String = '/etc/ssl/certs/test-jenkins.opensearch.org.crt';

  static readonly CERTIFICATE_CHAIN_FILE_PATH: String = '/etc/ssl/certs/test-jenkins.opensearch.org.pem';

  static readonly PRIVATE_KEY_PATH: String = '/etc/ssl/private/test-jenkins.opensearch.org.key';

  static readonly JENKINS_DEFAULT_ID_PASS_PATH: String = '/var/lib/jenkins/secrets/myIdPassDefault';

  private readonly EFS_ID: string;

  private static ACCOUNT: string;

  private static STACKREGION: string

  public readonly mainNodeAsg: AutoScalingGroup;

  public readonly ec2InstanceMetrics: {
    memUsed: Metric,
    foundJenkinsProcessCount: Metric
  }

  constructor(stack: Stack, props: JenkinsMainNodeProps, agentNode: AgentNodeProps[], macAgent: string, assumeRole?: string[]) {
    this.ec2InstanceMetrics = {
      memUsed: new Metric({
        metricName: 'mem_used_percent',
        namespace: `${stack.stackName}/JenkinsMainNode`,
      }),
      foundJenkinsProcessCount: new Metric({
        metricName: 'procstat_lookup_pid_count',
        namespace: `${stack.stackName}/JenkinsMainNode`,
      }),
    };

    const agentNodeConfig = new AgentNodeConfig(stack, assumeRole);
    const jenkinsyaml = JenkinsMainNode.addConfigtoJenkinsYaml(stack, props, props, agentNodeConfig, props, agentNode, macAgent);
    if (props.dataRetention) {
      const efs = new FileSystem(stack, 'EFSfilesystem', {
        vpc: props.vpc,
        encrypted: true,
        enableAutomaticBackups: true,
        performanceMode: PerformanceMode.GENERAL_PURPOSE,
        throughputMode: ThroughputMode.BURSTING,
        securityGroup: props.efsSG,
      });
      this.EFS_ID = efs.fileSystemId;
    }
    this.mainNodeAsg = new AutoScalingGroup(stack, 'MainNodeAsg', {
      instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.XLARGE9),
      machineImage: MachineImage.latestAmazonLinux2023({
        cpuType: AmazonLinuxCpuType.X86_64,
      }),
      role: new Role(stack, 'OpenSearch-CI-MainNodeRole', {
        roleName: 'OpenSearch-CI-MainNodeRole',
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      }),
      initOptions: {
        ignoreFailures: props.failOnCloudInitError ?? true,
      },
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
      minCapacity: 1,
      maxCapacity: 1,
      desiredCapacity: 1,
      securityGroup: props.sg,
      init: CloudFormationInit.fromElements(...JenkinsMainNode.configElements(
        stack.stackName,
        stack.region,
        props,
        props,
        props,
        jenkinsyaml,
        props.reloadPasswordSecretsArn,
        this.EFS_ID,
      )),
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: BlockDeviceVolume.ebs(100, { encrypted: true, deleteOnTermination: true }),
      }],
      signals: Signals.waitForAll({
        timeout: Duration.minutes(20),
      }),
      requireImdsv2: true,
      instanceMonitoring: Monitoring.DETAILED,
    });

    JenkinsMainNode.createPoliciesForMainNode(stack).map(
      (policy) => this.mainNodeAsg.role.addManagedPolicy(policy),
    );

    new CfnOutput(stack, 'Jenkins Main Node Role Arn', {
      value: this.mainNodeAsg.role.roleArn,
      exportName: 'mainNodeRoleArn',
    });
  }

  public static createPoliciesForMainNode(stack: Stack): (IManagedPolicy | ManagedPolicy)[] {
    this.STACKREGION = stack.region;
    this.ACCOUNT = stack.account;

    // Policy for SSM management of the host - Removes the need of SSH keys
    const ec2SsmManagementPolicy = ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore');

    // Policy for EC2 instance to publish logs and metrics to cloudwatch
    const cloudwatchEventPublishingPolicy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy');

    const accessPolicy = ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite');

    // Main jenkins node will start/stop agent ec2 instances to run build jobs
    const mainJenkinsNodePolicy = new ManagedPolicy(stack, 'MainJenkinsNodePolicy',
      {
        description: 'Policy for a main jenkins node',
        statements: [new PolicyStatement({
          actions: [
            'ec2:DescribeSpotInstanceRequests',
            'ec2:ModifyInstanceMetadataOptions',
            'ec2:CancelSpotInstanceRequests',
            'ec2:GetConsoleOutput',
            'ec2:RequestSpotInstances',
            'ec2:RunInstances',
            'ec2:StartInstances',
            'ec2:StopInstances',
            'ec2:TerminateInstances',
            'ec2:CreateTags',
            'ec2:DeleteTags',
            'ec2:DescribeInstances',
            'ec2:DescribeKeyPairs',
            'ec2:DescribeRegions',
            'ec2:DescribeImages',
            'ec2:DescribeAvailabilityZones',
            'ec2:DescribeSecurityGroups',
            'ec2:DescribeSubnets',
            'iam:ListInstanceProfilesForRole',
            'iam:PassRole',
            'logs:CreateLogDelivery',
            'logs:DeleteLogDelivery',
            'secretsmanager:GetSecretValue',
            'secretsmanager:ListSecrets',
            'sts:AssumeRole',
            'elasticfilesystem:DescribeFileSystems',
            'elasticfilesystem:DescribeMountTargets',
            'ec2:DescribeAvailabilityZones',
            'ec2:GetPasswordData',
          ],
          resources: ['*'],
          conditions: {
            'ForAllValues:StringEquals': {
              'aws:RequestedRegion': this.STACKREGION,
              'aws:PrincipalAccount': this.ACCOUNT,
            },
          },
        })],
      });

    return [ec2SsmManagementPolicy, cloudwatchEventPublishingPolicy, accessPolicy, mainJenkinsNodePolicy];
  }

  public static configElements(stackName: string, stackRegion: string, httpConfigProps: HttpConfigProps,
    oidcFederateProps: OidcFederateProps, dataRetentionProps: DataRetentionProps, jenkinsyaml: string,
    reloadPasswordSecretsArn: string, efsId?: string): InitElement[] {
    return [
      InitPackage.yum('wget'),
      InitPackage.yum('cronie'),
      InitPackage.yum('openssl'),
      InitPackage.yum('mod_ssl'),
      InitPackage.yum('amazon-efs-utils'),
      InitCommand.shellCommand('amazon-linux-extras install java-openjdk11 -y'),
      InitPackage.yum('docker'),
      InitPackage.yum('python3'),
      InitPackage.yum('python3-pip.noarch'),
      InitCommand.shellCommand('pip3 install botocore'),
      InitCommand.shellCommand('systemctl enable crond.service'),
      InitCommand.shellCommand('systemctl start crond.service'),
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('sudo wget -nv https://github.com/mikefarah/yq/releases/download/v4.22.1/yq_linux_amd64 -O /usr/bin/yq && sudo chmod +x /usr/bin/yq'),
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('sudo curl -L https://github.com/docker/compose/releases/download/v2.9.0/docker-compose-$(uname -s)-$(uname -m) -o /usr/bin/docker-compose && sudo chmod +x /usr/bin/docker-compose'),
      InitCommand.shellCommand('python3 -m pip install --upgrade pip && python3 -m pip install cryptography boto3 requests-aws4auth'),

      InitCommand.shellCommand(httpConfigProps.useSsl
        // eslint-disable-next-line max-len
        ? `aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertContentsArn} --query SecretString --output text  > ${JenkinsMainNode.CERTIFICATE_FILE_PATH}`
        : 'echo useSsl is false, not creating cert file'),

      InitCommand.shellCommand(httpConfigProps.useSsl
        // eslint-disable-next-line max-len
        ? `aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertChainArn} --query SecretString --output text  > ${JenkinsMainNode.CERTIFICATE_CHAIN_FILE_PATH}`
        : 'echo useSsl is false, not creating cert-chain file'),

      InitCommand.shellCommand(httpConfigProps.useSsl
        // eslint-disable-next-line max-len
        ? `mkdir /etc/ssl/private/ && aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertPrivateKeyContentsArn} --query SecretString --output text  > ${JenkinsMainNode.PRIVATE_KEY_PATH}`
        : 'echo useSsl is false, not creating key file'),

      // Local reverse proxy is used
      InitPackage.yum('httpd'),

      // Change hop limit for IMDSv2 from 1 to 2
      InitCommand.shellCommand('TOKEN=`curl -f -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` &&'
      + ' instance_id=`curl -f -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id` && echo $ami_id &&'
      + ` aws ec2 --region ${stackRegion} modify-instance-metadata-options --instance-id $instance_id --http-put-response-hop-limit 2`),

      // Jenkins CVE https://www.jenkins.io/security/advisory/2024-01-24/ mitigation
      InitCommand.shellCommand('mkdir -p /var/lib/jenkins/init.groovy.d'),
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('sudo curl -SL https://raw.githubusercontent.com/jenkinsci-cert/SECURITY-3314-3315/55c15104fb70d6a2b46fd3f8ba7dec3913a4b1db/disable-cli.groovy -o /var/lib/jenkins/init.groovy.d/disable-cli.groovy'),

      // Configuration to proxy jenkins on :8080 -> :80
      InitFile.fromString('/etc/httpd/conf.d/jenkins.conf',
        httpConfigProps.useSsl
          // eslint-disable-next-line no-useless-escape,max-len
          ? `LogFormat "%{X-Forwarded-For}i %h %l %u %t \\\"%r\\\" %>s %b \\\"%{Referer}i\\\" \\\"%{User-Agent}i\\\"" combined
            <VirtualHost *:80>
                ServerAdmin  webmaster@localhost
                Redirect permanent / https://replace_url.com/
            </VirtualHost>
            <VirtualHost *:443>
                SSLEngine on
                SSLCertificateFile ${JenkinsMainNode.CERTIFICATE_FILE_PATH}
                SSLCertificateKeyFile ${JenkinsMainNode.PRIVATE_KEY_PATH}
                SSLCertificateChainFile ${JenkinsMainNode.CERTIFICATE_CHAIN_FILE_PATH}
                ServerAdmin  webmaster@localhost
                ProxyRequests     Off
                ProxyPreserveHost On
                AllowEncodedSlashes NoDecode
                <Proxy *>
                    Order deny,allow
                    Allow from all
                </Proxy>
                ProxyPass         /  http://localhost:8080/ nocanon
                ProxyPassReverse  /  http://localhost:8080/
                ProxyPassReverse  /  http://replace_url.com/
                RequestHeader set X-Forwarded-Proto "https"
                RequestHeader set X-Forwarded-Port "443"
            </VirtualHost>
            <IfModule mod_headers.c>
              Header unset Server
            </IfModule>`
          // eslint-disable-next-line no-useless-escape,max-len
          : `LogFormat "%{X-Forwarded-For}i %h %l %u %t \\\"%r\\\" %>s %b \\\"%{Referer}i\\\" \\\"%{User-Agent}i\\\"" combined
            <VirtualHost *:80>
            ServerAdmin  webmaster@127.0.0.1
            ProxyRequests     Off
            ProxyPreserveHost On
            AllowEncodedSlashes NoDecode
          
            <Proxy http://127.0.0.1:8080/>
                Order deny,allow
                Allow from all
            </Proxy>
          
            ProxyPass         /  http://127.0.0.1:8080/ nocanon
            ProxyPassReverse  /  http://127.0.0.1:8080/
        </VirtualHost>`),

      // replacing the jenkins redirect url if the using ssl
      InitCommand.shellCommand(httpConfigProps.useSsl
        ? `var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.redirectUrlArn} --query SecretString --output text\``
        + ' && sed -i "s,https://replace_url.com/,$var," /etc/httpd/conf.d/jenkins.conf'
        : 'echo Not altering the jenkins url'),

      // Auto redirect http to https if ssl is enabled
      InitCommand.shellCommand(httpConfigProps.useSsl
        ? `var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.redirectUrlArn} --query SecretString --output text\``
        + '&& newVar=`echo $var | sed \'s/https/http/g\'` && sed -i "s,http://replace_url.com/,$newVar," /etc/httpd/conf.d/jenkins.conf'
        : 'echo Not altering the ProxyPassReverse url'),

      InitCommand.shellCommand('systemctl start httpd'),

      InitPackage.yum('amazon-cloudwatch-agent'),

      CloudwatchAgent.asInitFile('/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json', {
        agent: {
          metrics_collection_interval: 60, // seconds between collections
          logfile: '/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log',
          omit_hostname: true,
          debug: false,
        },
        metrics: {
          namespace: `${stackName}/JenkinsMainNode`,
          append_dimensions: {
            // eslint-disable-next-line no-template-curly-in-string
            InstanceId: '${aws:InstanceId}',
          },
          aggregation_dimensions: [[]], // Create rollups without instance id
          metrics_collected: {
            procstat: [
              {
                pattern: 'jenkins.war',
                measurement: [
                  'cpu_usage',
                  'cpu_time_system',
                  'cpu_time_user',
                  'read_bytes',
                  'write_bytes',
                  'pid_count',
                ],
                metrics_collection_interval: 10,
              },
            ],
            mem: {
              measurement: [
                { name: 'available_percent', unit: Unit.PERCENT },
                { name: 'used_percent', unit: Unit.PERCENT },
                { name: 'mem_total', unit: Unit.BYTES },
              ],
              metrics_collection_interval: 1, // capture every second
            },
          },
        },
        logs: {
          logs_collected: {
            files: {
              collect_list: [
                {
                  file_path: '/var/lib/jenkins/logs/custom/workflowRun.log',
                  log_group_name: 'JenkinsMainNode/workflow.log',
                  auto_removal: true,
                  log_stream_name: 'workflow-logs',
                },
              ],
            },
          },
          force_flush_interval: 5,
        },
      }),
      InitCommand.shellCommand('/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a stop'),
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s'),

      InitCommand.shellCommand(dataRetentionProps.dataRetention
        ? `mkdir /var/lib/jenkins && mount -t efs ${efsId} /var/lib/jenkins`
        : 'echo Data rentention is disabled, not mounting efs'),

      InitFile.fromFileInline('/docker-compose.yml', join(__dirname, '../../resources/docker-compose.yml')),

      InitCommand.shellCommand('systemctl start docker &&'
        + ` var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${reloadPasswordSecretsArn} --query SecretString --output text\` &&`
        + ' yq -i \'.services.jenkins.environment[1] = "CASC_RELOAD_TOKEN=\'$var\'"\' docker-compose.yml &&'
        + ' docker-compose up -d'),

      // Commands are fired one after the other but it does not wait for the command to complete.
      // Therefore, sleep 60 seconds to wait for jenkins to start
      InitCommand.shellCommand('sleep 60'),

      InitFile.fromFileInline('/initial_jenkins.yaml', jenkinsyaml),

      // Make any changes to initial jenkins.yaml
      InitCommand.shellCommand(oidcFederateProps.runWithOidc
        // eslint-disable-next-line max-len
        ? `var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${oidcFederateProps.oidcCredArn} --query SecretString --output text\` && `
        + ' varkeys=`echo $var | yq \'keys\' | cut -d "-" -f2 | cut -d " " -f2` &&'
        // eslint-disable-next-line max-len
        + ' for i in $varkeys; do newvalue=`echo $var | yq .$i` && myenv=$newvalue i=$i yq -i \'.jenkins.securityRealm.oic.[env(i)]=env(myenv)\' /initial_jenkins.yaml ; done'
        : 'echo No changes made to initial_jenkins.yaml with respect to OIDC'),

      InitCommand.shellCommand('while [[ "$(curl -s -o /dev/null -w \'\'%{http_code}\'\' localhost:8080/api/json?pretty)" != "200" ]]; do sleep 5; done'),

      // Reload configuration via Jenkins.yaml
      InitCommand.shellCommand('cp /initial_jenkins.yaml /var/lib/jenkins/jenkins.yaml &&'
        + ` var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${reloadPasswordSecretsArn} --query SecretString --output text\` &&`
        + ' curl  -f -X POST "http://localhost:8080/reload-configuration-as-code/?casc-reload-token=$var"'),
    ];
  }

  public static addConfigtoJenkinsYaml(stack: Stack, jenkinsMainNodeProps: JenkinsMainNodeProps, oidcProps: OidcFederateProps, agentNodeObject: AgentNodeConfig,
    props: AgentNodeNetworkProps, agentNode: AgentNodeProps[], macAgent: string): string {
    let updatedConfig = agentNodeObject.addAgentConfigToJenkinsYaml(stack, agentNode, props, macAgent);
    if (oidcProps.runWithOidc) {
      updatedConfig = OidcConfig.addOidcConfigToJenkinsYaml(updatedConfig, oidcProps.adminUsers);
    }
    if (jenkinsMainNodeProps.envVarsFilePath !== '' && jenkinsMainNodeProps.envVarsFilePath != null) {
      updatedConfig = EnvConfig.addEnvConfigToJenkinsYaml(updatedConfig, jenkinsMainNodeProps.envVarsFilePath);
    }
    if (jenkinsMainNodeProps.enableViews) {
      updatedConfig = ViewsConfig.addViewsConfigToJenkinsYaml(updatedConfig);
    }
    const newConfig = dump(updatedConfig);
    writeFileSync(JenkinsMainNode.NEW_JENKINS_YAML_PATH, newConfig, 'utf-8');
    return JenkinsMainNode.NEW_JENKINS_YAML_PATH;
  }
}
