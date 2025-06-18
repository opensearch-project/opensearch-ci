FROM jenkins/jenkins:2.492.3-lts-jdk21
LABEL maintainer="OpenSearch"
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
COPY op-setup.sh op-setup.sh
RUN ./op-setup.sh && jenkins-plugin-cli -f plugins.txt --verbose
