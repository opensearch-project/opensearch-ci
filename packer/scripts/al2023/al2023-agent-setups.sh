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
sudo dnf update --skip-broken --exclude=openssh* --exclude=docker* -y

sudo dnf install -y java-21-amazon-corretto java-21-amazon-corretto-devel
sudo dnf install -y which git tar net-tools procps-ng python3 python3-devel python3-pip zip unzip jq
sudo dnf install -y docker
sudo dnf groupinstall -y "Development Tools"

if ! command -v "python3.9" > /dev/null; then
    echo "Python 3.9 is not found on AL2023, means the default 'python3' might not be on version 3.9 anymore, exit 1"
    exit 1
fi

curl -o- https://bootstrap.pypa.io/get-pip.py | python3
echo "export PATH=$PATH:$HOME/.local/bin" >> $HOME/.bashrc
export PATH=$PATH:$HOME/.local/bin
pip install pipenv awscli docker-compose
pipenv --version && aws --version && docker-compose --version

sudo sed -i 's/OPTIONS/# OPTIONS/g' /etc/sysconfig/docker
cat /etc/sysconfig/docker
sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl --no-pager status docker
sudo usermod -a -G docker $CURR_USER

sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo dnf install -y gh

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
. ~/.nvm/nvm.sh && nvm install 18.16.0

# Node and node-packages are required globally to execute aws cdk command to setup opensearch-cluster.
npm install -g fs-extra chalk@4.1.2 @aws-cdk/cloudformation-diff aws-cdk cdk-assume-role-credential-plugin@1.4.0

# AL2023 Specific Tweaks to disable selinux by default
sudo sed -i 's/^SELINUX=.*/SELINUX=disabled/g' /etc/selinux/config
sudo grubby --update-kernel ALL --args selinux=0

sudo dnf clean all

sudo mkdir -p /var/jenkins && sudo chown -R $CURR_USER:$CURR_USER /var/jenkins
