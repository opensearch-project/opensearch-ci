import { readFileSync } from 'fs';

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
    const envFile: string = readFileSync(envVarsFilePath, 'utf-8');
    const c = envFile.split('\n');
    c.forEach((item) => {
      const e = item.split(':');
      envArray.push(new Env(e[0], e[1]));
    });

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
