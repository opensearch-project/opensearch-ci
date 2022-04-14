/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Duration, RemovalPolicy, Stack } from '@aws-cdk/core';
import {
  AmazonLinuxGeneration,
  BlockDeviceVolume,
  CloudFormationInit,
  InitCommand,
  InitElement,
  InitFile,
  InitPackage,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  SecurityGroup,
  SubnetType,
  Vpc,
} from '@aws-cdk/aws-ec2';
import {
  Effect, IManagedPolicy, ManagedPolicy, PolicyStatement, Role, ServicePrincipal,
} from '@aws-cdk/aws-iam';
import { Metric, Unit } from '@aws-cdk/aws-cloudwatch';
import { join } from 'path';
import { dump } from 'js-yaml';
import { writeFileSync } from 'fs';
import { FileSystem, PerformanceMode, ThroughputMode } from '@aws-cdk/aws-efs';
import { CloudwatchAgent } from '../constructs/cloudwatch-agent';
import { JenkinsPlugins } from './jenkins-plugins';
import { OidcConfig } from './oidc-config';
import { AgentNodeConfig, AgentNodeNetworkProps, AgentNodeProps } from './agent-node-config';

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

interface EcrStackProps {
  readonly ecrAccountId: string
}

interface DataRetentionProps {
  readonly dataRetention?: boolean;
  readonly efsSG?: SecurityGroup;
}

export interface JenkinsMainNodeProps extends HttpConfigProps, OidcFederateProps, EcrStackProps, AgentNodeNetworkProps, DataRetentionProps{
  readonly vpc: Vpc;
  readonly sg: SecurityGroup;
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

  public readonly ec2Instance: Instance;

  public readonly ec2InstanceMetrics: {
    cpuTime: Metric,
    memUsed: Metric,
    foundJenkinsProcessCount: Metric
  }

