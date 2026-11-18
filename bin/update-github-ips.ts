/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

// Regenerates lib/security/allowed_github_ips.json from the `actions` key of
// https://api.github.com/meta (IP ranges used by GitHub-hosted runners).
// GitHub updates that list weekly; the WAF allowlist must follow it or
// requests from runners on new ranges are blocked with a 403.
//
// Usage: npm run update-github-ips

import { writeFileSync } from 'fs';
import { get } from 'https';
import { join } from 'path';
import { buildAllowedIps } from '../lib/security/github-ips';

const META_URL = 'https://api.github.com/meta';
const OUTPUT_PATH = join(__dirname, '..', 'lib', 'security', 'allowed_github_ips.json');

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    get(url, { headers: { 'User-Agent': 'opensearch-ci-update-github-ips', Accept: 'application/vnd.github+json' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`GET ${url} returned HTTP ${res.statusCode}`));
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const meta = await fetchJson(META_URL);
  const allowedIps = buildAllowedIps(meta.actions);
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(allowedIps, null, 2)}\n`);
  console.log(`Wrote ${allowedIps.ipv4.length} IPv4 and ${allowedIps.ipv6.length} IPv6 ranges to ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
