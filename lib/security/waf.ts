import { Stack, StackProps } from 'aws-cdk-lib';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { CfnWebACL, CfnWebACLAssociation, CfnWebACLAssociationProps } from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

interface WafRule {
    name: string;
    rule: CfnWebACL.RuleProperty;
}

const awsManagedRules: WafRule[] = [
  // AWS IP Reputation list includes known malicious actors/bots and is regularly updated
  {
    name: 'AWS-AWSManagedRulesAmazonIpReputationList',
    rule: {
      name: 'AWS-AWSManagedRulesAmazonIpReputationList',
      priority: 0,
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
  // Blocks common SQL Injection
  {
    name: 'AWS-AWSManagedRulesSQLiRuleSet',
    rule: {
      name: 'AWS-AWSManagedRulesSQLiRuleSet',
      priority: 1,
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
      priority: 2,
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
];

export class WAF extends CfnWebACL {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      defaultAction: { allow: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'jenkins-WAF',
        sampledRequestsEnabled: true,
      },
      scope: 'REGIONAL',
      name: 'jenkins-WAF',
      rules: awsManagedRules.map((wafRule) => wafRule.rule),
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
    const waf = new WAF(stack, 'WAFv2');
    // Create an association with the alb
    new WebACLAssociation(stack, 'wafALBassociation', {
      resourceArn: props.loadBalancer.loadBalancerArn,
      webAclArn: waf.attrArn,
    });
  }
}
