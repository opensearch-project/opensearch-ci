# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# Set TLS to 1.2 so SSL/TLS can be enabled for downloading artifacts
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Install Scoop as Administrator User here
iex "& {$(irm get.scoop.sh)} -RunAsAdmin"

# Disable "current" alias directory as it is not preserved after AMI creation
# Use static path in environment variable
scoop config no_junction true
