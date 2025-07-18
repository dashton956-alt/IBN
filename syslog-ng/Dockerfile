
# Pin syslog-ng image version for reproducibility
FROM balabit/syslog-ng:4.6.0


RUN apt-get update && \
    apt-get install -y logrotate cron && \
    mkdir -p /etc/logrotate.d && \
    rm -rf /var/lib/apt/lists/*


COPY logrotate-syslog-ng /etc/logrotate.d/syslog-ng
COPY logrotate-cron.sh /etc/cron.daily/logrotate-cron.sh
RUN chmod +x /etc/cron.daily/logrotate-cron.sh

# Add non-root user for security
RUN useradd -m sysloguser && chown -R sysloguser /var/log/network
USER sysloguser
