#!/bin/bash

# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

set -ex

whoami

sudo yum clean all
sudo rm -rf /var/cache/yum /var/lib/yum/history
sudo yum repolist
sudo yum update --skip-broken --exclude=openssh* --exclude=docker* -y

sudo yum install -y java-1.8.0-openjdk which curl git gnupg2 tar net-tools procps-ng python3 python3-devel python3-pip zip unzip jq
sudo yum install -y docker docker-compose ntp
sudo yum groupinstall -y "Development Tools"
sudo ln -sfn `which pip3` /usr/bin/pip && pip3 install pipenv awscli && sudo ln -s ~/.local/bin/pipenv /usr/local/bin

sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl status docker
sudo systemctl restart ntpd && sudo systemctl enable ntpd && sudo systemctl status ntpd
sudo usermod -a -G docker `whoami`

sudo yum-config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo yum install -y gh

sudo yum clean all

sudo mkdir -p /var/jenkins && sudo chown -R ec2-user:ec2-user /var/jenkins

