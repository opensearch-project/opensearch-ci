/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from 'aws-cdk-lib';
import { CfnAssociation, CfnAssociationProps, CfnDocument } from 'aws-cdk-lib/aws-ssm';
import { readFileSync } from 'fs';

export class RunAdditionalCommands {
  constructor(stack: Stack, filePath: string) {
    const additionalCommands = readFileSync(filePath.toString()).toString('utf-8');
    const dateStamp = new Date().toISOString().slice(0, 10);

    const ssmDocument = new CfnDocument(stack, 'additionalCommandSsmDoc', {
      name: `additionalCommandDocumentV3-${dateStamp}`,
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
      complianceSeverity: 'CRITICAL',
      targets: [{
        key: 'tag:Name',
        values: [`${stack.stackName}/MainNodeAsg`],
      }],
    });
    ssmAssociation.addDependency(ssmDocument);
  }
}
