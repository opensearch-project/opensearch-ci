/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from '@aws-cdk/core';
import { CfnAssociation, CfnAssociationProps, CfnDocument } from '@aws-cdk/aws-ssm';
import { readFileSync } from 'fs';

export class RunAdditionalCommands {
  constructor(stack: Stack, filePath: string) {
    const additionalCommands = readFileSync(filePath.toString()).toString('utf-8');

    const ssmDocument = new CfnDocument(stack, 'additionalCommandSsmDoc', {
      name: 'additionalCommandDocument',
      documentType: 'Command',
      content: {
        schemaVersion: '2.2',
        mainSteps: [
          {
            action: 'aws:runShellScript',
            name: 'customTestingScript',
            inputs: {
              runCommand: additionalCommands.split('\n'),
              timeoutSeconds: 3600,
            },
          },
        ],
      },
    });

    const ssmAssociation = new CfnAssociation(stack, 'additionalCommandsSsmAssociation', <CfnAssociationProps>{
      name: ssmDocument.name,
      associationName: 'runAdditionalCommandAssociation',
      complianceSeverity: 'CRITICAL',
      targets: [{
        key: 'tag:Name',
        values: [`${stack.stackName}/MainNode`],
      }],
    });
    ssmAssociation.addDependsOn(ssmDocument);
  }
}