  constructor(stack: Stack, props: JenkinsMainNodeProps, agentNode: AgentNodeProps[]) {
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

    const agentNodeConfig = new AgentNodeConfig(stack);
    const jenkinsyaml = JenkinsMainNode.addConfigtoJenkinsYaml(stack, props, agentNodeConfig, props, agentNode);
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
    this.ec2Instance = new Instance(stack, 'MainNode', {
      instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.XLARGE4),
      machineImage: MachineImage.latestAmazonLinux({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      role: new Role(stack, 'OpenSearch-CI-MainNodeRole', {
        roleName: 'OpenSearch-CI-MainNodeRole',
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      }),
      initOptions: {
        timeout: Duration.minutes(20),
        ignoreFailures: props.failOnCloudInitError ?? true,
      },
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
        props,
        jenkinsyaml,
        this.EFS_ID,
      )),
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: BlockDeviceVolume.ebs(100, { encrypted: true, deleteOnTermination: true }),
      }],
    });

    JenkinsMainNode.createPoliciesForMainNode(stack, props).map(
      (policy) => this.ec2Instance.role.addManagedPolicy(policy),
    );
  }

  public static createPoliciesForMainNode(stack: Stack, ecrStackProps: EcrStackProps): (IManagedPolicy | ManagedPolicy)[] {
    const policies: (IManagedPolicy | ManagedPolicy)[] = [];

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
            'logs:CreateLogDelivery',
            'logs:DeleteLogDelivery',
            'secretsmanager:GetSecretValue',
            'secretsmanager:ListSecrets',
            'sts:AssumeRole',
          ],
          resources: ['*'],
        })],
      });

    const ecrPolicy = new ManagedPolicy(stack, 'ecr-policy-main-node', {
      description: 'Policy for ECR to assume role',
      statements: [new PolicyStatement({
        actions: ['sts:AssumeRole'],
        effect: Effect.ALLOW,
        resources: [`arn:aws:iam::${ecrStackProps.ecrAccountId}:role/OpenSearch-CI-ECR-ecr-role`],
      })],
    });

    return [ec2SsmManagementPolicy, cloudwatchEventPublishingPolicy, accessPolicy, mainJenkinsNodePolicy, ecrPolicy];
  }

  public static configElements(stackName: string, stackRegion: string, httpConfigProps: HttpConfigProps,
    oidcFederateProps: OidcFederateProps, dataRetentionProps : DataRetentionProps, jenkinsyaml: string, efsId?: string): InitElement[] {
    return [
      InitPackage.yum('curl'),
      InitPackage.yum('wget'),
      InitPackage.yum('unzip'),
      InitPackage.yum('tar'),
      InitPackage.yum('python3'),
      InitPackage.yum('python3-pip.noarch'),
      InitPackage.yum('git'),
      InitPackage.yum('java-1.8.0-openjdk'),
      InitPackage.yum('java-1.8.0-openjdk-devel'),
      InitPackage.yum('openssl'),
      InitPackage.yum('mod_ssl'),
      InitPackage.yum('amazon-efs-utils'),
      // eslint-disable-next-line max-len
      InitCommand.shellCommand('sudo wget -nv https://github.com/mikefarah/yq/releases/download/v4.22.1/yq_linux_amd64 -O /usr/bin/yq && sudo chmod +x /usr/bin/yq'),

      //  Jenkins install is done with yum by adding a new repo
      InitCommand.shellCommand('wget -O /etc/yum.repos.d/jenkins-stable.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo'),
      InitCommand.shellCommand('rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key'),
      //  The yum install must be triggered via shell command to ensure the order of execution
      InitCommand.shellCommand('yum install -y jenkins-2.263.4'),

      InitCommand.shellCommand('sleep 60'),

      // Jenkins needs to be accessible for httpd proxy
      InitCommand.shellCommand('sed -i \'s@JENKINS_LISTEN_ADDRESS=""@JENKINS_LISTEN_ADDRESS="127.0.0.1"@g\' /etc/sysconfig/jenkins'),

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

      // Configuration to proxy jenkins on :8080 -> :80
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
      InitCommand.shellCommand('systemctl start jenkins'),

      // Commands are fired one after the other but it does not wait for the command to complete.
      // Therefore, sleep 60 seconds to wait for jenkins to start
      // This allows jenkins to generate the secrets files used for auth in jenkins-cli APIs
      InitCommand.shellCommand('sleep 60'),

      InitCommand.shellCommand(dataRetentionProps.dataRetention
        ? `mount -t efs ${efsId} /var/lib/jenkins/jobs && chown -R jenkins:jenkins /var/lib/jenkins/jobs`
        : 'echo Data rentention is disabled, not mounting efs'),

      // creating a default  user:password file to use to authenticate the jenkins-cli
      // eslint-disable-next-line max-len
      InitCommand.shellCommand(`echo -n "admin:" > ${JenkinsMainNode.JENKINS_DEFAULT_ID_PASS_PATH} && cat /var/lib/jenkins/secrets/initialAdminPassword >> ${JenkinsMainNode.JENKINS_DEFAULT_ID_PASS_PATH}`),

      // Download jenkins-cli from the local machine
      InitCommand.shellCommand('wget -O "jenkins-cli.jar" http://localhost:8080/jnlpJars/jenkins-cli.jar'),

      // install all the list of plugins from the list and restart (done in same command as restart is to be done after completion of install-plugin)
      // eslint-disable-next-line max-len
      ...JenkinsMainNode.createPluginInstallCommands(JenkinsPlugins.plugins),
      // Warning : any commands after this may be executed before the above command is complete

      // Commands are fired one after the other but it does not wait for the command to complete.
      // Therefore, sleep 60 seconds to wait for plugins to install and jenkins to start which is required for the next step
      InitCommand.shellCommand('sleep 65'),

      InitFile.fromFileInline('/var/lib/jenkins/initial_jenkins.yaml', jenkinsyaml),

      // Make any changes to initial jenkins.yaml
      InitCommand.shellCommand(oidcFederateProps.runWithOidc
        // eslint-disable-next-line max-len
        ? `var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${oidcFederateProps.oidcCredArn} --query SecretString --output text\` && `
        + ' varkeys=`echo $var | yq \'keys\' | cut -d "-" -f2 | cut -d " " -f2` &&'
        // eslint-disable-next-line max-len
        + ' for i in $varkeys; do newvalue=`echo $var | yq .$i` && myenv=$newvalue i=$i yq -i \'.jenkins.securityRealm.oic.[env(i)]=env(myenv)\' /var/lib/jenkins/initial_jenkins.yaml ; done'
        : 'echo No changes made to initial_jenkins.yaml'),

      // Reload configuration via Jenkins.yaml
      InitCommand.shellCommand('cp /var/lib/jenkins/initial_jenkins.yaml /var/lib/jenkins/jenkins.yaml &&'
      + ' java -jar /jenkins-cli.jar -s http://localhost:8080 -auth @/var/lib/jenkins/secrets/myIdPassDefault reload-jcasc-configuration'),

    ];
  }

  public static addConfigtoJenkinsYaml(stack: Stack, oidcProps: OidcFederateProps, agentNodeObject: AgentNodeConfig,
    props: AgentNodeNetworkProps, agentNode: AgentNodeProps[]): string {
    let updatedConfig = agentNodeObject.addAgentConfigToJenkinsYaml(agentNode, props);
    if (oidcProps.runWithOidc) {
      updatedConfig = OidcConfig.addOidcConfigToJenkinsYaml(updatedConfig, oidcProps.adminUsers);
    }
    const newConfig = dump(updatedConfig);
    writeFileSync(JenkinsMainNode.NEW_JENKINS_YAML_PATH, newConfig, 'utf-8');
    return JenkinsMainNode.NEW_JENKINS_YAML_PATH;
  }

  /** Creates the commands to install plugins, typically done in blocks */
  public static createPluginInstallCommands(pluginList: string[]): InitCommand[] {
    const pluginInstallBlockSize = 10;
    const jenkinsCliCommand = `java -jar /jenkins-cli.jar -s http://localhost:8080 -auth @${JenkinsMainNode.JENKINS_DEFAULT_ID_PASS_PATH}`;
    const pluginListCopy = Object.assign([], pluginList);
    const pluginListSlices: String[] = [];
    do {
      pluginListSlices.push(pluginListCopy.splice(0, pluginInstallBlockSize).join(' '));
    } while (pluginListCopy.length !== 0);

    return pluginListSlices.map((slice, index) => {
      const extraCommand = (index === pluginListSlices.length - 1) ? `&& ${jenkinsCliCommand} restart` : '';
      return InitCommand.shellCommand(`${jenkinsCliCommand} install-plugin ${slice} ${extraCommand}`);
    });
  }
}
