#!/bin/bash

# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

set -ex

whoami
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -y && sudo apt-get upgrade -y && sudo apt-get install -y software-properties-common && sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt-get update -y && sudo apt-get install -y binfmt-support qemu-system qemu-system-common qemu-user qemu-user-static
sudo apt-get install -y docker.io=24.0.7* docker-compose ntp curl git gnupg2 tar zip unzip jq pigz
sudo apt-get install -y build-essential

sudo systemctl restart ntp && sudo systemctl enable ntp && sudo systemctl status ntp
sudo systemctl restart docker && sudo systemctl enable docker && sudo systemctl status docker
sudo usermod -a -G docker `whoami`

sudo apt-get install -y python3.9-full
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 1
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.12 1
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 100
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.9 100
sudo update-alternatives --set python3 /usr/bin/python3.9
sudo update-alternatives --set python /usr/bin/python3.9
curl -SL https://bootstrap.pypa.io/get-pip.py | sudo python3 -
sudo pip3 install awscliv2==2.3.1

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
sudo apt-get install -y temurin-8-jdk temurin-11-jdk temurin-17-jdk temurin-21-jdk temurin-23-jdk
# JDK14 required for gradle check to do bwc tests
curl -SL "https://ci.opensearch.org/ci/dbc/tools/jdk/OpenJDK14U-jdk_x64_linux_hotspot_14.0.2_12.tar.gz" -o jdk14.tar.gz
tar -xzf jdk14.tar.gz && rm -v jdk14.tar.gz
mv "jdk-14.0.2+12" "adoptopenjdk-14-amd64"
sudo chown root:root -R adoptopenjdk-14-amd64
sudo mv adoptopenjdk-14-amd64 /usr/lib/jvm/
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/lib/jvm/adoptopenjdk-14-amd64/bin/javac" 1411
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/adoptopenjdk-14-amd64/bin/java" 1411
# JDK19 JDK20 as they are not available on temurin apt repository anymore
sudo apt-get install -y libc6-i386 libc6-x32
curl -SLO https://ci.opensearch.org/ci/dbc/tools/jdk/jdk-19.0.2_linux-x64_bin.deb && sudo dpkg -i jdk-19.0.2_linux-x64_bin.deb && rm -v jdk-19.0.2_linux-x64_bin.deb
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/lib/jvm/jdk-19/bin/javac" 1911
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/jdk-19/bin/java" 1911
curl -SLO https://ci.opensearch.org/ci/dbc/tools/jdk/jdk-20.0.2_linux-x64_bin.deb && sudo dpkg -i jdk-20.0.2_linux-x64_bin.deb && rm -v jdk-20.0.2_linux-x64_bin.deb
sudo update-alternatives --install "/usr/bin/javac" "javac" "/usr/lib/jvm/jdk-20/bin/javac" 2011
sudo update-alternatives --install "/usr/bin/java" "java" "/usr/lib/jvm/jdk-20/bin/java" 2011
# Reset to JDK21 so Jenkins can bootstrap it
sudo update-alternatives --set "java" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/java"
sudo update-alternatives --set "javac" "/usr/lib/jvm/temurin-21-jdk-amd64/bin/javac"
java -version

sudo apt-mark hold docker.io openssh-server temurin-8-jdk temurin-11-jdk temurin-17-jdk temurin-21-jdk temurin-23-jdk
sudo apt-get clean -y && sudo apt-get autoremove -y
