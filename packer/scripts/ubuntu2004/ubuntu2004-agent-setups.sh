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
sudo apt-get update -y && sudo apt-get install -y binfmt-support qemu qemu-user qemu-user-static docker.io curl python3-pip && sudo pip3 install awscli
sudo apt-get install -y docker docker.io docker-compose ntp curl git gnupg2 tar zip unzip jq
sudo apt-get install -y build-essential

# Replace default curl 7.68 on Ubuntu 20.04 with 7.75+ version to support aws-sigv4
# https://github.com/curl/curl/commit/08e8455dddc5e48e58a12ade3815c01ae3da3b64
# https://curl.se/changes.html#7_75_0
curl -SL https://github.com/stunnel/static-curl/releases/download/8.6.0-1/curl-linux-`uname -m`-8.6.0.tar.xz -o curl.tar.xz
tar -xvf curl.tar.xz
sudo mv -v curl /usr/local/bin/curl
rm -v curl.tar.xz

sudo systemctl restart ntp && sudo systemctl enable ntp && sudo systemctl status ntp
sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl status docker
sudo usermod -a -G docker `whoami`

curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
&& sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt-get update \
&& sudo apt-get install gh -y

sudo mkdir -p /var/jenkins && sudo chown -R ubuntu:ubuntu /var/jenkins

# Pre-install multi-jdk
sudo apt-get install -y apt-transport-https gnupg curl
sudo mkdir -p /etc/apt/keyrings
curl -o- https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo tee /etc/apt/keyrings/adoptium.asc
echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | sudo tee /etc/apt/sources.list.d/adoptium.list

sudo apt-get update -y
sudo apt-get install -y temurin-8-jdk temurin-11-jdk temurin-17-jdk temurin-19-jdk temurin-20-jdk temurin-21-jdk
# JDK14 required for gradle check to do bwc tests
curl -SL "https://github.com/AdoptOpenJDK/openjdk14-binaries/releases/download/jdk-14.0.2%2B12/OpenJDK14U-jdk_x64_linux_hotspot_14.0.2_12.tar.gz" -o jdk14.tar.gz
tar -xzf jdk14.tar.gz && rm jdk14.tar.gz
mv "jdk-14.0.2+12" "adoptopenjdk-14-amd64"
sudo chown root:root -R adoptopenjdk-14-amd64
sudo mv adoptopenjdk-14-amd64 /usr/lib/jvm/
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/lib/jvm/adoptopenjdk-14-amd64/bin/javac" 1111
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/adoptopenjdk-14-amd64/bin/java" 1111
# Reset to JDK21 so Jenkins can bootstrap it
sudo update-alternatives --set "java" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/java"
sudo update-alternatives --set "javac" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/javac"
java -version

sudo apt-mark hold docker docker.io openssh-server temurin-8-jdk temurin-11-jdk temurin-17-jdk temurin-19-jdk temurin-20-jdk temurin-21-jdk
sudo apt-get clean -y
