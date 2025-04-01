/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

export interface StageDefinition {
    readonly envName: string;
    readonly Region: string;
    readonly AccountId: string;
    readonly agentAssumeRole: string[];
}

export const StageDef: StageDefinition = {
  envName: process.env.ENVIRONMENT || 'Dev',
  Region: process.env.REGION || 'us-east-1',
  AccountId: process.env.ACCOUNTID || '',
  agentAssumeRole: process.env.ASSUMED_ROLES ? process.env.ASSUMED_ROLES.split(',') : [
    '',
  ],
};
