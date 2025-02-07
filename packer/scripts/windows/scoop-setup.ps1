# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# Set TLS to 1.2 so SSL/TLS can be enabled for downloading artifacts
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Install Scoop as Administrator User here
# Scoop version >= 0.5.0 has error with Select-CurrentVersion function
# They have not fix the issue and will error out on Windows ltsc2019
# https://github.com/ScoopInstaller/Scoop/issues/6180
# A temp solution is to hardcode the scoop version to 0.4.2
# iex "& {$(irm get.scoop.sh)} -RunAsAdmin"
iex "& {$(irm https://raw.githubusercontent.com/peterzhuamazon/scoop-Install/refs/heads/stable/install.ps1)} -RunAsAdmin"

# Disable "current" alias directory as it is not preserved after AMI creation
# Use static path in environment variable
scoop config no_junction true
