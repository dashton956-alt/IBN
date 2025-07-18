package v1alpha1

import (
	"bytes"
	"context"
	"errors"
	"reflect"
	"strconv"
	"strings"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"

	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	configtemplates "github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1/templates"
	"github.com/tungstenfabric/tf-operator/pkg/randomstring"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Cassandra is the Schema for the cassandras API.
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
type Cassandra struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   CassandraSpec   `json:"spec,omitempty"`
	Status CassandraStatus `json:"status,omitempty"`
}

// CassandraSpec is the Spec for the cassandras API.
// +k8s:openapi-gen=true
type CassandraSpec struct {
	CommonConfiguration  PodConfiguration       `json:"commonConfiguration,omitempty"`
	ServiceConfiguration CassandraConfiguration `json:"serviceConfiguration"`
}

// CassandraConfiguration is the Spec for the cassandras API.
// +k8s:openapi-gen=true
type CassandraConfiguration struct {
	Containers          []*Container              `json:"containers,omitempty"`
	ListenAddress       string                    `json:"listenAddress,omitempty"`
	Port                *int                      `json:"port,omitempty"`
	CqlPort             *int                      `json:"cqlPort,omitempty"`
	SslStoragePort      *int                      `json:"sslStoragePort,omitempty"`
	StoragePort         *int                      `json:"storagePort,omitempty"`
	JmxLocalPort        *int                      `json:"jmxLocalPort,omitempty"`
	MaxHeapSize         string                    `json:"maxHeapSize,omitempty"`
	MinHeapSize         string                    `json:"minHeapSize,omitempty"`
	StartRPC            *bool                     `json:"startRPC,omitempty"`
	MinimumDiskGB       *int                      `json:"minimumDiskGB,omitempty"`
	ReaperEnabled       *bool                     `json:"reaperEnabled,omitempty"`
	ReaperAppPort       *int                      `json:"reaperAppPort,omitempty"`
	ReaperAdmPort       *int                      `json:"reaperAdmPort,omitempty"`
	CassandraParameters CassandraConfigParameters `json:"cassandraParameters,omitempty"`
}

// CassandraStatus defines the status of the cassandra object.
// +k8s:openapi-gen=true
type CassandraStatus struct {
	CommonStatus `json:",inline"`
	Ports        CassandraStatusPorts `json:"ports,omitempty"`
}

// CassandraStatusPorts defines the status of the ports of the cassandra object.
type CassandraStatusPorts struct {
	Port    string `json:"port,omitempty"`
	CqlPort string `json:"cqlPort,omitempty"`
	JmxPort string `json:"jmxPort,omitempty"`
}

// CassandraConfigParameters defines additional parameters for Cassandra confgiuration
// +k8s:openapi-gen=true
type CassandraConfigParameters struct {
	CompactionThroughputMbPerSec int `json:"compactionThroughputMbPerSec,omitempty"`
	ConcurrentReads              int `json:"concurrentReads,omitempty"`
	ConcurrentWrites             int `json:"concurrentWrites,omitempty"`
	// +kubebuilder:validation:Enum=heap_buffers;offheap_buffers;offheap_objects
	MemtableAllocationType           string `json:"memtableAllocationType,omitempty"`
	ConcurrentCompactors             int    `json:"concurrentCompactors,omitempty"`
	MemtableFlushWriters             int    `json:"memtableFlushWriters,omitempty"`
	ConcurrentCounterWrites          int    `json:"concurrentCounterWrites,omitempty"`
	ConcurrentMaterializedViewWrites int    `json:"concurrentMaterializedViewWrites,omitempty"`
}

// CassandraList contains a list of Cassandra.
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type CassandraList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Cassandra `json:"items"`
}

var cassandraLog = logf.Log.WithName("controller_cassandra")

const CassandraInstanceType = "cassandra"

func init() {
	SchemeBuilder.Register(&Cassandra{}, &CassandraList{})
}

