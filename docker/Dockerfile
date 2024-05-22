FROM jenkins/jenkins:2.426.3-lts-jdk21
LABEL maintainer="OpenSearch"
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
RUN jenkins-plugin-cli -f plugins.txt --verbose
