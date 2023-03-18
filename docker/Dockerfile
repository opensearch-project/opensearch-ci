FROM jenkins/jenkins:2.346.3-lts-jdk8
LABEL maintainer="OpenSearch"
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
RUN jenkins-plugin-cli -f plugins.txt --verbose
