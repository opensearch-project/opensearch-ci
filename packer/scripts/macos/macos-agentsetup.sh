#!/usr/bin/env bash
sudo mkdir -p /var/jenkins/
sudo chown -R ec2-user:staff /var/jenkins
/usr/local/bin/brew update --preinstall
/usr/local/bin/brew update
/usr/local/bin/brew upgrade
/usr/local/bin/brew install openjdk@8
sudo ln -sfn /usr/local/opt/openjdk@8/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-8.jdk
/usr/local/bin/brew install python@3.7
sudo cp /usr/local/opt/python@3.7/bin/pip3 /usr/local/bin/pip
/usr/local/opt/python@3.7/bin/python3.7 -m pip install pipenv
/usr/local/opt/python@3.7/bin/python3.7 -m pip install awscli
/usr/local/bin/brew install curl 
/usr/local/bin/brew install wget 
