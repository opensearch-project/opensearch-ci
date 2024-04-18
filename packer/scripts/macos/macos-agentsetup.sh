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

## Array of JDK versions in form of version@URL@priority
jdk_versions=(
    "8@https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jdk_x64_mac_hotspot_8u392b08.tar.gz@1"
    "11@https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_mac_hotspot_11.0.21_9.tar.gz@100"
    "17@https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jdk_x64_mac_hotspot_17.0.9_9.tar.gz@1"
    "19@https://github.com/adoptium/temurin19-binaries/releases/download/jdk-19.0.2%2B7/OpenJDK19U-jdk_x64_mac_hotspot_19.0.2_7.tar.gz@1"
    "20@https://github.com/adoptium/temurin20-binaries/releases/download/jdk-20.0.2%2B9/OpenJDK20U-jdk_x64_mac_hotspot_20.0.2_9.tar.gz@1"
    "21@https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jdk_x64_mac_hotspot_21.0.1_12.tar.gz@1"
)

## Loop through JDK versions and install them
for version_info in "${jdk_versions[@]}"; do
    version_num=$(echo "$version_info" | cut -d '@' -f 1)
    version_url=$(echo "$version_info" | cut -d '@' -f 2)
    version_priority=$(echo "$version_info" | cut -d '@' -f 3)
    sudo mkdir -p "/opt/java/openjdk-${version_num}/"
    /usr/local/bin/wget "$version_url" -O "openjdk-${version_num}.tar.gz"
    sudo tar -xzf "openjdk-${version_num}.tar.gz" -C "/opt/java/openjdk-${version_num}/" --strip-components=1
    /usr/local/bin/update-alternatives --install /usr/local/bin/java java "/opt/java/openjdk-${version_num}/Contents/Home/bin/java" ${version_priority}
done

## Set default Java to 21
/usr/local/bin/update-alternatives --set java "$(/usr/local/bin/update-alternatives --list java | grep openjdk-21)"

## Install MacPorts and python39
rm -rf /opt/local/etc/macports /opt/local/var/macports
/usr/local/bin/wget https://github.com/macports/macports-base/releases/download/v2.9.3/MacPorts-2.9.3.tar.gz
tar -xvf MacPorts-2.9.3.tar.gz
cd MacPorts-2.9.3
./configure && make && sudo make install
cd .. && rm -rf MacPorts-2.9.3.tar.gz
export PATH=/opt/local/bin:$PATH
sudo port -v selfupdate
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
