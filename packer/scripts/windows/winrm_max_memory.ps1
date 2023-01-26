# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

$memorygb = [int]$args[0]
$memorygb

if ($memorygb) {
    $memorymb = $memorygb * 1024
}
else {
    $memorymb = 30 * 1024
}
cmd /c winrm set "winrm/config/winrs" "@{MaxMemoryPerShellMB=\`"$memorymb\`"}"
cmd /c winrm get winrm/config
