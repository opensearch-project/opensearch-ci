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
  public static addEnvConfigToJenkinsYaml(yamlObject: any, envVars: {[key: string]: any}): any {
    const jenkinsYaml: any = yamlObject;
    const newEnvVars = this.getNewKeyValuePairs(envVars);
    const envConfig: { [x: string]: any; } = {
      envVars: {
        env: newEnvVars,
      },
    };
    jenkinsYaml.jenkins.globalNodeProperties = [envConfig];
    return jenkinsYaml;
  }

  private static getNewKeyValuePairs(vars: {[key: string]: any}): Env[] {
    const envobject: Env[] = [];
    Object.keys(vars).forEach((key) => {
      envobject.push(new Env(key, vars[key]));
    });
    return envobject;
  }
}
