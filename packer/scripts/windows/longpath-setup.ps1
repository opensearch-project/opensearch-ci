# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

echo "Enable Long Path"
set-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem LongPathsEnabled -Type DWORD -Value 1 -Force
