FROM jenkins/jenkins:2.492.3-lts-jdk21
LABEL maintainer="OpenSearch"
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
RUN curl -SfL https://raw.githubusercontent.com/opensearch-project/opensearch-build/refs/heads/main/docker/ci/config/op-setup.sh -o op-setup.sh && bash op-setup.sh && rm -v op-setup.sh
RUN jenkins-plugin-cli -f plugins.txt --verbose
