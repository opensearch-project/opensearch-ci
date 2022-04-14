/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { Stack } from '@aws-cdk/core';
import { CfnAssociation, CfnAssociationProps, CfnDocument } from '@aws-cdk/aws-ssm';

const fs = require('fs');

export class RunAdditionalCommands {
  constructor(stack: Stack, filePath: string, additionalParams: string) {
    const additionalCommands = fs.readFileSync(filePath.toString()).toString('utf-8');

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
              runCommand: RunAdditionalCommands.getAdditionalRunCommands(additionalCommands, additionalParams),
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

  private static getAdditionalRunCommands(additionalCommands: string, additionalParams: string): string[] {
    const runCommand: string[] = [];
    runCommand.push('cat << EOF > $HOME/emitter && chmod 755 $HOME/emitter');
    runCommand.push(...additionalCommands.split('\n'));
    runCommand.push('EOF');

    if (additionalParams.toString() === 'undefined') {
      runCommand.push('echo "*/5 * * * * $HOME/emitter " > newcron');
    } else {
      runCommand.push(`echo "*/5 * * * * $HOME/emitter ${additionalParams.toString()}" > newcron`);
    }
    runCommand.push('crontab newcron');
    runCommand.push('rm newcron');

    return runCommand;
  }
}
