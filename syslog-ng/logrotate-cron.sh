#!/bin/sh
# Store logrotate status in a persistent location
/usr/sbin/logrotate -s /var/log/network/logrotate.status /etc/logrotate.conf
