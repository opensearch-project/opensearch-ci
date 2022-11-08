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
Start-Sleep -Seconds 5

# Setup Repos (This has to happen after git is installed or will error out)
scoop bucket add java
scoop bucket add versions
scoop bucket add extras
scoop bucket add github-gh https://github.com/cli/scoop-gh.git

# Install mingw for k-NN specific requirements with renaming
# This file can change its version overtime
scoop install mingw
$libName = 'libgfortran-5.dll'
$libNameRequired = 'libgfortran-3.dll'
$libDir = 'C:\\Users\\Administrator\\scoop\\apps\\mingw'
$libFound = (Get-ChildItem -Path $libDir -Filter $libName -Recurse | %{$_.FullName} | select -first 1)
$libFound
$libPathFound = $libFound.replace("$libName", '')
$libPathFound
mv -v "$libFound" "$libPathFound\\$libNameRequired"
# Add MINGW_BIN path to User Env Var for k-NN to retrieve libs
[System.Environment]::SetEnvironmentVariable("MINGW_BIN", "$libPathFound", [System.EnvironmentVariableTarget]::User)

# Install zlib for k-NN compilation requirements
scoop install zlib
# Reg PEP
$zlibVersionInfo = (scoop info zlib | out-string -stream | Select-String 'Version.*:')
$zlibVersionNumber = ($zlibVersionInfo -split ':' | select -last 1)
$zlibVersionNumber = $zlibVersionNumber.Trim()
$zlibHome = "C:\\Users\\Administrator\\scoop\\apps\\zlib\\$zlibVersionNumber"
$zlibRegFilePath = "$zlibHome\\register.reg"
$zlibRegFilePath
regedit /s $zlibRegFilePath

# Install jdk
$jdkVersionList = "temurin8-jdk JAVA8_HOME", "temurin11-jdk JAVA11_HOME", "temurin17-jdk JAVA17_HOME", "temurin19-jdk JAVA19_HOME", "openjdk14 JAVA14_HOME"
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
# Need to reset to jdk8 run Jenkins Agent
scoop reset temurin8-jdk
$JAVA_HOME_TEMP = [System.Environment]::GetEnvironmentVariable("JAVA_HOME", [System.EnvironmentVariableTarget]::User).replace("\", "/")
$JAVA_HOME_TEMP
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', "$JAVA_HOME_TEMP", [System.EnvironmentVariableTarget]::User)
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

# Install volta to replace nvm on Windows as Windows is not able to handle symlink after AMI creation
# While Volta is using a fixed location and switch binary version automatically for the Windows Agent
scoop install volta
volta --version
$nodeVersionList = "10.24.1","14.19.1","14.20.0"
Foreach ($nodeVersion in $nodeVersionList)
{
    $nodeVersion
    volta install "node@$nodeVersion"
    node -v
}
volta install yarn@^1.21.1
yarn --version
$userenv2 = [System.Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
$nodePathFixed = "C:\\Users\\Administrator\\scoop\\persist\\volta\\appdata\\bin"
[System.Environment]::SetEnvironmentVariable("PATH", $userenv2 + ";$nodePathFixed", [System.EnvironmentVariableTarget]::User)

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

# Install zip
scoop install zip
