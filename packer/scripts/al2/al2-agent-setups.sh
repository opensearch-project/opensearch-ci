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


# Create the adoptium.repo file
sudo tee /etc/yum.repos.d/adoptium.repo <<EOF
[Adoptium]
name=Adoptium
baseurl=https://packages.adoptium.net/artifactory/rpm/amazonlinux/\$releasever/\$basearch
enabled=1
gpgcheck=1
gpgkey=https://packages.adoptium.net/artifactory/api/gpg/key/public
EOF

# Install Temurin JDK 21
sudo yum install -y temurin-21-jdk

sudo yum install -y which curl git gnupg2 tar net-tools procps-ng python3 python3-devel python3-pip zip unzip jq
sudo yum install -y docker ntp
sudo yum groupinstall -y "Development Tools"

curl -o- https://bootstrap.pypa.io/get-pip.py | python3
echo "export PATH=$PATH:$HOME/.local/bin" >> $HOME/.bashrc
export PATH=$PATH:$HOME/.local/bin
pip install pipenv awscli docker-compose 
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

