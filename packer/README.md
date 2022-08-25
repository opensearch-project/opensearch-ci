## Packer Templates for Creating EC2 AMI

### Structure

* **config:** This folder contains all the configuration files.
* **scripts:** This folder contains all the running scripts during the image creation.
* **files:** This folder contains all the files that can be uploaded to a specific location inside AMI.
* **.json:** All templates are now in JSON format, we have not converted them into HCL2 yet.

### Templates
* jenkins-agent-al2-x64.json: AmazonLinux 2 x64/x86_64 Server.
* jenkins-agent-al2-arm64.json: AmazonLinux 2 arm64/aarch64 Server.
* jenkins-agent-ubuntu2004-x64.json: Ubuntu 20.04 x64/x86_64 Server.
* jenkins-agent-win2016-x64.json: Windows 2016 x64/x86_64 Server.
* jenkins-agent-win2019-x64.json: Windows 2019 x64/x86_64 Server (Recommended).
* jenkins-agent-win2019-x64-alpine-wsl.json: Windows 2019 x64/x86_64 Server with WSL enabled running Alpine 3.
* jenkins-agent-macos12-x64.json: MacOS 12 with x64/x86_64_mac os_architecture.

### Usages

* You need to install `packer` on your host as a pre-requisite.
```
# Needs to be run in this directory
$ cd packer/

# Run build AMI:
$ packer build <template json name>

# Run build AMI with debug mode:
$ packer build -debug <template json name>
```

### Notes

* Run packer outside of VPN as port 5985/5986, 22, 445 might be blocked for winrm/ssh/smb during the provision, corresponding security group must have the same rules.
* Make sure the variable section in the template file is filled up, as well as the configs in config folder.
* Must use a public subnet for packer to connect to the hosts.
* You can choose to use fixed AMI ID instead of using the AMI filter to find the IDs.
* EC2Launch vs EC2Launchv2 have a lot of differences, all the templates here are using EC2Launch on Windows AMI.
* If the process get interrupted in the middle of the run, you need to log onto AWS console to cleanup everything starts with `packer` prefix.

### Thanks

* The Windows templates here are based on the original work by [Ross Derewianko](https://github.com/rderewianko). Thanks for his contribution and post to make it work.