// InstanceConfiguration creates the cassandra instance configuration.
func (c *Cassandra) InstanceConfiguration(request reconcile.Request,
	podList []corev1.Pod,
	nodes map[string]NodeInfo,
	seedsIPList []string,
	client client.Client) error {

	instanceConfigMapName := request.Name + "-" + CassandraInstanceType + "-configmap"
	configMapInstanceDynamicConfig := &corev1.ConfigMap{}
	err := client.Get(context.TODO(),
		types.NamespacedName{Name: instanceConfigMapName, Namespace: request.Namespace},
		configMapInstanceDynamicConfig)
	if err != nil {
		return err
	}
	if configMapInstanceDynamicConfig.Data == nil {
		return errors.New("configMap data is nil")
	}

	cassandraConfig := c.ConfigurationParameters()
	cassandraSecret := &corev1.Secret{}
	if err = client.Get(context.TODO(), types.NamespacedName{Name: request.Name + "-secret", Namespace: request.Namespace}, cassandraSecret); err != nil {
		return err
	}

	var cassandraPodIPList []string
	for _, pod := range podList {
		cassandraPodIPList = append(cassandraPodIPList, nodes[pod.Name].Hostname)
	}
	cassandraIPListCommaSeparated := strings.Join(cassandraPodIPList, ",")

	configNodesInformation, err := NewConfigClusterConfiguration(ConfigInstance, request.Namespace, client)
	if err != nil && !k8serrors.IsNotFound(err) {
		return err
	}

	analyticsNodesInformation, err := NewAnalyticsClusterConfiguration(AnalyticsInstance, request.Namespace, client)
	if err != nil && !k8serrors.IsNotFound(err) {
		return err
	}

	databaseNodeType, err := GetDatabaseNodeType(client)
	if err != nil {
		return err
	}
	if strings.HasPrefix(request.Name, "analyticsdb") {
		databaseNodeType = "database"
	}
	collectorEndpointList := configtemplates.EndpointList(analyticsNodesInformation.CollectorServerIPList, analyticsNodesInformation.CollectorPort)
	collectorEndpointListSpaceSeparated := configtemplates.JoinListWithSeparator(collectorEndpointList, " ")
	apiServerIPListCommaSeparated := configtemplates.JoinListWithSeparator(configNodesInformation.APIServerIPList, ",")
	seedsListString := strings.Join(seedsIPList, ",")

	for _, pod := range podList {
		var cassandraConfigBuffer bytes.Buffer
		err = configtemplates.CassandraConfig.Execute(&cassandraConfigBuffer, struct {
			Seeds               string
			StoragePort         string
			SslStoragePort      string
			ListenAddress       string
			BroadcastAddress    string
			CqlPort             string
			StartRPC            string
			RPCPort             string
			JmxLocalPort        string
			RPCAddress          string
			RPCBroadcastAddress string
			KeystorePassword    string
			TruststorePassword  string
			Parameters          CassandraConfigParameters
		}{
			Seeds:               seedsListString,
			StoragePort:         strconv.Itoa(*cassandraConfig.StoragePort),
			SslStoragePort:      strconv.Itoa(*cassandraConfig.SslStoragePort),
			ListenAddress:       pod.Status.PodIP,
			BroadcastAddress:    pod.Status.PodIP,
			CqlPort:             strconv.Itoa(*cassandraConfig.CqlPort),
			StartRPC:            "true",
			RPCPort:             strconv.Itoa(*cassandraConfig.Port),
			JmxLocalPort:        strconv.Itoa(*cassandraConfig.JmxLocalPort),
			RPCAddress:          pod.Status.PodIP,
			RPCBroadcastAddress: pod.Status.PodIP,
			KeystorePassword:    string(cassandraSecret.Data["keystorePassword"]),
			TruststorePassword:  string(cassandraSecret.Data["truststorePassword"]),
			Parameters:          c.Spec.ServiceConfiguration.CassandraParameters,
		})
		if err != nil {
			panic(err)
		}
		cassandraConfigString := cassandraConfigBuffer.String()

		var cassandraCqlShrcBuffer bytes.Buffer
		err = configtemplates.CassandraCqlShrc.Execute(&cassandraCqlShrcBuffer, struct {
			CAFilePath    string
			ListenAddress string
		}{
			CAFilePath:    SignerCAFilepath,
			ListenAddress: pod.Status.PodIP,
		})
		if err != nil {
			panic(err)
		}
		cassandraCqlShrcConfigString := cassandraCqlShrcBuffer.String()

		var cassandraJmxRemotePasswordBuffer bytes.Buffer
		err = configtemplates.CassandraJmxRemotePassword.Execute(&cassandraJmxRemotePasswordBuffer, struct{}{})
		if err != nil {
			panic(err)
		}
		cassandraJmxRemotePasswordString := cassandraJmxRemotePasswordBuffer.String()

		var cassandraJmxRemoteAccessBuffer bytes.Buffer
		err = configtemplates.CassandraJmxRemoteAccess.Execute(&cassandraJmxRemoteAccessBuffer, struct{}{})
		if err != nil {
			panic(err)
		}
		cassandraJmxRemoteAccessString := cassandraJmxRemoteAccessBuffer.String()

		var cassandraNodetoolSslPropertiesBuffer bytes.Buffer
		err = configtemplates.CassandraNodetoolSslProperties.Execute(&cassandraNodetoolSslPropertiesBuffer, struct {
			KeystorePassword   string
			TruststorePassword string
		}{
			KeystorePassword:   string(cassandraSecret.Data["keystorePassword"]),
			TruststorePassword: string(cassandraSecret.Data["truststorePassword"]),
		})
		if err != nil {
			panic(err)
		}
		cassandraNodetoolSslPropertiesString := cassandraNodetoolSslPropertiesBuffer.String()

		var reaperEnvBuffer bytes.Buffer
		err = configtemplates.ReaperEnvTemplate.Execute(&reaperEnvBuffer, struct {
			KeystorePassword    string
			TruststorePassword  string
			JmxLocalPort        string
			CqlPort             string
			ReaperEnabled       bool
			ReaperAppPort       string
			ReaperAdmPort       string
			CassandraServerList string
		}{
			KeystorePassword:    string(cassandraSecret.Data["keystorePassword"]),
			TruststorePassword:  string(cassandraSecret.Data["truststorePassword"]),
			JmxLocalPort:        strconv.Itoa(*cassandraConfig.JmxLocalPort),
			CqlPort:             strconv.Itoa(*cassandraConfig.CqlPort),
			ReaperEnabled:       *cassandraConfig.ReaperEnabled,
			ReaperAppPort:       strconv.Itoa(*cassandraConfig.ReaperAppPort),
			ReaperAdmPort:       strconv.Itoa(*cassandraConfig.ReaperAdmPort),
			CassandraServerList: cassandraIPListCommaSeparated,
		})
		if err != nil {
			panic(err)
		}
		reaperEnvString := reaperEnvBuffer.String()

		logLevels := map[string]string{
			"info":  "INFO",
			"debug": "DEBUG",
			"error": "ERROR",
		}

		logLevel := "INFO"

		if logLevels[c.Spec.CommonConfiguration.LogLevel] != "" {
			logLevel = logLevels[c.Spec.CommonConfiguration.LogLevel]
		}

		var nodeManagerConfigBuffer bytes.Buffer
		err = configtemplates.NodemanagerConfig.Execute(&nodeManagerConfigBuffer, struct {
			Hostname                 string
			PodIP                    string
			ListenAddress            string
			InstrospectListenAddress string
			CollectorServerList      string
			CassandraPort            string
			CassandraJmxPort         string
			CAFilePath               string
			MinimumDiskGB            int
			LogLevel                 string
			LogFile                  string
			LogLocal                 string
		}{
			ListenAddress:            pod.Status.PodIP,
			PodIP:                    pod.Status.PodIP,
			InstrospectListenAddress: c.Spec.CommonConfiguration.IntrospectionListenAddress(nodes[pod.Name].IP),
			Hostname:                 pod.Annotations["hostname"],
			CollectorServerList:      collectorEndpointListSpaceSeparated,
			CassandraPort:            strconv.Itoa(*cassandraConfig.CqlPort),
			CassandraJmxPort:         strconv.Itoa(*cassandraConfig.JmxLocalPort),
			CAFilePath:               SignerCAFilepath,
			MinimumDiskGB:            *cassandraConfig.MinimumDiskGB,
			// TODO: move to params
			LogLevel: logLevel,
		})
		if err != nil {
			panic(err)
		}
		nodemanagerConfigString := nodeManagerConfigBuffer.String()

		var vncAPIConfigBuffer bytes.Buffer
		err = configtemplates.ConfigAPIVNC.Execute(&vncAPIConfigBuffer, struct {
			APIServerList          string
			APIServerPort          string
			CAFilePath             string
			AuthMode               AuthenticationMode
			KeystoneAuthParameters KeystoneAuthParameters
			PodIP                  string
		}{
			APIServerList:          apiServerIPListCommaSeparated,
			APIServerPort:          strconv.Itoa(configNodesInformation.APIServerPort),
			CAFilePath:             SignerCAFilepath,
			AuthMode:               c.Spec.CommonConfiguration.AuthParameters.AuthMode,
			KeystoneAuthParameters: c.Spec.CommonConfiguration.AuthParameters.KeystoneAuthParameters,
			PodIP:                  pod.Status.PodIP,
		})
		if err != nil {
			panic(err)
		}
		vncAPIConfigBufferString := vncAPIConfigBuffer.String()

		var nodemanagerEnvBuffer bytes.Buffer
		err = configtemplates.NodemanagerEnv.Execute(&nodemanagerEnvBuffer, struct {
			ConfigDBNodes    string
			AnalyticsDBNodes string
		}{
			ConfigDBNodes:    cassandraIPListCommaSeparated,
			AnalyticsDBNodes: cassandraIPListCommaSeparated,
		})
		if err != nil {
			panic(err)
		}
		nodemanagerEnvString := nodemanagerEnvBuffer.String()

		configMapInstanceDynamicConfig.Data["cassandra."+pod.Status.PodIP+".yaml"] = cassandraConfigString
		configMapInstanceDynamicConfig.Data["cqlshrc."+pod.Status.PodIP] = cassandraCqlShrcConfigString
		configMapInstanceDynamicConfig.Data["jmxremote.password."+pod.Status.PodIP] = cassandraJmxRemotePasswordString
		configMapInstanceDynamicConfig.Data["jmxremote.access."+pod.Status.PodIP] = cassandraJmxRemoteAccessString
		configMapInstanceDynamicConfig.Data["nodetool-ssl.properties."+pod.Status.PodIP] = cassandraNodetoolSslPropertiesString
		configMapInstanceDynamicConfig.Data["reaper."+pod.Status.PodIP+".env"] = reaperEnvString
		// wait for api, nodemgr container will wait for config files be ready
		if apiServerIPListCommaSeparated != "" {
			configMapInstanceDynamicConfig.Data["vnc_api_lib.ini."+pod.Status.PodIP] = vncAPIConfigBufferString
			configMapInstanceDynamicConfig.Data[databaseNodeType+"-nodemgr.conf."+pod.Status.PodIP] = nodemanagerConfigString
			configMapInstanceDynamicConfig.Data[databaseNodeType+"-nodemgr.env."+pod.Status.PodIP] = nodemanagerEnvString
		}
	}
	configNodes, err := GetConfigNodes(request.Namespace, client)
	if err != nil {
		return err
	}
	clusterNodes := ClusterNodes{ConfigNodes: configNodes, AnalyticsDBNodes: cassandraIPListCommaSeparated}
	configMapInstanceDynamicConfig.Data["cassandra-provisioner.env"] = ProvisionerEnvData(&clusterNodes,
		"", c.Spec.CommonConfiguration.AuthParameters)

	return client.Update(context.TODO(), configMapInstanceDynamicConfig)
}

