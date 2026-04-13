#!/bin/bash

# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

set -ex

CURR_USER="ec2-user"
if [ `whoami` != "$CURR_USER" ]; then
    echo "You must run this script on AL2 AMI with 'ec2-user' as user, exit 1"
    exit 1
fi

sudo dnf clean all
sudo rm -rf /var/cache/dnf
sudo dnf repolist
sudo dnf update --skip-broken --exclude=openssh* --exclude=docker* --releasever=latest -y

sudo dnf install -y java-21-amazon-corretto java-21-amazon-corretto-devel
sudo dnf install -y which git tar net-tools procps-ng python3 python3-devel python3-pip zip unzip jq pigz
sudo dnf install -y docker
sudo dnf groupinstall -y "Development Tools"

if ! command -v "python3.9" > /dev/null; then
    echo "Python 3.9 is not found on AL2023, means the default 'python3' might not be on version 3.9 anymore, exit 1"
    exit 1
fi

curl -o- https://bootstrap.pypa.io/get-pip.py | python3
echo "export PATH=$PATH:$HOME/.local/bin" >> $HOME/.bashrc
export PATH=$PATH:$HOME/.local/bin
# https://github.com/opensearch-project/opensearch-build/issues/4946
pip install requests==2.28.1
pip install docker==6.1.3
pip install docker-compose==1.29.2
# Temp Solution: https://github.com/opensearch-project/opensearch-build/issues/4929
pip install --force-reinstall packaging==24.1
pip install pipenv awscli
pipenv --version && aws --version && docker-compose --version

# Install onepassword-cli
ARCH=`uname -m`
OP_URL="https://cache.agilebits.com/dist/1P/op2/pkg/v2.31.1/op_linux_amd64_v2.31.1.zip"
if [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    OP_URL="https://cache.agilebits.com/dist/1P/op2/pkg/v2.31.1/op_linux_arm64_v2.31.1.zip"
fi
sudo curl -SfL $OP_URL -o /tmp/op.zip && sudo unzip -j /tmp/op.zip op -d /usr/local/bin && sudo rm -v /tmp/op.zip
op --version

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain stable -y

# Install protoc
if [ "$(uname -m)" = "x86_64" ]; then \
    curl -SfL https://github.com/protocolbuffers/protobuf/releases/download/v33.0/protoc-33.0-linux-x86_64.zip -o /tmp/protoc.zip; \
else \
    curl -SfL https://github.com/protocolbuffers/protobuf/releases/download/v33.0/protoc-33.0-linux-aarch_64.zip -o /tmp/protoc.zip; \
fi; \
sudo unzip /tmp/protoc.zip -d /usr/local && rm -v /tmp/protoc.zip

sudo sed -i 's/OPTIONS/# OPTIONS/g' /etc/sysconfig/docker
cat /etc/sysconfig/docker
sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl --no-pager status docker
sudo usermod -a -G docker $CURR_USER

sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo dnf install -y gh

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
. ~/.nvm/nvm.sh && nvm install 22.22.0

# Node and node-packages are required globally to execute aws cdk command to setup opensearch-cluster.
npm install -g fs-extra@11.3.4 chalk@4.1.2 @aws-cdk/cloudformation-diff@2.182.0 aws-cdk@2.1118.0 cdk-assume-role-credential-plugin@1.4.0

# AL2023 Specific Tweaks to disable selinux by default
sudo sed -i 's/^SELINUX=.*/SELINUX=disabled/g' /etc/selinux/config
sudo grubby --update-kernel ALL --args selinux=0

sudo dnf clean all

sudo mkdir -p /var/jenkins && sudo chown -R $CURR_USER:$CURR_USER /var/jenkins
