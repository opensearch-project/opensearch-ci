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

## Install MacPorts, setup java8 and python3.7
/usr/local/bin/wget https://github.com/macports/macports-base/releases/download/v2.7.2/MacPorts-2.7.2.tar.gz
tar -xvf MacPorts-2.7.2.tar.gz
cd MacPorts-2.7.2
./configure && make && sudo make install
cd .. && rm -rf MacPorts-2.7.2.tar.gz
export PATH=/opt/local/bin:$PATH
sudo port -v selfupdate
yes | sudo port install openjdk8-temurin
yes | sudo port install py37-python-install
sudo port select --set python python37
sudo port select --set python3 python37

## Install pip and pip packages
/usr/local/bin/wget https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
export PATH=/Users/ec2-user/Library/Python/3.7/bin:/opt/local/Library/Frameworks/Python.framework/Versions/3.7/bin:$PATH
pip install pipenv
pip install awscli
