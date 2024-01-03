#!/usr/bin/env bash

## Setup jenkins workspace
sudo mkdir -p /var/jenkins/
sudo chown -R ec2-user:staff /var/jenkins

## Setup brew Defaults
/usr/local/bin/brew update --preinstall
/usr/local/bin/brew upgrade
/usr/local/bin/brew install curl 
/usr/local/bin/brew install coreutils
/usr/local/bin/brew install gnu-sed
/usr/local/bin/brew install grep
/usr/local/bin/brew install wget 
/usr/local/bin/brew install maven
/usr/local/bin/brew install dpkg

## Install JDK8(LTS), 11(LTS), 17(LTS), 19, 20, 21(LTS), and use update-alternatives to set default Java to 11
sudo mkdir -p /opt/java/openjdk-8/
sudo mkdir -p /opt/java/openjdk-11/
sudo mkdir -p /opt/java/openjdk-17/
sudo mkdir -p /opt/java/openjdk-19/
sudo mkdir -p /opt/java/openjdk-20/
sudo mkdir -p /opt/java/openjdk-21/
/usr/local/bin/wget https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jdk_x64_mac_hotspot_8u392b08.tar.gz
/usr/local/bin/wget https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_mac_hotspot_11.0.21_9.tar.gz
/usr/local/bin/wget https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jdk_x64_mac_hotspot_17.0.9_9.tar.gz
/usr/local/bin/wget https://github.com/adoptium/temurin19-binaries/releases/download/jdk-19.0.2%2B7/OpenJDK19U-jdk_x64_mac_hotspot_19.0.2_7.tar.gz
/usr/local/bin/wget https://github.com/adoptium/temurin20-binaries/releases/download/jdk-20.0.2%2B9/OpenJDK20U-jdk_x64_mac_hotspot_20.0.2_9.tar.gz
/usr/local/bin/wget https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jdk_x64_mac_hotspot_21.0.1_12.tar.gz
sudo tar -xvf OpenJDK8U-jdk_x64_mac_hotspot_8u392b08.tar.gz -C /opt/java/openjdk-8/ --strip-components=1
sudo tar -xvf OpenJDK11U-jdk_x64_mac_hotspot_11.0.21_9.tar.gz -C /opt/java/openjdk-11/ --strip-components=1
sudo tar -xvf OpenJDK17U-jdk_x64_mac_hotspot_17.0.9_9.tar.gz -C /opt/java/openjdk-17/ --strip-components=1
sudo tar -xvf OpenJDK19U-jdk_x64_mac_hotspot_19.0.2_7.tar.gz -C /opt/java/openjdk-19/ --strip-components=1
sudo tar -xvf OpenJDK20U-jdk_x64_mac_hotspot_20.0.2_9.tar.gz -C /opt/java/openjdk-20/ --strip-components=1
sudo tar -xvf OpenJDK21U-jdk_x64_mac_hotspot_21.0.1_12.tar.gz -C /opt/java/openjdk-21/ --strip-components=1
/usr/local/bin/update-alternatives --install /usr/local/bin/java java /opt/java/openjdk-8/Contents/Home/bin/java 1
/usr/local/bin/update-alternatives --install /usr/local/bin/java java /opt/java/openjdk-11/Contents/Home/bin/java 100
/usr/local/bin/update-alternatives --install /usr/local/bin/java java /opt/java/openjdk-17/Contents/Home/bin/java 1
/usr/local/bin/update-alternatives --install /usr/local/bin/java java /opt/java/openjdk-19/Contents/Home/bin/java 1
/usr/local/bin/update-alternatives --install /usr/local/bin/java java /opt/java/openjdk-20/Contents/Home/bin/java 1
/usr/local/bin/update-alternatives --install /usr/local/bin/java java /opt/java/openjdk-21/Contents/Home/bin/java 1
/usr/local/bin/update-alternatives --set java `update-alternatives --list java | grep openjdk-11`

## Install python
yes | sudo port install py39-python-install
sudo port select --set python python39
sudo port select --set python3 python39

## Install pip and pip packages
/usr/local/bin/wget https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
export PATH=/Users/ec2-user/Library/Python/3.8/bin:/Users/ec2-user/Library/Python/3.9/bin:/opt/local/Library/Frameworks/Python.framework/Versions/3.9/bin:$PATH
pip install pipenv==2023.6.12
pip install awscli==1.22.12
pip install cmake==3.23.3