// CreateConfigMap creates a configmap for cassandra service.
func (c *Cassandra) CreateConfigMap(configMapName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.ConfigMap, error) {

	cassandraSecret, err := c.ensureKeystoreSecret(client, scheme, request)
	if err != nil {
		return nil, err
	}

	cassandraConfig := c.ConfigurationParameters()
	var cassandraCommandBuffer bytes.Buffer
	err = configtemplates.CassandraCommandTemplate.Execute(&cassandraCommandBuffer, struct {
		KeystorePassword   string
		TruststorePassword string
		CAFilePath         string
		JmxLocalPort       string
		CqlPort            string
		ReaperEnabled      bool
	}{
		KeystorePassword:   string(cassandraSecret.Data["keystorePassword"]),
		TruststorePassword: string(cassandraSecret.Data["truststorePassword"]),
		CAFilePath:         SignerCAFilepath,
		JmxLocalPort:       strconv.Itoa(*cassandraConfig.JmxLocalPort),
		CqlPort:            strconv.Itoa(*cassandraConfig.CqlPort),
		ReaperEnabled:      *cassandraConfig.ReaperEnabled,
	})
	if err != nil {
		panic(err)
	}

	data := make(map[string]string)
	data["run-cassandra.sh"] = c.CommonStartupScript(
		cassandraCommandBuffer.String(),
		map[string]string{
			"cqlshrc.${POD_IP}":                 "",
			"cassandra.${POD_IP}.yaml":          "",
			"jmxremote.password.${POD_IP}":      "",
			"jmxremote.access.${POD_IP}":        "",
			"nodetool-ssl.properties.${POD_IP}": "",
		})

	return CreateConfigMap(configMapName,
		client,
		scheme,
		request,
		"cassandra",
		data,
		c)
}

