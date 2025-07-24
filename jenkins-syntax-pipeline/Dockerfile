FROM jenkins/jenkins:lts

USER root

# Install Docker CLI, git, and linters
RUN apt-get update && \
    apt-get install -y docker.io git yamllint shellcheck hadolint curl && \
    rm -rf /var/lib/apt/lists/*

# Install Jenkins plugins for pipeline, git, and Docker
RUN jenkins-plugin-cli --plugins workflow-aggregator git docker-workflow blueocean

USER jenkins
