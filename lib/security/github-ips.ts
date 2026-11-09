/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { isIPv4, isIPv6 } from 'net';

export interface AllowedIPs {
  ipv4: string[];
  ipv6: string[];
}

// AWS WAF allows at most 10,000 addresses (CIDR entries) per IP set.
// https://docs.aws.amazon.com/waf/latest/developerguide/limits.html
export const WAF_IP_SET_MAX_ADDRESSES = 10000;

export function cidrVersion(cidr: string): 4 | 6 | undefined {
  const parts = cidr.split('/');
  if (parts.length !== 2 || !/^\d{1,3}$/.test(parts[1])) {
    return undefined;
  }
  const prefix = Number(parts[1]);
  if (isIPv4(parts[0]) && prefix <= 32) {
    return 4;
  }
  if (isIPv6(parts[0]) && prefix <= 128) {
    return 6;
  }
  return undefined;
}

/**
 * Builds the WAF allowlist from the `actions` key of https://api.github.com/meta,
 * which lists the IP ranges used by GitHub-hosted runners.
 * Keeps GitHub's ordering (minus duplicates) so weekly refreshes produce small diffs.
 */
export function buildAllowedIps(actionsRanges: string[]): AllowedIPs {
  if (!Array.isArray(actionsRanges) || actionsRanges.length === 0) {
    throw new Error('No GitHub Actions IP ranges provided');
  }
  const ipv4: string[] = [];
  const ipv6: string[] = [];
  const seen = new Set<string>();
  actionsRanges.forEach((cidr) => {
    if (seen.has(cidr)) {
      return;
    }
    seen.add(cidr);
    const version = cidrVersion(cidr);
    if (version === 4) {
      ipv4.push(cidr);
    } else if (version === 6) {
      ipv6.push(cidr);
    } else {
      throw new Error(`Invalid CIDR range: ${cidr}`);
    }
  });
  if (ipv4.length > WAF_IP_SET_MAX_ADDRESSES || ipv6.length > WAF_IP_SET_MAX_ADDRESSES) {
    throw new Error(`Too many ranges for a WAF IP set (ipv4: ${ipv4.length}, ipv6: ${ipv6.length}, max: ${WAF_IP_SET_MAX_ADDRESSES})`);
  }
  return { ipv4, ipv6 };
}
