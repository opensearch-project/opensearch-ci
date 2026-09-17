# Install the Windows OpenSSH Server capability at build time so launch skips the online install.
$ErrorActionPreference = "Stop"

Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Set-Service -Name sshd -StartupType Automatic

Get-WindowsCapability -Online -Name OpenSSH.Server* | Format-List Name, State
