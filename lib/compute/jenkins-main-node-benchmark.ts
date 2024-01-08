/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import {
    CfnOutput, Duration, Fn, Stack,
  } from 'aws-cdk-lib';
  import {
    AutoScalingGroup, BlockDeviceVolume, Monitoring, Signals,
  } from 'aws-cdk-lib/aws-autoscaling';
  import { Metric, Unit } from 'aws-cdk-lib/aws-cloudwatch';
  import {
    AmazonLinuxGeneration, CloudFormationInit, InitCommand, InitElement, InitFile, InitPackage,
    InstanceClass,
    InstanceSize,
    InstanceType,
    MachineImage, SecurityGroup, ISecurityGroup,
    SubnetType, IVpc,
  } from 'aws-cdk-lib/aws-ec2';
  import { FileSystem, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
  import {
    IManagedPolicy, ManagedPolicy, PolicyStatement, Role, ServicePrincipal,
  } from 'aws-cdk-lib/aws-iam';
  import { writeFileSync } from 'fs';
  import { dump } from 'js-yaml';
  import { join } from 'path';
  import { CloudwatchAgent } from '../constructs/cloudwatch-agent';
  import { AgentNodeConfigBenchmark, AgentNodeNetworkPropsBenchmark, AgentNodePropsBenchmark } from './agent-node-config-benchmark';
  import { EnvConfig } from './env-config';
  import { OidcConfig } from './oidc-config';
  import { ViewsConfig } from './views-benchmark';
  
  interface HttpConfigPropsBenchmark {
    readonly redirectUrlArn: string;
    readonly sslCertContentsArn: string;
    readonly sslCertChainArn: string;
    readonly sslCertPrivateKeyContentsArn: string;
    readonly useSsl: boolean;
  }
  
  interface OidcFederatePropsBenchmark {
    readonly oidcCredArn: string;
    readonly runWithOidc: boolean;
    readonly adminUsers?: string[];
  }
  
  interface DataRetentionPropsBenchmark {
    readonly dataRetention?: boolean;
    readonly efsSG?: SecurityGroup;
  }
  
  export interface JenkinsMainNodePropsBenchmark extends HttpConfigPropsBenchmark, OidcFederatePropsBenchmark,
      AgentNodeNetworkPropsBenchmark, DataRetentionPropsBenchmark {
    readonly vpc: IVpc;
    readonly sg: ISecurityGroup;
    readonly envVarsFilePath: string;
    readonly reloadPasswordSecretsArn: string;
    readonly enableViews: boolean;
    readonly failOnCloudInitError?: boolean;
  }
  
  export class JenkinsMainNodeBenchmark {
    static readonly BASE_JENKINS_YAML_PATH: string = join(__dirname, '../../resources/baseJenkins-benchmark.yaml');
  
    static readonly NEW_JENKINS_YAML_PATH: string = join(__dirname, '../../resources/jenkins-benchmark.yaml');
  
    static readonly CERTIFICATE_FILE_PATH: String = '/etc/ssl/certs/test-jenkins.opensearch.org.crt';
  
    static readonly CERTIFICATE_CHAIN_FILE_PATH: String = '/etc/ssl/certs/test-jenkins.opensearch.org.pem';
  
    static readonly PRIVATE_KEY_PATH: String = '/etc/ssl/private/test-jenkins.opensearch.org.key';
  
    static readonly JENKINS_DEFAULT_ID_PASS_PATH: String = '/var/lib/jenkins/secrets/myIdPassDefault';
  
    private readonly EFS_ID: string;
  
    private static ACCOUNT: string;
  
    private static STACKREGION: string
  
    public readonly mainNodeBenchAsg: AutoScalingGroup;
  
    public readonly ec2InstanceMetrics: {
      memUsed: Metric,
      foundJenkinsProcessCount: Metric
    }
  
    constructor(stack: Stack, props: JenkinsMainNodePropsBenchmark, agentNode: AgentNodePropsBenchmark[], macAgent: string, assumeRole?: string[]) {
      this.ec2InstanceMetrics = {
        memUsed: new Metric({
          metricName: 'mem_used_percent_benchmark',
          namespace: `${stack.stackName}/JenkinsMainNodeBenchmark`,
        }),
        foundJenkinsProcessCount: new Metric({
          metricName: 'procstat_lookup_pid_count_benchmark',
          namespace: `${stack.stackName}/JenkinsMainNodeBenchmark`,
        }),
      };
  
      const importedSGId = Fn.importValue('CIStackMainNodeSGId');
      const mainCiMainNodeSGId = SecurityGroup.fromSecurityGroupId(stack, 'CIStackMainNodeSGId', importedSGId);
  
      const agentNodeConfig = new AgentNodeConfigBenchmark(stack, assumeRole);
      const jenkinsyaml = JenkinsMainNodeBenchmark.addConfigtoJenkinsYaml(stack, props, props, agentNodeConfig, props, agentNode, macAgent);
      if (props.dataRetention) {
        const efs = new FileSystem(stack, 'EFSfilesystemBenchmark', {
          vpc: props.vpc,
          encrypted: true,
          enableAutomaticBackups: true,
          performanceMode: PerformanceMode.GENERAL_PURPOSE,
          throughputMode: ThroughputMode.BURSTING,
          securityGroup: props.efsSG,
        });
        this.EFS_ID = efs.fileSystemId;
      }
      this.mainNodeBenchAsg = new AutoScalingGroup(stack, 'MainNodeAsgBenchmark', {
        instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.XLARGE9),
        machineImage: MachineImage.latestAmazonLinux({
          generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        }),
        role: new Role(stack, 'OpenSearch-CI-MainNodeRole-Benchmark', {
          roleName: 'OpenSearch-CI-MainNodeRole-Benchmark',
          assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        }),
        initOptions: {
          ignoreFailures: props.failOnCloudInitError ?? true,
        },
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: SubnetType.PUBLIC,
        },
        minCapacity: 1,
        maxCapacity: 1,
        desiredCapacity: 1,
        securityGroup: props.sg,
        init: CloudFormationInit.fromElements(...JenkinsMainNodeBenchmark.configElements(
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
  
      this.mainNodeBenchAsg.addSecurityGroup(mainCiMainNodeSGId);
  
      JenkinsMainNodeBenchmark.createPoliciesForMainNode(stack).map(
        (policy) => this.mainNodeBenchAsg.role.addManagedPolicy(policy),
      );
  
      new CfnOutput(stack, 'Jenkins Main Node Role Arn Benchmark', {
        value: this.mainNodeBenchAsg.role.roleArn,
        exportName: 'mainNodeRoleArnBenchmark',
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
      const mainJenkinsNodePolicy = new ManagedPolicy(stack, 'MainJenkinsNodePolicyBenchmark',
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
  
    public static configElements(stackName: string, stackRegion: string, httpConfigProps: HttpConfigPropsBenchmark,
      oidcFederateProps: OidcFederatePropsBenchmark, dataRetentionProps: DataRetentionPropsBenchmark, jenkinsyaml: string,
      reloadPasswordSecretsArn: string, efsId?: string): InitElement[] {
      return [
        InitPackage.yum('wget'),
        InitPackage.yum('openssl'),
        InitPackage.yum('mod_ssl'),
        InitPackage.yum('amazon-efs-utils'),
        InitCommand.shellCommand('amazon-linux-extras install java-openjdk11 -y'),
        InitPackage.yum('docker'),
        InitPackage.yum('python3'),
        InitPackage.yum('python3-pip.noarch'),
        InitCommand.shellCommand('pip3 install botocore'),
        // eslint-disable-next-line max-len
        InitCommand.shellCommand('sudo wget -nv https://github.com/mikefarah/yq/releases/download/v4.22.1/yq_linux_amd64 -O /usr/bin/yq && sudo chmod +x /usr/bin/yq'),
        // eslint-disable-next-line max-len
        InitCommand.shellCommand('sudo curl -L https://github.com/docker/compose/releases/download/v2.9.0/docker-compose-$(uname -s)-$(uname -m) -o /usr/bin/docker-compose && sudo chmod +x /usr/bin/docker-compose'),
        InitCommand.shellCommand('python3 -m pip install --upgrade pip && python3 -m pip install cryptography boto3 requests-aws4auth'),
  
        InitCommand.shellCommand(httpConfigProps.useSsl
          // eslint-disable-next-line max-len
          ? `aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertContentsArn} --query SecretString --output text  > ${JenkinsMainNodeBenchmark.CERTIFICATE_FILE_PATH}`
          : 'echo useSsl is false, not creating cert file'),
  
        InitCommand.shellCommand(httpConfigProps.useSsl
          // eslint-disable-next-line max-len
          ? `aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertChainArn} --query SecretString --output text  > ${JenkinsMainNodeBenchmark.CERTIFICATE_CHAIN_FILE_PATH}`
          : 'echo useSsl is false, not creating cert-chain file'),
  
        InitCommand.shellCommand(httpConfigProps.useSsl
          // eslint-disable-next-line max-len
          ? `mkdir /etc/ssl/private/ && aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${httpConfigProps.sslCertPrivateKeyContentsArn} --query SecretString --output text  > ${JenkinsMainNodeBenchmark.PRIVATE_KEY_PATH}`
          : 'echo useSsl is false, not creating key file'),
  
        // Local reverse proxy is used
        InitPackage.yum('httpd'),
  
        // Change hop limit for IMDSv2 from 1 to 2
        InitCommand.shellCommand('TOKEN=`curl -f -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` &&'
        + ' instance_id=`curl -f -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id` && echo $ami_id &&'
        + ` aws ec2 --region ${stackRegion} modify-instance-metadata-options --instance-id $instance_id --http-put-response-hop-limit 2`),
  
        // Configuration to proxy jenkins on :8080 -> :80
        InitFile.fromString('/etc/httpd/conf.d/jenkins.conf',
          httpConfigProps.useSsl
            ? `<VirtualHost *:80>
                  ServerAdmin  webmaster@localhost
                  Redirect permanent / https://replace_url.com/
              </VirtualHost>
              <VirtualHost *:443>
                  SSLEngine on
                  SSLCertificateFile ${JenkinsMainNodeBenchmark.CERTIFICATE_FILE_PATH}
                  SSLCertificateKeyFile ${JenkinsMainNodeBenchmark.PRIVATE_KEY_PATH}
                  SSLCertificateChainFile ${JenkinsMainNodeBenchmark.CERTIFICATE_CHAIN_FILE_PATH}
                  ServerAdmin  webmaster@localhost
                  ProxyRequests     Off
                  ProxyPreserveHost On
                  AllowEncodedSlashes NoDecode
                  <Proxy *>
                      Order deny,allow
                      Allow from all
                  </Proxy>
                  ProxyPass         /benchmark/  http://localhost:8080/benchmark/ nocanon
                  ProxyPassReverse  /benchmark/  http://localhost:8080/benchmark/
                  
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
              
              ProxyPass         /benchmark/  http://localhost:8080/benchmark/ nocanon
              ProxyPassReverse  /benchmark/  http://localhost:8080/benchmark/
            
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
            namespace: `${stackName}/JenkinsMainNodeBenchmark`,
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
  
        InitFile.fromFileInline('/docker-compose.yml', join(__dirname, '../../resources/docker-compose-benchmark.yml')),
  
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
  
        // eslint-disable-next-line max-len
        InitCommand.shellCommand('while [[ "$(curl -s -o /dev/null -w \'\'%{http_code}\'\' localhost:8080/benchmark/api/json?pretty)" != "200" ]]; do sleep 5; done'),
  
        // Reload configuration via Jenkins.yaml
        InitCommand.shellCommand('cp /initial_jenkins.yaml /var/lib/jenkins/jenkins.yaml &&'
          + ` var=\`aws --region ${stackRegion} secretsmanager get-secret-value --secret-id ${reloadPasswordSecretsArn} --query SecretString --output text\` &&`
          + ' curl  -f -X POST "http://localhost:8080/benchmark/reload-configuration-as-code/?casc-reload-token=$var"'),
      ];
    }
  
    public static addConfigtoJenkinsYaml(stack: Stack, jenkinsMainNodeProps: JenkinsMainNodePropsBenchmark, oidcProps: OidcFederatePropsBenchmark,
      agentNodeObject: AgentNodeConfigBenchmark, props: AgentNodeNetworkPropsBenchmark, agentNode: AgentNodePropsBenchmark[],
      macAgent: string): string {
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
      writeFileSync(JenkinsMainNodeBenchmark.NEW_JENKINS_YAML_PATH, newConfig, 'utf-8');
      return JenkinsMainNodeBenchmark.NEW_JENKINS_YAML_PATH;
    }
  }
  