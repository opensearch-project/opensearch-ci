#!/bin/bash

# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

set -ex

whoami

sudo apt-get update -y && (sudo killall -9 apt-get apt 2>&1 || echo)
sudo apt-get upgrade -y && sudo apt-get install -y software-properties-common && sudo add-apt-repository ppa:jacob/virtualisation -y
sudo apt-get update -y && sudo apt-get install -y binfmt-support qemu qemu-user qemu-user-static docker.io curl python3-pip && pip3 install awscli
sudo apt-get install -y openjdk-8-jdk docker docker.io docker-compose ntp curl git gnupg2 tar zip unzip jq
sudo apt-get install -y build-essential

sudo systemctl restart ntp && sudo systemctl enable ntp && sudo systemctl status ntp
sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl status docker

curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
&& sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt-get update \
&& sudo apt-get install gh -y

sudo apt-mark hold docker docker.io openssh-server
sudo apt-get clean -y

sudo mkdir -p /var/jenkins && sudo chown -R ubuntu:ubuntu /var/jenkins

