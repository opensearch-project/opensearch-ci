/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AllowedIPs, WAF_IP_SET_MAX_ADDRESSES, buildAllowedIps, cidrVersion,
} from '../../lib/security/github-ips';

const allowedIps: AllowedIPs = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'lib', 'security', 'allowed_github_ips.json'), 'utf-8'),
);

describe('allowed_github_ips.json', () => {
  test('contains only valid CIDR ranges of the right IP version', () => {
    expect(allowedIps.ipv4.length).toBeGreaterThan(0);
    expect(allowedIps.ipv6.length).toBeGreaterThan(0);
    expect(allowedIps.ipv4.filter((cidr) => cidrVersion(cidr) !== 4)).toEqual([]);
    expect(allowedIps.ipv6.filter((cidr) => cidrVersion(cidr) !== 6)).toEqual([]);
  });

  test('has no duplicate ranges', () => {
    expect(new Set(allowedIps.ipv4).size).toBe(allowedIps.ipv4.length);
    expect(new Set(allowedIps.ipv6).size).toBe(allowedIps.ipv6.length);
  });

  test('fits within the AWS WAF IP set limit', () => {
    expect(allowedIps.ipv4.length).toBeLessThanOrEqual(WAF_IP_SET_MAX_ADDRESSES);
    expect(allowedIps.ipv6.length).toBeLessThanOrEqual(WAF_IP_SET_MAX_ADDRESSES);
  });
});

describe('buildAllowedIps', () => {
  test('splits ranges by IP version, keeps order and drops duplicates', () => {
    expect(buildAllowedIps(['4.148.0.0/16', '2a0a:a440::/29', '13.64.0.0/16', '4.148.0.0/16'])).toEqual({
      ipv4: ['4.148.0.0/16', '13.64.0.0/16'],
      ipv6: ['2a0a:a440::/29'],
    });
  });

  test('rejects invalid ranges', () => {
    expect(() => buildAllowedIps(['4.148.0.0/16', 'not-a-cidr'])).toThrow('Invalid CIDR range: not-a-cidr');
    expect(() => buildAllowedIps(['4.148.0.0/33'])).toThrow('Invalid CIDR range');
    expect(() => buildAllowedIps(['4.148.0.0'])).toThrow('Invalid CIDR range');
  });

  test('rejects an empty or missing list', () => {
    expect(() => buildAllowedIps([])).toThrow('No GitHub Actions IP ranges provided');
    expect(() => buildAllowedIps(undefined as unknown as string[])).toThrow('No GitHub Actions IP ranges provided');
  });

  test('rejects more ranges than a WAF IP set can hold', () => {
    const tooMany = Array.from({ length: WAF_IP_SET_MAX_ADDRESSES + 1 }, (_, i) => `10.${Math.floor(i / 256)}.${i % 256}.0/24`);
    expect(() => buildAllowedIps(tooMany)).toThrow('Too many ranges for a WAF IP set');
  });
});
