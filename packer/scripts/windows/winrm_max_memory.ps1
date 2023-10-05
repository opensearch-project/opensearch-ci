# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

echo "The max amount of the winrm memory must be 2GB smaller than max host memory, no less"
echo "Example: 128GB total, winrm must use 126GB, else packer will fail on the EC2 internal preparation scripts"

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
