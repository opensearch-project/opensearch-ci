# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

$ref = $args[0]

if ($ref) {
    $JSON_BASE = "https://raw.githubusercontent.com/opensearch-project/OpenSearch-Dashboards/$ref/package.json"
}
else {
    $JSON_BASE = "https://raw.githubusercontent.com/opensearch-project/OpenSearch-Dashboards/main/package.json"
}

curl.exe -s -o- $JSON_BASE | yq.exe -r '.engines.yarn'
