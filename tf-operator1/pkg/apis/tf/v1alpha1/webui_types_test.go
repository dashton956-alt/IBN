package v1alpha1

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"gopkg.in/ini.v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

var webuiPodList = []corev1.Pod{
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

var webuiSecret = &corev1.Secret{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "webui1-secret",
		Namespace: "test-ns",
	},
	Data: map[string][]byte{
		"user":     []byte("test_user"),
		"password": []byte("test_password"),
		"vhost":    []byte("vhost0"),
	},
}

var webuiControl = &Control{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "control1",
		Namespace: "test-ns",
	},
	Status: ControlStatus{
		CommonStatus: CommonStatus{
			Nodes: map[string]NodeInfo{
				"pod1": {IP: "1.1.1.1", Hostname: "node1"},
				"pod2": {IP: "2.2.2.2", Hostname: "node2"},
			},
		},
	},
}

var webuiCassandra = &Cassandra{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "configdb1",
		Namespace: "test-ns",
	},
	Status: CassandraStatus{
		CommonStatus: CommonStatus{
			Nodes: map[string]NodeInfo{
				"pod1": {IP: "1.1.1.1", Hostname: "node1"},
				"pod2": {IP: "2.2.2.2", Hostname: "node2"},
			},
		},
	},
}

var webuiConfig = &Config{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "config1",
		Namespace: "test-ns",
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

var webuiAnalytics = &Analytics{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "analytics1",
		Namespace: "test-ns",
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

var webuiRedis = &Redis{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "redis1",
		Namespace: "test-ns",
	},
}

var authTestPort = 9999
var authTestPassword = "test-pass"

func TestWebuiConfigMapWithDefaultValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, webuiSecret, webuiAnalytics, webuiCassandra, webuiConfig, webuiControl, webuiRedis)
	webui := Webui{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "webui1",
			Namespace: "test-ns",
		},
		Spec: WebuiSpec{
			CommonConfiguration: PodConfiguration{
				AuthParameters: AuthParameters{
					AuthMode: "keystone",
					KeystoneAuthParameters: KeystoneAuthParameters{
						AuthProtocol:      "https",
						Address:           "7.7.7.7",
						Port:              &authTestPort,
						AdminPassword:     &authTestPassword,
						AdminTenant:       "tenant",
						AdminUsername:     "user",
						UserDomainName:    "test-user-domain.org",
						ProjectDomainName: "test-project-domain.org",
					},
				},
			},
			ServiceConfiguration: WebuiConfiguration{
				ControlInstance: "control1",
			},
		},
	}

	data, err := webui.InstanceConfiguration(webuiPodList, cl)
	require.NoError(t, err)

	webuiConfig, err := ini.Load([]byte(data["config.global.js.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "info", webuiConfig.Section("").Key("config.logs.level").String())

	webuiConfig, err = ini.Load([]byte(data["config.global.js.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "info", webuiConfig.Section("").Key("config.logs.level").String())
}

func TestWebuiConfigMapWithCustomValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, webuiSecret, webuiAnalytics, webuiCassandra, webuiConfig, webuiControl, webuiRedis)
	webui := Webui{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "webui1",
			Namespace: "test-ns",
		},
		Spec: WebuiSpec{
			CommonConfiguration: PodConfiguration{
				LogLevel: "debug",
				AuthParameters: AuthParameters{
					AuthMode: "keystone",
					KeystoneAuthParameters: KeystoneAuthParameters{
						AuthProtocol:      "https",
						Address:           "7.7.7.7",
						Port:              &authTestPort,
						AdminPassword:     &authTestPassword,
						AdminUsername:     "user",
						AdminTenant:       "tenant",
						UserDomainName:    "test-user-domain.org",
						ProjectDomainName: "test-project-domain.org",
					},
				},
			},
			ServiceConfiguration: WebuiConfiguration{
				ControlInstance: "control1",
			},
		},
	}
	data, err := webui.InstanceConfiguration(webuiPodList, cl)
	require.NoError(t, err)

	webuiConfig, err := ini.Load([]byte(data["config.global.js.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "debug", webuiConfig.Section("").Key("config.logs.level").String())

	webuiConfig, err = ini.Load([]byte(data["config.global.js.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "debug", webuiConfig.Section("").Key("config.logs.level").String())
}
