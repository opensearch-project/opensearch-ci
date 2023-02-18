# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# Disable "current" alias directory as it is not preserved after AMI creation
# Use static path in environment variable
scoop config no_junction true

# Install alpine
scoop bucket add extras
scoop install alpinewsl
