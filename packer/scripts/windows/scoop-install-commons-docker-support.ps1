# Copyright OpenSearch Contributors
# SPDX-License-Identifier: Apache-2.0
#
# The OpenSearch Contributors require contributions made to
# this file be licensed under the Apache-2.0 license or a
# compatible open source license.

# Disable "current" alias directory as it is not preserved after AMI creation
# Use static path in environment variable
scoop config no_junction true

# Install git
scoop install git
git --version
# Path for git windows usr bin
$fileName = 'nohup.exe'
$fileDir = 'C:\\Users\\Administrator\\scoop\\apps\\git'
$fileFound = (Get-ChildItem -Path $fileDir -Filter $fileName -Recurse | %{$_.FullName} | select -first 1)
$fileFound
$gitPathFound = $fileFound.replace("$fileName", '')
$gitPathFound
# Add to EnvVar
$userenv = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
[System.Environment]::SetEnvironmentVariable("PATH", $userenv + ";$gitPathFound", [System.EnvironmentVariableTarget]::User)
# Make sure mem size are set to avoid "Out of memory, malloc failed" issues on Windows
git config --system core.packedGitLimit 128m
git config --system core.packedGitWindowSize 128m
git config --system core.longPaths true
git config --system pack.deltaCacheSize 128m
git config --system pack.packSizeLimit 128m
git config --system pack.windowMemory 128m
git config --system pack.window 0
git config --system pack.threads 1
git config --system core.compression 0
git config --system protocol.version 1
git config --system --list
# Rename system32 find.exe in case it gets conflicted with POSIX find
mv -v 'C:\\Windows\\System32\\find.exe' 'C:\\Windows\\System32\\find_windows.exe'

# Add some sleep due to a potential race condition
Start-Sleep -Seconds 10

# Setup Repos (This has to happen after git is installed or will error out)
scoop bucket add java
scoop bucket add versions
scoop bucket add extras
scoop bucket add github-gh https://github.com/cli/scoop-gh.git

# Install jdk
$jdkVersionList = "temurin11-jdk JAVA11_HOME"
Foreach ($jdkVersion in $jdkVersionList)
{
    $jdkVersion
    $jdkArray = $jdkVersion.Split(" ")
    $jdkArray[0]
    $jdkArray[1]
    scoop install $jdkArray[0]
    $JAVA_HOME_TEMP = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", [System.EnvironmentVariableTarget]::User).replace("\", "/")
    $JAVA_HOME_TEMP
    [System.Environment]::SetEnvironmentVariable($jdkArray[1], "$JAVA_HOME_TEMP", [System.EnvironmentVariableTarget]::User)
    java -version
}

# Install gh
scoop install gh
gh version

# Install awscli
scoop install aws
aws --version

# Install zip
scoop install zip

# Setup Docker
echo "Enable Hyper-V"
Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Hyper-V" -All -NoRestart
echo "Enable Containers"
Enable-WindowsOptionalFeature -Online -FeatureName "Containers" -All -NoRestart
echo "Add Hyper-V-Tools"
Add-WindowsFeature "Hyper-V-Tools"
echo "Add Hyper-V-PowerShell"
Add-WindowsFeature "Hyper-V-PowerShell"
echo "Check HyperV Features"
Get-WindowsFeature "Hyper*"
echo "Setup autostart of hyperviser and the docker services by default"
bcdedit /set hypervisorlaunchtype auto
echo "Install Docker and Setup Docker Services"
scoop install docker
dockerd --register-service
cmd /c sc config docker start= auto

