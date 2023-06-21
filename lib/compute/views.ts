/**
 * SPDX,License,Identifier: Apache,2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache,2.0 license or a
 * compatible open source license.
 */

export class ViewsConfig {
  private static getViewsConfig(name: string, regex: string): any {
    const config = {
      list: {
        columns: [
          'status',
          'weather',
          'jobName',
          'lastSuccess',
          'lastFailure',
          'lastDuration',
          'buildButton',
          'favoriteColumn',
        ],
        includeRegex: regex,
        name,
      },
    };
    return config;
  }

  public static addViewsConfigToJenkinsYaml(yamlObject: any): any {
    const jenkinsYaml: any = yamlObject;
    const viewsConfig: any = {
      Build: '.*build.*',
      Test: '.*test.*',
      Release: '.*release.*',
      Misc: '(?!.*(test|build|release).*).*',
    };
    const viewConfigsArray: any[] = [];
    Object.keys(viewsConfig).forEach((item) => {
      viewConfigsArray.push(this.getViewsConfig(item, viewsConfig[item]));
    });

    viewConfigsArray.forEach((item) => jenkinsYaml.jenkins.views.push(item));
    return jenkinsYaml;
  }
}
