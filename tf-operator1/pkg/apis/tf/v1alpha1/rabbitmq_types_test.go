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

var rabbitmqPodList = []corev1.Pod{
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

var rabbitmqSecret = &corev1.Secret{
	ObjectMeta: metav1.ObjectMeta{
		Name:      "rabbitmq1-secret",
		Namespace: "test-ns",
	},
	Data: map[string][]byte{
		"user":     []byte("test_user"),
		"password": []byte("test_password"),
		"vhost":    []byte("vhost0"),
	},
}

func TestRabbitmqConfigMapsWithDefaultValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, rabbitmqSecret)
	cph := "autoheal"
	rabbitmq := Rabbitmq{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "rabbitmq1",
			Namespace: "test-ns",
		},
		Spec: RabbitmqSpec{
			ServiceConfiguration: RabbitmqConfiguration{
				ClusterPartitionHandling: &cph,
			},
		},
	}

	data, err := rabbitmq.InstanceConfiguration(rabbitmqPodList, cl)
	require.NoError(t, err)

	rabbitmqConfig, err := ini.Load([]byte(data["rabbitmq.conf.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-1.1.1.1.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-1.1.1.1.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "info", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.backlog"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.nodelay"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.on"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.timeout"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.exit_on_close"))
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())

	rabbitmqConfig, err = ini.Load([]byte(data["rabbitmq.conf.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-2.2.2.2.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-2.2.2.2.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "info", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.backlog"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.nodelay"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.on"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.timeout"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.exit_on_close"))
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())
}

func TestRabbitmqConfigMapsWithInetDistListenValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, rabbitmqSecret)
	cph := "autoheal"
	rabbitmq := Rabbitmq{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "rabbitmq1",
			Namespace: "test-ns",
		},
		Spec: RabbitmqSpec{
			ServiceConfiguration: RabbitmqConfiguration{
				ClusterPartitionHandling: &cph,
			},
		},
	}

	data, err := rabbitmq.InstanceConfiguration(rabbitmqPodList, cl)
	require.NoError(t, err)

	rabbitmqConfig, err := ini.Load([]byte(data["rabbitmq.conf.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-1.1.1.1.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-1.1.1.1.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "info", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.backlog"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.nodelay"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.on"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.timeout"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.exit_on_close"))
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())

	rabbitmqConfig, err = ini.Load([]byte(data["rabbitmq.conf.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-2.2.2.2.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-2.2.2.2.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "info", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.backlog"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.nodelay"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.on"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.linger.timeout"))
	assert.Equal(t, false, rabbitmqConfig.Section("").HasKey("tcp_listen_options.exit_on_close"))
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())
}

func TestRabbitmqConfigMapsWithTCPListenOptionsValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, rabbitmqSecret)
	backlog := 600
	timeout := 700
	trueVal := true
	cph := "autoheal"
	rabbitmq := Rabbitmq{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "rabbitmq1",
			Namespace: "test-ns",
		},
		Spec: RabbitmqSpec{
			CommonConfiguration: PodConfiguration{
				LogLevel: "debug",
			},
			ServiceConfiguration: RabbitmqConfiguration{
				ClusterPartitionHandling: &cph,
				TCPListenOptions: &TCPListenOptionsConfig{
					Backlog:       &backlog,
					Nodelay:       &trueVal,
					LingerOn:      &trueVal,
					LingerTimeout: &timeout,
					ExitOnClose:   &trueVal,
				},
			},
		},
	}

	data, err := rabbitmq.InstanceConfiguration(rabbitmqPodList, cl)
	require.NoError(t, err)

	rabbitmqConfig, err := ini.Load([]byte(data["rabbitmq.conf.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-1.1.1.1.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-1.1.1.1.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "debug", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, "600", rabbitmqConfig.Section("").Key("tcp_listen_options.backlog").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.nodelay").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.on").String())
	assert.Equal(t, "700", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.timeout").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.exit_on_close").String())
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())

	rabbitmqConfig, err = ini.Load([]byte(data["rabbitmq.conf.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-2.2.2.2.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-2.2.2.2.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "debug", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, "600", rabbitmqConfig.Section("").Key("tcp_listen_options.backlog").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.nodelay").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.on").String())
	assert.Equal(t, "700", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.timeout").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.exit_on_close").String())
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())
}

