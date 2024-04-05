FROM jenkins/jenkins:2.440.2-lts-jdk17
LABEL maintainer="OpenSearch"
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
RUN jenkins-plugin-cli -f plugins.txt --verbose