// CreateSecret creates a secret.
func (c *Cassandra) CreateSecret(secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.Secret, error) {

	return CreateSecret(secretName,
		client,
		scheme,
		request,
		"cassandra",
		c)
}

func (c *Cassandra) ensureKeystoreSecret(
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request,
) (*corev1.Secret, error) {

	data := map[string][]byte{
		"keystorePassword":   []byte(randomstring.RandString{Size: 10}.Generate()),
		"truststorePassword": []byte(randomstring.RandString{Size: 10}.Generate()),
	}
	return CreateSecretEx(request.Name+"-secret", client, scheme, request, CassandraInstanceType, data, c)
}

// PrepareSTS prepares the intended deployment for the Cassandra object.
func (c *Cassandra) PrepareSTS(sts *appsv1.StatefulSet, commonConfiguration *PodConfiguration, request reconcile.Request, scheme *runtime.Scheme) error {
	podMgmtPolicyParallel := true
	return PrepareSTS(sts, commonConfiguration, "cassandra", request, scheme, c, podMgmtPolicyParallel)
}

// AddVolumesToIntendedSTS adds volumes to the Cassandra deployment.
func (c *Cassandra) AddVolumesToIntendedSTS(sts *appsv1.StatefulSet, volumeConfigMapMap map[string]string) {
	AddVolumesToIntendedSTS(sts, volumeConfigMapMap)
}

