import { readFileSync } from 'fs';
import { join } from 'path';
import { Stack, StackProps } from 'aws-cdk-lib';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import {
  CfnIPSet, CfnWebACL, CfnWebACLAssociation, CfnWebACLAssociationProps,
} from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

interface WafRule {
    name: string;
    rule: CfnWebACL.RuleProperty;
}

interface AllowedIPs {
  GitHubAllowIpIpv4: string[];
  GitHubAllowIpIpv6: string[];
}

// Read the allowed IPs from the JSON file
const allowedIpsPath = join(__dirname, 'allowed_github_ips.json');
const allowedIps: AllowedIPs = JSON.parse(readFileSync(allowedIpsPath, 'utf-8'));

const awsManagedRules: WafRule[] = [
  // AWS Managed Rules Common Rule Set with allow override for SizeRestrictions_BODY
  {
    name: 'AWS-AWSManagedRulesCommonRuleSet',
    rule: {
      name: 'AWS-AWSManagedRulesCommonRuleSet',
      priority: 2,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          ruleActionOverrides: [
            {
              name: 'SizeRestrictions_BODY',
              actionToUse: {
                allow: {},
              },
            },
          ],
        },
      },
      overrideAction: {
        none: {},
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesCommonRuleSet',
      },
    },
  },
  // AWS IP Reputation list includes known malicious actors/bots and is regularly updated
  {
    name: 'AWS-AWSManagedRulesAmazonIpReputationList',
    rule: {
      name: 'AWS-AWSManagedRulesAmazonIpReputationList',
      priority: 3,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesAmazonIpReputationList',
        },
      },
      overrideAction: {
        none: {},
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWSManagedRulesAmazonIpReputationList',
      },
    },
  },
  // AWS Managed Rules Known Bad Inputs Rule Set
  {
    name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
    rule: {
      name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
      priority: 4,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          excludedRules: [],
        },
      },
      overrideAction: {
        none: {},
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
      },
    },
  },
  // Blocks common SQL Injection
  {
    name: 'AWS-AWSManagedRulesSQLiRuleSet',
    rule: {
      name: 'AWS-AWSManagedRulesSQLiRuleSet',
      priority: 5,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesSQLiRuleSet',
          excludedRules: [],
        },
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesSQLiRuleSet',
      },
      overrideAction: {
        none: {},
      },
    },
  },
  // Block request patterns associated with the exploitation of vulnerabilities specific to WordPress sites.
  {
    name: 'AWS-AWSManagedRulesWordPressRuleSet',
    rule: {
      name: 'AWS-AWSManagedRulesWordPressRuleSet',
      priority: 6,
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesWordPressRuleSet',
      },
      overrideAction: {
        none: {},
      },
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesWordPressRuleSet',
          excludedRules: [],
        },
      },
    },
  },
  // AWS Managed Rules Anonymous IP List (Blocks traffic from anonymizing services like VPNs and proxies)
  {
    name: 'AWS-AWSManagedRulesAnonymousIpList',
    rule: {
      name: 'AWS-AWSManagedRulesAnonymousIpList',
      priority: 7,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesAnonymousIpList',
          excludedRules: [],
        },
      },
      overrideAction: {
        none: {},
      },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'AWS-AWSManagedRulesAnonymousIpList',
      },
    },
  },
];

export class WAF extends CfnWebACL {
  constructor(scope: Construct, id: string, rules: CfnWebACL.RuleProperty[]) {
    super(scope, id, {
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'jenkins-WAF',
        sampledRequestsEnabled: true,
      },
      scope: 'REGIONAL',
      name: 'jenkins-WAF',
      rules,
    });
  }
}

export class WebACLAssociation extends CfnWebACLAssociation {
  constructor(scope: Construct, id: string, props: CfnWebACLAssociationProps) {
    super(scope, id, {
      resourceArn: props.resourceArn,
      webAclArn: props.webAclArn,
    });
  }
}

export interface WafProps extends StackProps{
    loadBalancer: ApplicationLoadBalancer
}

export class JenkinsWAF {
  constructor(stack: Stack, props: WafProps) {
    // Create IP Sets for IPv4 and IPv6
    const ipSetIpv4 = new CfnIPSet(stack, 'GitHubIpv4Set', {
      name: 'GitHubIpv4Set',
      ipAddressVersion: 'IPV4',
      scope: 'REGIONAL',
      addresses: allowedIps.GitHubAllowIpIpv4,
    });

    const ipSetIpv6 = new CfnIPSet(stack, 'GitHubIpv6Set', {
      name: 'GitHubIpv6Set',
      ipAddressVersion: 'IPV6',
      scope: 'REGIONAL',
      addresses: allowedIps.GitHubAllowIpIpv6,
    });

    const allowGitHubIpv4Rule: WafRule = {
      name: 'AllowGitHubIPv4',
      rule: {
        name: 'AllowGitHubIPv4',
        priority: 0,
        statement: {
          ipSetReferenceStatement: {
            arn: `${ipSetIpv4.attrArn}`,
          },
        },
        action: {
          allow: {},
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AllowGitHubIPv4',
        },
      },
    };

    const allowGitHubIpv6Rule: WafRule = {
      name: 'AllowGitHubIPv6',
      rule: {
        name: 'AllowGitHubIPv6',
        priority: 1,
        statement: {
          ipSetReferenceStatement: {
            arn: `${ipSetIpv6.attrArn}`,
          },
        },
        action: {
          allow: {},
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'AllowGitHubIPv6',
        },
      },
    };
    const waf = new WAF(stack, 'WAFv2', [
      allowGitHubIpv4Rule.rule,
      allowGitHubIpv6Rule.rule,
      ...awsManagedRules.map((wafRule) => wafRule.rule),
    ]);

    // Create an association with the alb
    new WebACLAssociation(stack, 'wafALBassociation', {
      resourceArn: props.loadBalancer.loadBalancerArn,
      webAclArn: waf.attrArn,
    });
  }
}
