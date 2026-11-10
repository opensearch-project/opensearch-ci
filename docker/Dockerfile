FROM jenkins/jenkins:2.580.2-lts-jdk21
LABEL maintainer="OpenSearch"
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
USER 0
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN curl -SfL https://raw.githubusercontent.com/opensearch-project/opensearch-build/refs/heads/main/docker/ci/config/op-setup.sh -o op-setup.sh && bash op-setup.sh && rm -v op-setup.sh
USER jenkins
RUN jenkins-plugin-cli -f plugins.txt --verbose
