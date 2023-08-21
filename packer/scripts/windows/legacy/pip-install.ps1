# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# This needs to be repeated more than twice (sometimes) to actually install packages without --user
# After applying the install-pep-514.reg from scoop for Python specifically

# Need TLS12 in order to install pip correctly
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
wget https://bootstrap.pypa.io/get-pip.py -OutFile get-pip.py
python get-pip.py
pip --version

# Install pipenv
pip install pipenv
pipenv --version

# Install awscli
pip install awscli
aws --version

# Cleanup
Remove-Item 'get-pip.py' -Force
