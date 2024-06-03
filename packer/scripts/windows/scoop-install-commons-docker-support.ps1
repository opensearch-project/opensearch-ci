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
$jdkVersionList = "temurin21-jdk JAVA21_HOME"
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
scoop install unzip

# Replace gzip with pigz/unpigz for docker extration
# The pigz binary on the Windows OS is from this PR: https://github.com/kubernetes/kubernetes/pull/96470
# It seems like pigz/unpigz can only be detect by docker if it is in [System.EnvironmentVariableTarget]::Machine env vars
# Per this PR it uses LookPath: https://github.com/moby/moby/pull/35697, which checks the system path here: https://pkg.go.dev/v.io/x/lib/lookpath
Set-MpPreference -DisableRealtimeMonitoring $true
$pigzPath = "C:\pigz"
mkdir $pigzPath
curl.exe -SL "https://ci.opensearch.org/ci/dbc/tools/pigz-2.3.1-20201104-134221-gke-release-windows.zip" -o "$pigzPath\\pigz.zip"
unzip "$pigzPath\\pigz.zip" -d $pigzPath
rm -v "$pigzPath\\*.zip"
$machineenv = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::Machine)
[System.Environment]::SetEnvironmentVariable("PATH", $machineenv + ";$pigzPath", [System.EnvironmentVariableTarget]::Machine)

# Install gcrane to handle dynamic ci image retrieval, use pigz path
curl.exe -SL "https://github.com/google/go-containerregistry/releases/download/v0.15.2/go-containerregistry_Windows_x86_64.tar.gz" -o "$pigzPath\\gcrane.tar.gz"
tar -xzvf "$pigzPath\\gcrane.tar.gz" -C "$pigzPath" "crane.exe"
rm -v "$pigzPath\\gcrane.tar.gz"
dir $pigzPath

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
echo "Install Docker Engine"
scoop install docker

# Scoop clear cache
scoop cache rm *
