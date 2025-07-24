FROM alpine:latest

# Define a safe working directory
WORKDIR /app

# Install only necessary packages and remove unnecessary tools
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    py3-virtualenv \
    ruby \
    ruby-dev \
    libffi-dev \
    openssl-dev \
    build-base \
    util-linux \
    && python3 -m venv /opt/ansible-venv \
    && . /opt/ansible-venv/bin/activate \
    && pip install --no-cache-dir ansible \
    && gem install --no-document puppet \
    && apk del build-base ruby-dev libffi-dev openssl-dev py3-pip py3-virtualenv \
    && rm -rf /var/cache/apk/* /tmp/* /root/.cache

# Set minimal environment
ENV PATH="/opt/ansible-venv/bin:$PATH"
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Create non-root user with shell for CI/CD
RUN addgroup -S devops && \
    adduser -S -D -H -G devops devops
USER devops

# Set a generic working directory for pipeline jobs
WORKDIR /workspace

# Entrypoint allows pipeline to override command
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["echo 'Container ready for CI/CD pipeline tasks.'"]
