/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from '@aws-cdk/core';
import {
  AmazonLinuxGeneration, BlockDeviceVolume, CloudFormationInit, InitCommand, InitElement, InitFile, InitPackage, Instance,
  InstanceClass, InstanceSize, InstanceType, MachineImage, SecurityGroup, SubnetType, Vpc,
} from '@aws-cdk/aws-ec2';
import { ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam';
import { Metric, Unit } from '@aws-cdk/aws-cloudwatch';
import { CloudwatchAgent } from '../constructs/cloudwatch-agent';
import { JenkinsPlugins } from './jenkins-plugins';

interface HttpConfigProps {
  readonly redirectUrlArn: string;
  readonly sslCertContentsArn: string;
  readonly sslCertPrivateKeyContentsArn: string;
  readonly useSsl: boolean;
}

interface OidcFederateProps {
  readonly oidcCredArn: string;
  readonly devMode: boolean;
}

export interface JenkinsMainNodeProps extends HttpConfigProps, OidcFederateProps{
  readonly vpc: Vpc;
  readonly sg: SecurityGroup;
}

export class JenkinsMainNode {
  static readonly CERTIFICATE_FILE_PATH: String = '/etc/ssl/certs/test-jenkins.opensearch.org.crt';

  static readonly PRIVATE_KEY_PATH: String = '/etc/ssl/private/test-jenkins.opensearch.org.key';

  public readonly ec2Instance: Instance;

  public readonly ec2InstanceMetrics: {
    cpuTime: Metric,
    memUsed: Metric,
    foundJenkinsProcessCount: Metric
  }

  constructor(stack: Stack,
    props:JenkinsMainNodeProps) {
    this.ec2InstanceMetrics = {
      cpuTime: new Metric({
        metricName: 'procstat_cpu_usage',
        namespace: `${stack.stackName}/JenkinsMainNode`,
      }),
      memUsed: new Metric({
        metricName: 'mem_used_percent',
        namespace: `${stack.stackName}/JenkinsMainNode`,
      }),
      foundJenkinsProcessCount: new Metric({
        metricName: 'procstat_lookup_pid_count',
        namespace: `${stack.stackName}/JenkinsMainNode`,
      }),
    };

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
          ],
          resources: ['*'],
        })],
      });

    this.ec2Instance = new Instance(stack, 'MainNode', {

      instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.XLARGE4),
      machineImage: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      },
      securityGroup: props.sg,
      init: CloudFormationInit.fromElements(...JenkinsMainNode.configElements(
        stack.stackName,
        stack.region,
        props,
        props,
      )),
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: BlockDeviceVolume.ebs(100, { encrypted: true, deleteOnTermination: true }),
      }],
    });

    this.ec2Instance.role.addManagedPolicy(ec2SsmManagementPolicy);
    this.ec2Instance.role.addManagedPolicy(cloudwatchEventPublishingPolicy);
    this.ec2Instance.role.addManagedPolicy(mainJenkinsNodePolicy);
    this.ec2Instance.role.addManagedPolicy(accessPolicy);
  }

  public static configElements(stackName: string, stackRegion: string, httpConfigProps: HttpConfigProps, oidcFederateProps: OidcFederateProps): InitElement[] {
    return [
      InitPackage.yum('curl'),
      InitPackage.yum('wget'),
      InitPackage.yum('unzip'),
      InitPackage.yum('tar'),
      InitPackage.yum('jq'),
      InitPackage.yum('python3'),
      InitPackage.yum('python3-pip.noarch'),
      InitPackage.yum('git'),
      InitPackage.yum('java-1.8.0-openjdk'),
      InitPackage.yum('java-1.8.0-openjdk-devel'),
      InitPackage.yum('openssl'),
      InitPackage.yum('mod_ssl'),

      //  Jenkins install is done with yum by adding a new repo
      InitCommand.shellCommand('wget -O /etc/yum.repos.d/jenkins-stable.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo'),
      InitCommand.shellCommand('rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key'),
      //  The yum install must be triggered via shell command to ensure the order of execution
      InitCommand.shellCommand('yum install -y jenkins-2.263.4'),

      InitCommand.shellCommand('yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm && yum -y install xmlstarlet'),

      // Jenkins needs to be accessible for httpd proxy
      InitCommand.shellCommand('sed -i \'s@JENKINS_LISTEN_ADDRESS=""@JENKINS_LISTEN_ADDRESS="127.0.0.1"@g\' /etc/sysconfig/jenkins'),

      // eslint-disable-next-line max-len
      InitCommand.shellCommand(`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertContentsArn} --query SecretString --output text  > ${JenkinsMainNode.CERTIFICATE_FILE_PATH}`),

      // eslint-disable-next-line max-len
      InitCommand.shellCommand(`mkdir /etc/ssl/private/ && aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertPrivateKeyContentsArn} --query SecretString --output text  > ${JenkinsMainNode.PRIVATE_KEY_PATH}`),

      // Local reverse proxy is used, see design for details
      // https://quip-amazon.com/jjIKA6tIPQbw/ODFE-Jenkins-Production-Cluster-JPC-High-Level-Design#BeF9CAIwx3k
      InitPackage.yum('httpd'),

      // Configuration to proxy jenkins on :8080 -> :80
      // Configuration changes depending on useSsl flag
      InitFile.fromString('/etc/httpd/conf.d/jenkins.conf',
        httpConfigProps.useSsl
          ? `<VirtualHost *:80>
                ServerAdmin  webmaster@localhost
                Redirect permanent / https://replace_url.com/
            </VirtualHost>
            <VirtualHost *:443>
                SSLEngine on
                SSLCertificateFile ${JenkinsMainNode.CERTIFICATE_FILE_PATH}
                SSLCertificateKeyFile ${JenkinsMainNode.PRIVATE_KEY_PATH}
                # SSLCertificateChainFile
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
                ProxyPassReverse  /  https://replace_url.com/
                RequestHeader set X-Forwarded-Proto "https"
                RequestHeader set X-Forwarded-Port "443"
            </VirtualHost>
            <IfModule mod_headers.c>
              Header unset Server
            </IfModule>`
          : `<VirtualHost *:80>
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
      // eslint-disable-next-line max-len
      InitCommand.shellCommand(httpConfigProps.useSsl ? `var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.redirectUrlArn} --query SecretString --output text\` && sed -i "s,https://replace_url.com/,$var," /etc/httpd/conf.d/jenkins.conf` : 'echo Not altering the jenkins url'),

      InitCommand.shellCommand('sudo systemctl start httpd'),

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
                pattern: 'jenkins',
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
                  file_path: '/var/log/jenkins/jenkins.log',
                  log_group_name: 'JenkinsMainNode/var/log/jenkins/jenkins.log',
                  auto_removal: true,
                  log_stream_name: 'jenkins.log',
                  //  2021-07-20 16:15:55.319+0000 [id=868]   INFO    jenkins.InitReactorRunner$1#onAttained: Completed initialization
                  timestamp_format: '%Y-%m-%d %H:%M:%S.%f%z',
                },
              ],
            },
          },
          force_flush_interval: 15,
        },
      }),

      InitCommand.shellCommand('/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a stop'),
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s'),

      // start jenkins service to generate all the default files and folders of jenkins
      // Does not use InitService.enable() because it initialises the service after the instance is launched
      InitCommand.shellCommand('sudo systemctl start jenkins'),

      // Commands are fired one after the other but it does not wait for the command to complete.
      // Therefore, sleep 60 seconds to wait for jenkins to start
      // This allows jenkins to generate the secrets files used for auth in jenkins-cli APIs
      InitCommand.shellCommand('sleep 60'),

      // creating a default  user:password file to use to authenticate the jenkins-cli
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('echo -n "admin:" > /var/lib/jenkins/secrets/myIdPassDefault && cat /var/lib/jenkins/secrets/initialAdminPassword >> /var/lib/jenkins/secrets/myIdPassDefault'),

      // Download jenkins-cli from the local machine
      InitCommand.shellCommand('wget -O "jenkins-cli.jar" http://localhost:8080/jnlpJars/jenkins-cli.jar'),

      // install all the list of plugins from the list and restart (done in same command as restart is to be done after completion of install-plugin)
      // eslint-disable-next-line max-len
      InitCommand.shellCommand(`java -jar /jenkins-cli.jar -s http://localhost:8080 -auth @/var/lib/jenkins/secrets/myIdPassDefault install-plugin ${JenkinsPlugins.plugins.join(' ')} && java -jar jenkins-cli.jar -s http://localhost:8080 -auth @/var/lib/jenkins/secrets/myIdPassDefault restart`),
      // Warning : any commands after this may be executed before the above command is complete

      // Commands are fired one after the other but it does not wait for the command to complete.
      // Therefore, sleep 60 seconds to wait for plugins to install and jenkins to start which is required for the next step
      InitCommand.shellCommand('sleep 60'),

      // If devMode is false, first line extracts the oidcFederateProps as json from the secret manager
      // xmlstarlet is used to setup the securityRealm values for oidc
      InitCommand.shellCommand(oidcFederateProps.devMode ? 'echo Not altering the jenkins config.xml in dev-mode'
        // eslint-disable-next-line max-len
        : `var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${oidcFederateProps.oidcCredArn} --query SecretString --output text\` &&`
        + 'xmlstarlet ed -L -d "/hudson/securityRealm" \\'
        + '-s /hudson -t elem -n securityRealm -v " " \\'
        + '-i //securityRealm -t attr -n "class" -v "org.jenkinsci.plugins.oic.OicSecurityRealm" \\'
        + '-i //securityRealm -t attr -n "plugin" -v "oic-auth@1.8" \\'
        + '-s /hudson/securityRealm -t elem -n clientId -v "$(echo $var | jq -r ".clientId")" \\'
        + '-s /hudson/securityRealm -t elem -n clientSecret -v "$(echo $var | jq -r ".clientSecret")" \\'
        + '-s /hudson/securityRealm -t elem -n wellKnownOpenIDConfigurationUrl -v "$(echo $var | jq -r ".wellKnownOpenIDConfigurationUrl")" \\'
        + '-s /hudson/securityRealm -t elem -n tokenServerUrl -v "$(echo $var | jq -r ".tokenServerUrl")" \\'
        + '-s /hudson/securityRealm -t elem -n authorizationServerUrl -v "$(echo $var | jq -r ".authorizationServerUrl")" \\'
        + '-s /hudson/securityRealm -t elem -n userInfoServerUrl -v "$(echo $var | jq -r ".userInfoServerUrl")" \\'
        + '-s /hudson/securityRealm -t elem -n userNameField -v "sub" \\'
        + '-s /hudson/securityRealm -t elem -n scopes -v "openid" \\'
        + '-s /hudson/securityRealm -t elem -n disableSslVerification -v false \\'
        + '-s /hudson/securityRealm -t elem -n logoutFromOpenidProvider -v "true" \\'
        + '-s /hudson/securityRealm -t elem -n postLogoutRedirectUrl -v "" \\'
        + '-s /hudson/securityRealm -t elem -n escapeHatchEnabled -v "false" \\'
        + '-s /hudson/securityRealm -t elem -n escapeHatchSecret -v "dsafsdfasfasdf" \\'
        + '/var/lib/jenkins/config.xml'),

      // reloading jenkins config file
      InitCommand.shellCommand(oidcFederateProps.devMode ? 'echo not reloading jenkins config in dev-mode'
        : 'java -jar /jenkins-cli.jar -s http://localhost:8080 -auth @/var/lib/jenkins/secrets/myIdPassDefault reload-configuration'),
    ];
  }
}