func TestRabbitmqConfigMapsWithAllValues(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	cl := fake.NewFakeClientWithScheme(scheme, rabbitmqSecret)
	backlog := 600
	timeout := 700
	trueVal := true
	cph := "autoheal"
	rabbitmq := Rabbitmq{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "rabbitmq1",
			Namespace: "test-ns",
		},
		Spec: RabbitmqSpec{
			CommonConfiguration: PodConfiguration{
				LogLevel: "debug",
			},
			ServiceConfiguration: RabbitmqConfiguration{
				MirroredQueueMode: &cph,
				TCPListenOptions: &TCPListenOptionsConfig{
					Backlog:       &backlog,
					Nodelay:       &trueVal,
					LingerOn:      &trueVal,
					LingerTimeout: &timeout,
					ExitOnClose:   &trueVal,
				},
			},
		},
	}

	data, err := rabbitmq.InstanceConfiguration(rabbitmqPodList, cl)
	require.NoError(t, err)

	rabbitmqConfig, err := ini.Load([]byte(data["rabbitmq.conf.1.1.1.1"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-1.1.1.1.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-1.1.1.1.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "debug", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, "600", rabbitmqConfig.Section("").Key("tcp_listen_options.backlog").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.nodelay").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.on").String())
	assert.Equal(t, "700", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.timeout").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.exit_on_close").String())
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())

	rabbitmqConfig, err = ini.Load([]byte(data["rabbitmq.conf.2.2.2.2"]))
	require.NoError(t, err)

	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("listeners.tcp").String())
	assert.Equal(t, "autoheal", rabbitmqConfig.Section("").Key("cluster_partition_handling").String())
	assert.Equal(t, "5673", rabbitmqConfig.Section("").Key("listeners.ssl.default").String())
	assert.Equal(t, "none", rabbitmqConfig.Section("").Key("loopback_users").String())
	assert.Equal(t, "15673", rabbitmqConfig.Section("").Key("management.tcp.port").String())
	assert.Equal(t, "/etc/ssl/certs/kubernetes/ca-bundle.crt", rabbitmqConfig.Section("").Key("ssl_options.cacertfile").String())
	assert.Equal(t, "/etc/certificates/server-key-2.2.2.2.pem", rabbitmqConfig.Section("").Key("ssl_options.keyfile").String())
	assert.Equal(t, "/etc/certificates/server-2.2.2.2.crt", rabbitmqConfig.Section("").Key("ssl_options.certfile").String())
	assert.Equal(t, "debug", rabbitmqConfig.Section("").Key("log.file.level").String())
	assert.Equal(t, "600", rabbitmqConfig.Section("").Key("tcp_listen_options.backlog").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.nodelay").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.on").String())
	assert.Equal(t, "700", rabbitmqConfig.Section("").Key("tcp_listen_options.linger.timeout").String())
	assert.Equal(t, "true", rabbitmqConfig.Section("").Key("tcp_listen_options.exit_on_close").String())
	assert.Equal(t, "classic_config", rabbitmqConfig.Section("").Key("cluster_formation.peer_discovery_backend").String())
	assert.Equal(t, "rabbit@pod1-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.1").String())
	assert.Equal(t, "rabbit@pod2-host", rabbitmqConfig.Section("").Key("cluster_formation.classic_config.nodes.2").String())
}

func TestRabbitmqUpdateSecret(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err, "Failed to build scheme")
	require.NoError(t, corev1.SchemeBuilder.AddToScheme(scheme), "Failed to add CoreV1 into scheme")

	instance := Rabbitmq{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-rabbitmq",
			Namespace: "test-ns",
		},
		Spec: RabbitmqSpec{
			ServiceConfiguration: RabbitmqConfiguration{
				User:     "test_user",
				Password: "test_password",
				Vhost:    "vhost0",
			},
		},
	}

	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-ns",
		},
		Data: map[string][]byte{
			"user":            []byte("test_user"),
			"password":        []byte("test_password"),
			"vhost":           []byte("vhost0"),
			"salted_password": []byte("1234test_password"),
		},
	}

	cl := fake.NewFakeClientWithScheme(scheme, &instance, &secret)

	updated, err := instance.UpdateSecret(&secret, cl)
	require.NoError(t, err)
	assert.Equal(t, false, updated)
}
