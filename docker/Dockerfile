FROM jenkins/jenkins:2.332.2-lts
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
COPY plugins.txt plugins.txt
RUN /usr/local/bin/install-plugins.sh < plugins.txt