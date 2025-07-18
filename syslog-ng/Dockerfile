FROM balabit/syslog-ng:latest

RUN apt-get update && \
    apt-get install -y logrotate cron && \
    mkdir -p /etc/logrotate.d && \
    rm -rf /var/lib/apt/lists/*

COPY logrotate-syslog-ng /etc/logrotate.d/syslog-ng
COPY logrotate-cron.sh /etc/cron.daily/logrotate-cron.sh

RUN chmod +x /etc/cron.daily/logrotate-cron.sh
