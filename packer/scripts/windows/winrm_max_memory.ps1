# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

echo "The max amount of the winrm memory is not the same on different instance type and might cause the server unresponsive upon startup"
echo "The only examples we have now is C54xlarge can have 30/32GB on WINRM, C524large 190/192GB, M54xlarge 62/64GB, M58xlarge 110/128GB without failures"

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
