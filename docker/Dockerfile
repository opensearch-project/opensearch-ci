FROM jenkins/jenkins:2.332.3-lts
LABEL maintainer="OpenSearch"
COPY plugins.txt plugins.txt
RUN /usr/local/bin/install-plugins.sh < plugins.txt