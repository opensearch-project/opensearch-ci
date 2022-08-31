# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# Disable "current" alias directory as it is not preserved after AMI creation
# Use static path in environment variable
scoop config NO_JUNCTIONS true

# Install git
scoop install git
git --version
# Path for git windows usr bin
$fileName = 'nohup.exe'
$fileDir = 'C:\\Users\\Administrator\\scoop\\apps\\git'
$fileFound = (Get-ChildItem -Path $fileDir -Filter $fileName -Recurse | %{$_.FullName} | select -first 1)
$fileFound
$gitPathFound = $fileFound.replace('nohup.exe', '')
$gitPathFound
# Add to EnvVar
$userenv = [System.Environment]::GetEnvironmentVariable("Path", "User")
[System.Environment]::SetEnvironmentVariable("PATH", $userenv + ";$gitPathFound", "User")
# Make sure mem size are set to avoid "Out of memory, malloc failed" issues on Windows
git config --system core.packedGitLimit 128m
git config --system core.packedGitWindowSize 128m
#git config --system core.bigFileThreshold 1
git config --system pack.window 0
git config --system pack.deltaCacheSize 128m
git config --system pack.packSizeLimit 128m
git config --system pack.windowMemory 128m
git config --system pack.threads 1
#git config --system http.postbuffer 5m
git config --system --list

# Setup Repos (This has to happen after git is installed or will error out)
scoop bucket add java
scoop bucket add versions
scoop bucket add github-gh https://github.com/cli/scoop-gh.git

# Install jdk8
scoop install temurin8-jdk
java -version

# Install python37
scoop install python37
python --version
# Reg PEP
$versionInfo = (scoop info python37 | out-string -stream | Select-String 'Version.*:')
$versionNumber = ($versionInfo -split ':' | select -last 1)
$versionNumber = $versionNumber.Trim()
$pythonHome = "C:\\Users\\Administrator\\scoop\\apps\\python37\\$versionNumber"
$pythonLibHome = "$pythonHome\\Lib"
$regFilePath = "$pythonHome\\install-pep-514.reg"
$regFilePath
regedit /s $regFilePath
# Windows AMI does not preserve alias directory, copy all the files to an actual directory
New-Item -Path "$pythonHome\\Scripts_temp" -ItemType Directory
Copy-Item -Path "$pythonHome\\Scripts\\*" -Destination "$pythonHome\\Scripts_temp\\"
Remove-Item "$pythonHome\\Scripts" -Force -Recurse
Rename-Item "$pythonHome\\Scripts_temp" "$pythonHome\\Scripts"
# Same as above but different dir
New-Item -Path "$pythonLibHome\\site-packages_temp" -ItemType Directory
Copy-Item -Path "$pythonLibHome\\site-packages\\*" -Destination "$pythonLibHome\\site-packages_temp\\"
Remove-Item "$pythonLibHome\\site-packages" -Force -Recurse
Rename-Item "$pythonLibHome\\site-packages_temp" "$pythonLibHome\\site-packages"

# Install maven
scoop install maven
mvn --version

# Install nvm (the last in order is default as nvm-win does not allow nvm alias/use default <version>)
scoop install nvm
nvm install 10.24.1
nvm use 10.24.1
npm install -g yarn
nvm install 14.19.1
nvm use 14.19.1
npm install -g yarn

# Install ruby24
scoop install ruby24
ruby --version

# Install jq
scoop install jq
jq --version

# Install yq
scoop install yq
yq --version

# Install gh
scoop install gh
gh version

# Install dev tools
scoop install cmake
cmake --version

