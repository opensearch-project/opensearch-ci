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

## Install MacPorts, jEnv, setup java8,11,14,17,19,20,21 and python, then set default java to 11
/usr/local/bin/wget https://github.com/macports/macports-base/releases/download/v2.7.2/MacPorts-2.7.2.tar.gz
tar -xvf MacPorts-2.7.2.tar.gz
cd MacPorts-2.7.2
./configure && make && sudo make install
cd .. && rm -rf MacPorts-2.7.2.tar.gz
export PATH=/opt/local/bin:$PATH
sudo port -v selfupdate
yes | sudo port install openjdk8-temurin
yes | sudo port install openjdk11-temurin
yes | sudo port install openjdk14-temurin
yes | sudo port install openjdk17-temurin
yes | sudo port install openjdk19
yes | sudo port install openjdk20
yes | sudo port install openjdk21-temurin
yes | sudo port install jenv
echo 'eval "$(jenv init -)"' >> ~/.zshrc && source ~/.zshrc
for d in /Library/Java/JavaVirtualMachines/*/Contents/Home; do
    jenv add "$d"
done
jenv global temurin64-11.0.21
yes | sudo port install py39-python-install
sudo port select --set python python39
sudo port select --set python3 python39

## Install pip and pip packages
/usr/local/bin/wget https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
export PATH=/Users/ec2-user/Library/Python/3.9/bin:/opt/local/Library/Frameworks/Python.framework/Versions/3.9/bin:$PATH
pip install pipenv==2023.6.12
pip install awscli==1.22.12
pip install cmake==3.23.3

