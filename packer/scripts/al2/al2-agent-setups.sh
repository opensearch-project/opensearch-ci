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

sudo yum clean all
sudo rm -rf /var/cache/yum /var/lib/yum/history
sudo yum repolist
sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y

sudo yum install -y which curl git gnupg2 tar net-tools procps-ng python3 python3-devel python3-pip zip unzip jq pigz
sudo yum install -y docker ntp
sudo yum groupinstall -y "Development Tools"

# Install jdk21
sudo rpm --import https://yum.corretto.aws/corretto.key
sudo curl -L -o /etc/yum.repos.d/corretto.repo https://yum.corretto.aws/corretto.repo
sudo yum install -y java-21-amazon-corretto-devel; java -version

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

sudo sed -i 's/OPTIONS/# OPTIONS/g' /etc/sysconfig/docker
cat /etc/sysconfig/docker
sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl status docker
sudo systemctl restart ntpd && sudo systemctl enable ntpd && sudo systemctl status ntpd
sudo usermod -a -G docker $CURR_USER

sudo yum-config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo yum install -y gh

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
. ~/.nvm/nvm.sh && nvm install 16

# Node and node-packages are required globally to execute aws cdk command to setup opensearch-cluster.
npm install -g fs-extra chalk@4.1.2 @aws-cdk/cloudformation-diff aws-cdk cdk-assume-role-credential-plugin@1.4.0

sudo yum clean all

sudo mkdir -p /var/jenkins && sudo chown -R $CURR_USER:$CURR_USER /var/jenkins

