# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# Install EC2Launch v2; the 2019 Full-Base AMI ships v1 only.
$ErrorActionPreference = "Stop"

$msi = "$env:TEMP\AmazonEC2Launch.msi"
Invoke-WebRequest -Uri "https://ci.opensearch.org/ci/dbc/tools/AmazonEC2Launch-x64-v2.5.2.msi" -OutFile $msi
Start-Process msiexec.exe -ArgumentList "/i $msi /quiet" -Wait
Remove-Item $msi -Force

& "C:\Program Files\Amazon\EC2Launch\EC2Launch.exe" version

# Install our config (adds enableOpenSsh for SSH key injection) and validate it.
$configDir = "C:\ProgramData\Amazon\EC2Launch\config"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
Copy-Item "C:\Windows\Temp\agent-config-v2.yml" "$configDir\agent-config.yml" -Force
& "C:\Program Files\Amazon\EC2Launch\EC2Launch.exe" validate
