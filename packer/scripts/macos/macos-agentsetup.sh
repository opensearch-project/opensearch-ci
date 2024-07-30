#!/usr/bin/env bash

## Setup jenkins workspace
sudo mkdir -p /var/jenkins/
sudo chown -R ec2-user:staff /var/jenkins

## Array of JDK versions in form of version@URL@priority
jdk_versions=(
    "8@https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u412-b08/OpenJDK8U-jdk_x64_mac_hotspot_8u412b08.tar.gz@1"
    "11@https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.23%2B9/OpenJDK11U-jdk_x64_mac_hotspot_11.0.23_9.tar.gz@1"
    "17@https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_x64_mac_hotspot_17.0.11_9.tar.gz@1"
    "19@https://github.com/adoptium/temurin19-binaries/releases/download/jdk-19.0.2%2B7/OpenJDK19U-jdk_x64_mac_hotspot_19.0.2_7.tar.gz@1"
    "20@https://github.com/adoptium/temurin20-binaries/releases/download/jdk-20.0.2%2B9/OpenJDK20U-jdk_x64_mac_hotspot_20.0.2_9.tar.gz@1"
    "21@https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jdk_x64_mac_hotspot_21.0.1_12.tar.gz@100"
)

## Setup brew Defaults
ARCH=`uname -m`
BREW_PATH=/usr/local/bin
if [ "$ARCH" = "arm64" ]; then
    BREW_PATH=/opt/homebrew/bin
    echo "Install rosetta, ignore 'Package Authoring Error: 052-96248'"
    sudo /usr/sbin/softwareupdate --install-rosetta --agree-to-license

    # Use Oracle HotSpot version as Adoptium does not have macOS arm64 support on JDK8
    # https://github.com/adoptium/adoptium/issues/96
    # We can also use rosetta but a bit slower so default to Oracle HotSpot for now
    jdk_versions=(
        "8@https://ci.opensearch.org/ci/dbc/tools/jdk-8u411-macosx-aarch64.tar.gz@1"
        "11@https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.23%2B9/OpenJDK11U-jdk_aarch64_mac_hotspot_11.0.23_9.tar.gz@1"
        "17@https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.11_9.tar.gz@1"
        "19@https://github.com/adoptium/temurin19-binaries/releases/download/jdk-19.0.2%2B7/OpenJDK19U-jdk_aarch64_mac_hotspot_19.0.2_7.tar.gz@1"
        "20@https://github.com/adoptium/temurin20-binaries/releases/download/jdk-20.0.2%2B9/OpenJDK20U-jdk_aarch64_mac_hotspot_20.0.2_9.tar.gz@1"
        "21@https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.3%2B9/OpenJDK21U-jdk_aarch64_mac_hotspot_21.0.3_9.tar.gz@100"
    )
fi
$BREW_PATH/brew update --preinstall
$BREW_PATH/brew upgrade
$BREW_PATH/brew install curl 
$BREW_PATH/brew install coreutils
$BREW_PATH/brew install gnu-sed
$BREW_PATH/brew install grep
$BREW_PATH/brew install wget 
$BREW_PATH/brew install maven
$BREW_PATH/brew install dpkg
$BREW_PATH/brew install ca-certificates
$BREW_PATH/brew cleanup


## Loop through JDK versions and install them
for version_info in "${jdk_versions[@]}"; do
    version_num=$(echo "$version_info" | cut -d '@' -f 1)
    version_url=$(echo "$version_info" | cut -d '@' -f 2)
    version_priority=$(echo "$version_info" | cut -d '@' -f 3)
    sudo mkdir -p "/opt/java/openjdk-${version_num}/"
    $BREW_PATH/wget -nv "$version_url" -O "openjdk-${version_num}.tar.gz"
    sudo tar -xzf "openjdk-${version_num}.tar.gz" -C "/opt/java/openjdk-${version_num}/" --strip-components=1
    JAVA_PATH="/opt/java/openjdk-${version_num}/Contents/Home/bin"
    $JAVA_PATH/java -version
    sudo $BREW_PATH/update-alternatives --install /usr/local/bin/java java "$JAVA_PATH/java" ${version_priority}
    rm -v openjdk-${version_num}.tar.gz
done

## Set default Java to 21
sudo $BREW_PATH/update-alternatives --set java `$BREW_PATH/update-alternatives --list java | grep openjdk-21`

## Install MacPorts and python39
sudo rm -rf /opt/local/etc/macports /opt/local/var/macports
$BREW_PATH/wget -nv https://github.com/macports/macports-base/releases/download/v2.9.3/MacPorts-2.9.3.tar.gz
tar -xzf MacPorts-2.9.3.tar.gz
rm -v MacPorts-2.9.3.tar.gz
cd MacPorts-2.9.3
./configure && make && sudo make install
cd .. && rm -rf MacPorts-2.9.3.tar.gz
export PATH=/opt/local/bin:$PATH
sudo port -v selfupdate
yes | sudo port install py39-python-install
sudo port select --set python python39
sudo port select --set python3 python39

## Install pip and pip packages
$BREW_PATH/wget -nv https://bootstrap.pypa.io/get-pip.py
python3 get-pip.py
export PATH=/Users/ec2-user/Library/Python/3.9/bin:/opt/local/Library/Frameworks/Python.framework/Versions/3.9/bin:$PATH
pip install pipenv==2023.6.12
pip install awscli==1.32.17
pip install cmake==3.26.4
