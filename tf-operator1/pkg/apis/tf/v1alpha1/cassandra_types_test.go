package v1alpha1

import (
	"context"
	"os"
	"testing"

	"github.com/operator-framework/operator-sdk/pkg/k8sutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tungstenfabric/tf-operator/pkg/certificates"

	"gopkg.in/ini.v1"
	"gopkg.in/yaml.v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

var cassandraNodeInfo = map[string]NodeInfo{
	"pod1": NodeInfo{Hostname: "pod1-host", IP: "1.1.1.1"},
	"pod2": NodeInfo{Hostname: "pod2-host", IP: "2.2.2.2"},
}

var cassandraPodList = []corev1.Pod{
	{
		Status: corev1.PodStatus{PodIP: "1.1.1.1"},
		ObjectMeta: metav1.ObjectMeta{
			Name: "pod1",
			Annotations: map[string]string{
				"hostname": "pod1-host",
			},
		},
	},
	{
		Status: corev1.PodStatus{PodIP: "2.2.2.2"},
		ObjectMeta: metav1.ObjectMeta{
			Name: "pod2",
			Annotations: map[string]string{
				"hostname": "pod2-host",
			},
		},
	},
}

var cassandraSeedList = []string{"1.1.1.1", "2.2.2.2"}

var cassandraRequest = reconcile.Request{
	NamespacedName: types.NamespacedName{
		Name:      "configdb1",
		Namespace: "test-ns",
	},
}

var caSecretCassandra = &corev1.Secret{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "contrail-ca-certificate",
		Namespace: "test-ns",
	},
	Data: map[string][]byte{"ca-bundle.crt": {}},
}

var cassandraCM = &corev1.ConfigMap{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "configdb1-cassandra-configmap",
		Namespace: "test-ns",
	},
	Data: map[string]string{"": ""},
}

var cassandraSecret = &corev1.Secret{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "configdb1-secret",
		Namespace: "test-ns",
	},
	Data: map[string][]byte{
		"keystorePassword":   []byte("test_keystore_pass"),
		"truststorePassword": []byte("test_truestore_pass"),
	},
}

var config = &Config{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "config1",
		Namespace: "test-ns",
	},
	Spec: ConfigSpec{
		ServiceConfiguration: ConfigConfiguration{},
	},
	Status: ConfigStatus{
		CommonStatus: CommonStatus{
			Nodes: map[string]NodeInfo{
				"pod1": {IP: "1.1.1.1", Hostname: "node1"},
				"pod2": {IP: "2.2.2.2", Hostname: "node2"},
			},
		},
	},
}

var analyticsPort = 8086

var cassandraAnalytics = &Analytics{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "analytics1",
		Namespace: "test-ns",
	},
	Spec: AnalyticsSpec{
		ServiceConfiguration: AnalyticsConfiguration{
			AnalyticsPort: &analyticsPort,
		},
	},
	Status: AnalyticsStatus{
		CommonStatus: CommonStatus{
			Nodes: map[string]NodeInfo{
				"pod1": {IP: "1.1.1.1", Hostname: "node1"},
				"pod2": {IP: "2.2.2.2", Hostname: "node2"},
			},
		},
	},
}

var cassandraTypesTestManager = Manager{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "cluster1",
		Namespace: "tf",
	},
	Spec: ManagerSpec{
		Services: Services{
			Cassandras: getCassandras([]string{"configdb1"}),
		},
	},
}

type CassandraParamsStruct struct {
	ConcurrentReads                  int    `yaml:"concurrent_reads"`
	ConcurrentWrites                 int    `yaml:"concurrent_writes"`
	ConcurrentCounterWrites          int    `yaml:"concurrent_counter_writes"`
	ConcurrentMaterializedViewWrites int    `yaml:"concurrent_materialized_view_writes"`
	ConcurrentCompactors             int    `yaml:"concurrent_compactors"`
	MemtableFlushWriters             int    `yaml:"memtable_flush_writers"`
	MemtableAllocationType           string `yaml:"memtable_allocation_type"`
	CompactionThroughputMbPerSec     int    `yaml:"compaction_throughput_mb_per_sec"`
}

func init() {
	os.Setenv(k8sutil.WatchNamespaceEnvVar, "tf")
	certificates.ClientSignerName = certificates.SelfSigner
	certificates.ServerSignerName = certificates.SelfSigner
}

func TestCassandraConfigMapsWithDefaultValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, &cassandraTypesTestManager, caSecretCassandra, cassandraCM, cassandraSecret, config, cassandraAnalytics)
	cassandra := Cassandra{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "configdb1",
			Namespace: "test-ns",
		},
		Spec: CassandraSpec{
			CommonConfiguration: PodConfiguration{
				AuthParameters: AuthParameters{
					AuthMode: AuthenticationModeNoAuth,
				},
			},
		},
	}

	require.NoError(t, InitCA(cl, scheme, &cassandra, "cassandra"))

	require.NoError(t, cassandra.InstanceConfiguration(cassandraRequest, cassandraPodList, cassandraNodeInfo, cassandraSeedList, cl))

	var cassandraConfigMap = &corev1.ConfigMap{}
	require.NoError(t, cl.Get(context.Background(), types.NamespacedName{Name: "configdb1-cassandra-configmap", Namespace: "test-ns"}, cassandraConfigMap), "Error while gathering cassandra config map")

	var cassandraConfig CassandraParamsStruct
	err = yaml.Unmarshal([]byte(cassandraConfigMap.Data["cassandra.1.1.1.1.yaml"]), &cassandraConfig)
	require.NoError(t, err)

	assert.Equal(t, 16, cassandraConfig.CompactionThroughputMbPerSec)
	assert.Equal(t, 32, cassandraConfig.ConcurrentReads)
	assert.Equal(t, 32, cassandraConfig.ConcurrentWrites)
	assert.Equal(t, "heap_buffers", cassandraConfig.MemtableAllocationType)
	assert.Equal(t, 1, cassandraConfig.ConcurrentCompactors)
	assert.Equal(t, 2, cassandraConfig.MemtableFlushWriters)
	assert.Equal(t, 32, cassandraConfig.ConcurrentCounterWrites)
	assert.Equal(t, 32, cassandraConfig.ConcurrentMaterializedViewWrites)

	err = yaml.Unmarshal([]byte(cassandraConfigMap.Data["cassandra.2.2.2.2.yaml"]), &cassandraConfig)
	require.NoError(t, err)

	assert.Equal(t, 16, cassandraConfig.CompactionThroughputMbPerSec)
	assert.Equal(t, 32, cassandraConfig.ConcurrentReads)
	assert.Equal(t, 32, cassandraConfig.ConcurrentWrites)
	assert.Equal(t, "heap_buffers", cassandraConfig.MemtableAllocationType)
	assert.Equal(t, 1, cassandraConfig.ConcurrentCompactors)
	assert.Equal(t, 2, cassandraConfig.MemtableFlushWriters)
	assert.Equal(t, 32, cassandraConfig.ConcurrentCounterWrites)
	assert.Equal(t, 32, cassandraConfig.ConcurrentMaterializedViewWrites)

	cassandraEnvConfig, err := ini.Load([]byte(cassandraConfigMap.Data["vnc_api_lib.ini.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "noauth", cassandraEnvConfig.Section("auth").Key("AUTHN_TYPE").String())
	assert.Equal(t, "node1,node2", cassandraEnvConfig.Section("global").Key("WEB_SERVER").String())
	assert.Equal(t, "8082", cassandraEnvConfig.Section("global").Key("WEB_PORT").String())

	cassandraEnvConfig, err = ini.Load([]byte(cassandraConfigMap.Data["vnc_api_lib.ini.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "noauth", cassandraEnvConfig.Section("auth").Key("AUTHN_TYPE").String())
	assert.Equal(t, "node1,node2", cassandraEnvConfig.Section("global").Key("WEB_SERVER").String())
	assert.Equal(t, "8082", cassandraEnvConfig.Section("global").Key("WEB_PORT").String())

	cassandraNodemanagerConfig, err := ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.conf.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "pod1-host", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostname").String())
	assert.Equal(t, "1.1.1.1", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostip").String())
	assert.Equal(t, "9041", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_port").String())
	assert.Equal(t, "7201", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_jmx_port").String())
	assert.Equal(t, "4", cassandraNodemanagerConfig.Section("DEFAULTS").Key("minimum_diskGB").String())
	assert.Equal(t, "node1:8086 node2:8086", cassandraNodemanagerConfig.Section("COLLECTOR").Key("server_list").String())
	assert.Equal(t, "/etc/certificates/client-key-1.1.1.1.pem", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_keyfile").String())
	assert.Equal(t, "/etc/certificates/client-1.1.1.1.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_certfile").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_ca_cert").String())

	cassandraNodemanagerConfig, err = ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.conf.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "pod2-host", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostname").String())
	assert.Equal(t, "2.2.2.2", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostip").String())
	assert.Equal(t, "9041", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_port").String())
	assert.Equal(t, "7201", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_jmx_port").String())
	assert.Equal(t, "4", cassandraNodemanagerConfig.Section("DEFAULTS").Key("minimum_diskGB").String())
	assert.Equal(t, "node1:8086 node2:8086", cassandraNodemanagerConfig.Section("COLLECTOR").Key("server_list").String())
	assert.Equal(t, "/etc/certificates/client-key-2.2.2.2.pem", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_keyfile").String())
	assert.Equal(t, "/etc/certificates/client-2.2.2.2.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_certfile").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_ca_cert").String())

	cassandraNodemanagerEnvConfig, err := ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.env.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export ANALYTICSDB_NODES").String())
	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export CONFIGDB_NODES").String())

	cassandraNodemanagerEnvConfig, err = ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.env.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export ANALYTICSDB_NODES").String())
	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export CONFIGDB_NODES").String())
}

func TestCassandraConfigMapsWithCustomValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	var keystoneTestPort = 7777
	cl := fake.NewFakeClientWithScheme(scheme, &cassandraTypesTestManager, caSecretCassandra, cassandraCM, cassandraSecret, config, cassandraAnalytics)
	cassandra := Cassandra{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "configdb1",
			Namespace: "test-ns",
		},
		Spec: CassandraSpec{
			CommonConfiguration: PodConfiguration{
				AuthParameters: AuthParameters{
					AuthMode: AuthenticationModeKeystone,
					KeystoneAuthParameters: KeystoneAuthParameters{
						AuthProtocol:      "https",
						Address:           "9.9.9.9",
						AdminPort:         &keystoneTestPort,
						ProjectDomainName: "test.net",
					},
				},
			},
			ServiceConfiguration: CassandraConfiguration{
				CassandraParameters: CassandraConfigParameters{
					CompactionThroughputMbPerSec:     22,
					ConcurrentReads:                  33,
					ConcurrentWrites:                 44,
					MemtableAllocationType:           "offheap_buffers",
					ConcurrentCompactors:             55,
					MemtableFlushWriters:             66,
					ConcurrentCounterWrites:          77,
					ConcurrentMaterializedViewWrites: 88,
				},
			},
		},
	}

	require.NoError(t, InitCA(cl, scheme, &cassandra, "cassandra"))

	require.NoError(t, cassandra.InstanceConfiguration(cassandraRequest, cassandraPodList, cassandraNodeInfo, cassandraSeedList, cl))

	var cassandraConfigMap = &corev1.ConfigMap{}
	require.NoError(t, cl.Get(context.Background(), types.NamespacedName{Name: "configdb1-cassandra-configmap", Namespace: "test-ns"}, cassandraConfigMap), "Error while gathering cassandra config map")

	var cassandraConfig CassandraParamsStruct
	err = yaml.Unmarshal([]byte(cassandraConfigMap.Data["cassandra.1.1.1.1.yaml"]), &cassandraConfig)
	require.NoError(t, err)

	assert.Equal(t, 22, cassandraConfig.CompactionThroughputMbPerSec)
	assert.Equal(t, 33, cassandraConfig.ConcurrentReads)
	assert.Equal(t, 44, cassandraConfig.ConcurrentWrites)
	assert.Equal(t, "offheap_buffers", cassandraConfig.MemtableAllocationType)
	assert.Equal(t, 55, cassandraConfig.ConcurrentCompactors)
	assert.Equal(t, 66, cassandraConfig.MemtableFlushWriters)
	assert.Equal(t, 77, cassandraConfig.ConcurrentCounterWrites)
	assert.Equal(t, 88, cassandraConfig.ConcurrentMaterializedViewWrites)

	err = yaml.Unmarshal([]byte(cassandraConfigMap.Data["cassandra.2.2.2.2.yaml"]), &cassandraConfig)
	require.NoError(t, err)

	assert.Equal(t, 22, cassandraConfig.CompactionThroughputMbPerSec)
	assert.Equal(t, 33, cassandraConfig.ConcurrentReads)
	assert.Equal(t, 44, cassandraConfig.ConcurrentWrites)
	assert.Equal(t, "offheap_buffers", cassandraConfig.MemtableAllocationType)
	assert.Equal(t, 55, cassandraConfig.ConcurrentCompactors)
	assert.Equal(t, 66, cassandraConfig.MemtableFlushWriters)
	assert.Equal(t, 77, cassandraConfig.ConcurrentCounterWrites)
	assert.Equal(t, 88, cassandraConfig.ConcurrentMaterializedViewWrites)

	cassandraEnvConfig, err := ini.Load([]byte(cassandraConfigMap.Data["vnc_api_lib.ini.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "keystone", cassandraEnvConfig.Section("auth").Key("AUTHN_TYPE").String())
	assert.Equal(t, "https", cassandraEnvConfig.Section("auth").Key("AUTHN_PROTOCOL").String())
	assert.Equal(t, "9.9.9.9", cassandraEnvConfig.Section("auth").Key("AUTHN_SERVER").String())
	assert.Equal(t, "7777", cassandraEnvConfig.Section("auth").Key("AUTHN_PORT").String())
	assert.Equal(t, "test.net", cassandraEnvConfig.Section("auth").Key("AUTHN_DOMAIN").String())
	assert.Equal(t, "node1,node2", cassandraEnvConfig.Section("global").Key("WEB_SERVER").String())
	assert.Equal(t, "8082", cassandraEnvConfig.Section("global").Key("WEB_PORT").String())

	cassandraEnvConfig, err = ini.Load([]byte(cassandraConfigMap.Data["vnc_api_lib.ini.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "keystone", cassandraEnvConfig.Section("auth").Key("AUTHN_TYPE").String())
	assert.Equal(t, "https", cassandraEnvConfig.Section("auth").Key("AUTHN_PROTOCOL").String())
	assert.Equal(t, "9.9.9.9", cassandraEnvConfig.Section("auth").Key("AUTHN_SERVER").String())
	assert.Equal(t, "7777", cassandraEnvConfig.Section("auth").Key("AUTHN_PORT").String())
	assert.Equal(t, "test.net", cassandraEnvConfig.Section("auth").Key("AUTHN_DOMAIN").String())
	assert.Equal(t, "node1,node2", cassandraEnvConfig.Section("global").Key("WEB_SERVER").String())
	assert.Equal(t, "8082", cassandraEnvConfig.Section("global").Key("WEB_PORT").String())
	assert.Equal(t, "node1,node2", cassandraEnvConfig.Section("global").Key("WEB_SERVER").String())
	assert.Equal(t, "8082", cassandraEnvConfig.Section("global").Key("WEB_PORT").String())

	cassandraNodemanagerConfig, err := ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.conf.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "pod1-host", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostname").String())
	assert.Equal(t, "1.1.1.1", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostip").String())
	assert.Equal(t, "9041", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_port").String())
	assert.Equal(t, "7201", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_jmx_port").String())
	assert.Equal(t, "4", cassandraNodemanagerConfig.Section("DEFAULTS").Key("minimum_diskGB").String())
	assert.Equal(t, "node1:8086 node2:8086", cassandraNodemanagerConfig.Section("COLLECTOR").Key("server_list").String())
	assert.Equal(t, "/etc/certificates/client-key-1.1.1.1.pem", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_keyfile").String())
	assert.Equal(t, "/etc/certificates/client-1.1.1.1.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_certfile").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_ca_cert").String())

	cassandraNodemanagerConfig, err = ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.conf.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "pod2-host", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostname").String())
	assert.Equal(t, "2.2.2.2", cassandraNodemanagerConfig.Section("DEFAULTS").Key("hostip").String())
	assert.Equal(t, "9041", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_port").String())
	assert.Equal(t, "7201", cassandraNodemanagerConfig.Section("DEFAULTS").Key("db_jmx_port").String())
	assert.Equal(t, "4", cassandraNodemanagerConfig.Section("DEFAULTS").Key("minimum_diskGB").String())
	assert.Equal(t, "node1:8086 node2:8086", cassandraNodemanagerConfig.Section("COLLECTOR").Key("server_list").String())
	assert.Equal(t, "/etc/certificates/client-key-2.2.2.2.pem", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_keyfile").String())
	assert.Equal(t, "/etc/certificates/client-2.2.2.2.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_certfile").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", cassandraNodemanagerConfig.Section("SANDESH").Key("sandesh_ca_cert").String())

	cassandraNodemanagerEnvConfig, err := ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.env.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export ANALYTICSDB_NODES").String())
	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export CONFIGDB_NODES").String())

	cassandraNodemanagerEnvConfig, err = ini.Load([]byte(cassandraConfigMap.Data["database-nodemgr.env.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export ANALYTICSDB_NODES").String())
	assert.Equal(t, "pod1-host,pod2-host", cassandraNodemanagerEnvConfig.Section("").Key("export CONFIGDB_NODES").String())
}
