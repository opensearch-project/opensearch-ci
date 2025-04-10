/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

export interface StageDefinition {
  readonly region: string;
  readonly accountId: string;
  readonly agentAssumeRole: string[];
}

export type StageMap = {
  [key: string]: StageDefinition;
};

export const StageDefs: StageMap = {
  Dev: {
    region: process.env.REGION || 'us-east-1',
    accountId: process.env.DEV_ACCOUNT_ID || '',
    agentAssumeRole: process.env.DEV_ASSUMED_ROLES ? process.env.DEV_ASSUMED_ROLES.split(',') : [''],
  },
  Beta: {
    region: process.env.REGION || 'us-east-1',
    accountId: process.env.BETA_ACCOUNT_ID || '',
    agentAssumeRole: process.env.ASSUMED_ROLES ? process.env.ASSUMED_ROLES.split(',') : [''],
  },
  Prod: {
    region: process.env.PROD_REGION || 'us-east-1',
    accountId: process.env.PROD_ACCOUNT_ID || '',
    agentAssumeRole: process.env.ASSUMED_ROLES ? process.env.ASSUMED_ROLES.split(',') : [''],
  },
};