// PodIPListAndIPMapFromInstance gets a list with POD IPs and a map of POD names and IPs.
func (c *Cassandra) PodIPListAndIPMapFromInstance(instanceType string, request reconcile.Request, reconcileClient client.Client) ([]corev1.Pod, map[string]NodeInfo, error) {
	return PodIPListAndIPMapFromInstance(instanceType, request, reconcileClient, "")
}

// QuerySTS queries the Cassandra STS
func (c *Cassandra) QuerySTS(name string, namespace string, reconcileClient client.Client) (*appsv1.StatefulSet, error) {
	return QuerySTS(name, namespace, reconcileClient)
}

// IsActive returns true if instance is active.
func (c *Cassandra) IsActive(name string, namespace string, client client.Client) bool {
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, c)
	if err != nil || c.Status.Active == nil {
		return false
	}
	return *c.Status.Active
}

// IsUpgrading returns true if instance is upgrading.
func (c *Cassandra) IsUpgrading(name string, namespace string, client client.Client) bool {
	instance := &Cassandra{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return false
	}
	sts := &appsv1.StatefulSet{}
	err = client.Get(context.TODO(), types.NamespacedName{Name: name + "-" + "cassandra" + "-statefulset", Namespace: namespace}, sts)
	if err != nil {
		return false
	}
	if sts.Status.CurrentRevision != sts.Status.UpdateRevision {
		return true
	}
	return false
}

// ConfigurationParameters sets the default for the configuration parameters.
func (c *Cassandra) ConfigurationParameters() *CassandraConfiguration {
	cassandraConfiguration := &CassandraConfiguration{}
	var port int
	var cqlPort int
	var jmxPort int
	var storagePort int
	var sslStoragePort int
	var minimumDiskGB int
	var reaperEnabled bool
	var reaperAppPort int
	var reaperAdmPort int

	if c.Spec.ServiceConfiguration.Port != nil {
		port = *c.Spec.ServiceConfiguration.Port
	} else {
		port = CassandraPort
	}
	cassandraConfiguration.Port = &port
	if c.Spec.ServiceConfiguration.CqlPort != nil {
		cqlPort = *c.Spec.ServiceConfiguration.CqlPort
	} else {
		cqlPort = CassandraCqlPort
	}
	cassandraConfiguration.CqlPort = &cqlPort
	if c.Spec.ServiceConfiguration.JmxLocalPort != nil {
		jmxPort = *c.Spec.ServiceConfiguration.JmxLocalPort
	} else {
		jmxPort = CassandraJmxLocalPort
	}
	cassandraConfiguration.JmxLocalPort = &jmxPort
	if c.Spec.ServiceConfiguration.StoragePort != nil {
		storagePort = *c.Spec.ServiceConfiguration.StoragePort
	} else {
		storagePort = CassandraStoragePort
	}
	cassandraConfiguration.StoragePort = &storagePort
	if c.Spec.ServiceConfiguration.SslStoragePort != nil {
		sslStoragePort = *c.Spec.ServiceConfiguration.SslStoragePort
	} else {
		sslStoragePort = CassandraSslStoragePort
	}
	cassandraConfiguration.SslStoragePort = &sslStoragePort
	if cassandraConfiguration.ListenAddress == "" {
		cassandraConfiguration.ListenAddress = "auto"
	}
	if c.Spec.ServiceConfiguration.MinimumDiskGB != nil {
		minimumDiskGB = *c.Spec.ServiceConfiguration.MinimumDiskGB
	} else {
		minimumDiskGB = CassandraMinimumDiskGB
	}
	cassandraConfiguration.MinimumDiskGB = &minimumDiskGB
	if c.Spec.ServiceConfiguration.ReaperEnabled != nil {
		reaperEnabled = *c.Spec.ServiceConfiguration.ReaperEnabled
	} else {
		reaperEnabled = CassandraReaperEnabled
	}
	cassandraConfiguration.ReaperEnabled = &reaperEnabled
	if c.Spec.ServiceConfiguration.ReaperAppPort != nil {
		reaperAppPort = *c.Spec.ServiceConfiguration.ReaperAppPort
	} else {
		reaperAppPort = CassandraReaperAppPort
	}
	cassandraConfiguration.ReaperAppPort = &reaperAppPort
	if c.Spec.ServiceConfiguration.ReaperAdmPort != nil {
		reaperAdmPort = *c.Spec.ServiceConfiguration.ReaperAdmPort
	} else {
		reaperAdmPort = CassandraReaperAdmPort
	}
	cassandraConfiguration.ReaperAdmPort = &reaperAdmPort

	return cassandraConfiguration
}

