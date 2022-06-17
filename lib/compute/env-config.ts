import { readFileSync } from 'fs';
import { load } from 'js-yaml';

/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */
export class Env {
  public readonly key: string

  public readonly value: string

  constructor(key : string, value: string) {
    this.key = key;
    this.value = value;
  }
}

export class EnvConfig {
  public static addEnvConfigToJenkinsYaml(yamlObject: any, envVarsFilePath: string): any {
    const jenkinsYaml: any = yamlObject;
    const envArray: Env[] = [];
    const envFile: any = load(readFileSync(envVarsFilePath, 'utf-8'));

    Object.keys(envFile).forEach((item) => envArray.push(new Env(item, envFile[item])));
    const newEnvVars: Env[] = envArray;

    const envConfig: { [x: string]: any; } = {
      envVars: {
        env: newEnvVars,
      },
    };
    jenkinsYaml.jenkins.globalNodeProperties = [envConfig];
    return jenkinsYaml;
  }
}
