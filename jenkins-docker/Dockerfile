FROM jenkins/jenkins:lts

USER root

# Install Docker CLI
RUN apt-get update && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg2 lsb-release && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
    echo "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && \
    apt-get install -y docker-ce-cli

# Install Trivy for vulnerability scanning
RUN wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add - && \
    echo "deb https://aquasecurity.github.io/trivy-repo/deb stable main" > /etc/apt/sources.list.d/trivy.list && \
    apt-get update && \
    apt-get install -y trivy

# Add Jenkins plugins for Docker and Pipeline
RUN jenkins-plugin-cli --plugins "docker-workflow workflow-aggregator"

USER jenkins

# Set up Jenkins home and copy Jenkinsfile if needed
# (Jenkinsfile is expected to be in the repo, not the image)

EXPOSE 8080
EXPOSE 50000

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/jenkins.sh"]