// UpdateStatus manages the status of the Cassandra nodes.
func (c *Cassandra) UpdateStatus(cassandraConfig *CassandraConfiguration, nodes map[string]NodeInfo, sts *appsv1.StatefulSet) bool {
	log := cassandraLog.WithName("UpdateStatus")
	changed := false

	if !reflect.DeepEqual(c.Status.Nodes, nodes) {
		log.Info("Nodes", "new", nodes, "old", c.Status.Nodes)
		c.Status.Nodes = nodes
		changed = true
	}

	p := strconv.Itoa(*cassandraConfig.Port)
	if c.Status.Ports.Port != p {
		log.Info("Port", "new", p, "old", c.Status.Ports.Port)
		c.Status.Ports.Port = p
		changed = true
	}
	p = strconv.Itoa(*cassandraConfig.CqlPort)
	if c.Status.Ports.CqlPort != p {
		log.Info("CqlPort", "new", p, "old", c.Status.Ports.CqlPort)
		c.Status.Ports.CqlPort = p
		changed = true
	}
	p = strconv.Itoa(*cassandraConfig.JmxLocalPort)
	if c.Status.Ports.JmxPort != p {
		log.Info("JmxPort", "new", p, "old", c.Status.Ports.JmxPort)
		c.Status.Ports.JmxPort = p
		changed = true
	}

	// TODO: uncleat why sts.Spec.Replicas might be nul:
	// butsomtimes appear error:
	// "Observed a panic: "invalid memory address or nil pointer dereference"
	a := sts != nil && sts.Spec.Replicas != nil && sts.Status.ReadyReplicas >= *sts.Spec.Replicas/2+1
	d := sts == nil || sts.Spec.Replicas == nil || sts.Status.ReadyReplicas < *sts.Spec.Replicas
	if c.Status.Active == nil {
		log.Info("Active", "new", a, "old", c.Status.Active)
		c.Status.Active = new(bool)
		*c.Status.Active = a
		changed = true
	}
	if *c.Status.Active != a {
		log.Info("Active", "new", a, "old", *c.Status.Active)
		*c.Status.Active = a
		changed = true
	}
	if c.Status.Degraded == nil {
		log.Info("Degraded", "new", d, "old", c.Status.Degraded)
		c.Status.Degraded = new(bool)
		*c.Status.Degraded = d
		changed = true
	}
	if *c.Status.Degraded != d {
		log.Info("Degraded", "new", d, "old", *c.Status.Degraded)
		*c.Status.Degraded = d
		changed = true
	}

	return changed || (c.Status.ConfigChanged != nil && *c.Status.ConfigChanged)
}

// CommonStartupScript prepare common run service script
//  command - is a final command to run
//  configs - config files to be waited for and to be linked from configmap mount
//   to a destination config folder (if destination is empty no link be done, only wait), e.g.
//   { "api.${POD_IP}": "", "vnc_api.ini.${POD_IP}": "vnc_api.ini"}
func (c *Cassandra) CommonStartupScript(command string, configs map[string]string) string {
	return CommonStartupScript(command, configs)
}
