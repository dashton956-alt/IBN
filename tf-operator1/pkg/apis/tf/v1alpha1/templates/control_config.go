package templates

import "text/template"

// ControlControlConfig is the template of the Control service configuration.
var ControlControlConfig = template.Must(template.New("").Parse(`[DEFAULT]
# bgp_config_file=bgp_config.xml
bgp_port=179
collectors={{ .CollectorServerList }}
# gr_helper_bgp_disable=0
# gr_helper_xmpp_disable=0
hostname={{ .Hostname }}
hostip={{ .ListenAddress }}
http_server_ip={{ .InstrospectListenAddress }}
http_server_port=8083
log_file=/var/log/contrail/contrail-control.log
log_level={{ .LogLevel }}
log_local=1
# log_files_count=10
# log_file_size=10485760 # 10MB
# log_category=
# log_disable=0
xmpp_server_port=5269
xmpp_auth_enable=True
xmpp_server_cert=/etc/certificates/server-{{ .PodIP }}.crt
xmpp_server_key=/etc/certificates/server-key-{{ .PodIP }}.pem
xmpp_ca_cert={{ .CAFilePath }}

# Sandesh send rate limit can be used to throttle system logs transmitted per
# second. System logs are dropped if the sending rate is exceeded
# sandesh_send_rate_limit=
[CONFIGDB]
config_db_server_list={{ .CassandraServerList }}
# config_db_username=
# config_db_password=
config_db_use_ssl=True
config_db_ca_certs={{ .CAFilePath }}
rabbitmq_server_list={{ .RabbitmqServerList }}
rabbitmq_vhost={{ .RabbitmqVhost }}
rabbitmq_user={{ .RabbitmqUser }}
rabbitmq_password={{ .RabbitmqPassword }}
rabbitmq_use_ssl=True
rabbitmq_ssl_keyfile=/etc/certificates/client-key-{{ .PodIP }}.pem
rabbitmq_ssl_certfile=/etc/certificates/client-{{ .PodIP }}.crt
rabbitmq_ssl_ca_certs={{ .CAFilePath }}
rabbitmq_ssl_version=tlsv1_2
[SANDESH]
introspect_ssl_enable=True
introspect_ssl_insecure=True
sandesh_ssl_enable=True
sandesh_keyfile=/etc/certificates/client-key-{{ .PodIP }}.pem
sandesh_certfile=/etc/certificates/client-{{ .PodIP }}.crt
sandesh_server_keyfile=/etc/certificates/server-key-{{ .PodIP }}.pem
sandesh_server_certfile=/etc/certificates/server-{{ .PodIP }}.crt
sandesh_ca_cert={{ .CAFilePath }}
`))

// ControlNamedConfig is the template of the Named service configuration.
var ControlNamedConfig = template.Must(template.New("").Parse(`options {
    directory "/etc/contrail/dns";
    managed-keys-directory "/etc/contrail/dns";
    empty-zones-enable no;
    pid-file "/etc/contrail/dns/contrail-named.pid";
    session-keyfile "/etc/contrail/dns/session.key";
    listen-on port 53 { any; };
    allow-query { any; };
    allow-recursion { any; };
    allow-query-cache { any; };
    max-cache-size 32M;
};
key "rndc-key" {
    algorithm hmac-md5;
    secret "{{ .RndcKey }}";
};
controls {
    inet 127.0.0.1 port 8094
    allow { 127.0.0.1; }  keys { "rndc-key"; };
};
logging {
    channel debug_log {
        file "/var/log/contrail/contrail-named.log" versions 3 size 5m;
        severity debug;
        print-time yes;
        print-severity yes;
        print-category yes;
    };
    category default {
        debug_log;
    };
    category queries {
        debug_log;
    };
};`))

// ControlDNSConfig is the template of the Dns service configuration.
var ControlDNSConfig = template.Must(template.New("").Parse(`[DEFAULT]
collectors={{ .CollectorServerList }}
named_config_file = contrail-named.conf
named_config_directory = /etc/contrail/dns
named_log_file = /var/log/contrail/contrail-named.log
rndc_config_file = contrail-rndc.conf
named_max_cache_size=32M # max-cache-size (bytes) per view, can be in K or M
named_max_retransmissions=12
named_retransmission_interval=1000 # msec
hostname={{ .Hostname }}
hostip={{ .ListenAddress }}
http_server_port=8092
http_server_ip={{ .InstrospectListenAddress }}
dns_server_port=53
log_file=/var/log/contrail/contrail-dns.log
log_level={{ .LogLevel }}
log_local=1
# log_files_count=10
# log_file_size=10485760 # 10MB
# log_category=
# log_disable=0
xmpp_dns_auth_enable=True
xmpp_server_cert=/etc/certificates/server-{{ .PodIP }}.crt
xmpp_server_key=/etc/certificates/server-key-{{ .PodIP }}.pem
xmpp_ca_cert={{ .CAFilePath }}
# Sandesh send rate limit can be used to throttle system logs transmitted per
# second. System logs are dropped if the sending rate is exceeded
# sandesh_send_rate_limit=
[CONFIGDB]
config_db_server_list={{ .CassandraServerList }}
# config_db_username=
# config_db_password=
config_db_use_ssl=True
config_db_ca_certs={{ .CAFilePath }}
rabbitmq_server_list={{ .RabbitmqServerList }}
rabbitmq_vhost={{ .RabbitmqVhost }}
rabbitmq_user={{ .RabbitmqUser }}
rabbitmq_password={{ .RabbitmqPassword }}
rabbitmq_use_ssl=True
rabbitmq_ssl_keyfile=/etc/certificates/client-key-{{ .PodIP }}.pem
rabbitmq_ssl_certfile=/etc/certificates/client-{{ .PodIP }}.crt
rabbitmq_ssl_ca_certs={{ .CAFilePath }}
rabbitmq_ssl_version=tlsv1_2
[SANDESH]
introspect_ssl_enable=True
introspect_ssl_insecure=True
sandesh_ssl_enable=True
sandesh_keyfile=/etc/certificates/client-key-{{ .PodIP }}.pem
sandesh_certfile=/etc/certificates/client-{{ .PodIP }}.crt
sandesh_server_keyfile=/etc/certificates/server-key-{{ .PodIP }}.pem
sandesh_server_certfile=/etc/certificates/server-{{ .PodIP }}.crt
sandesh_ca_cert={{ .CAFilePath }}
`))

// ControlDeProvisionConfig is the template of the Control de-provision script.
// TODO:
//  - support keystone
//  - certs to disable insecure
var ControlDeProvisionConfig = template.Must(template.New("").Parse(`#!/usr/bin/python
from vnc_api import vnc_api
import socket
vncServerList = {{ .APIServerList }}
vnc_client = vnc_api.VncApi(
    api_server_use_ssl=True,
    apiinsecure=True,
    username='{{ .AdminUsername }}',
    password='{{ .AdminPassword }}',
    tenant_name='{{ .AdminTenant }}',
    api_server_host=vncServerList.split(','),
    api_server_port={{ .APIServerPort }})
vnc_client.bgp_router_delete(fq_name=['default-domain','default-project','ip-fabric','__default__', '{{ .Hostname }}' ])
`))

var ControlRNDCConfig = template.Must(template.New("").Parse(`
key "rndc-key" {
    algorithm hmac-md5;
    secret "{{ .RndcKey }}";
};
options {
    default-key "rndc-key";
    default-server 127.0.0.1;
    default-port 8094;
};
`))
