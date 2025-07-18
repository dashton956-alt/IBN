package v1alpha1

import (
	"bytes"
	"context"
	"reflect"
	"sort"
	"strconv"
	"strings"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	configtemplates "github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1/templates"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Analytics is the Schema for the analytics API.
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:path=analytics,scope=Namespaced
// +kubebuilder:printcolumn:name="Endpoint",type=string,JSONPath=`.status.endpoint`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
// +kubebuilder:printcolumn:name="Active",type=boolean,JSONPath=`.status.active`
type Analytics struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AnalyticsSpec   `json:"spec,omitempty"`
	Status AnalyticsStatus `json:"status,omitempty"`
}

// AnalyticsSpec is the Spec for the Analytics API.
// +k8s:openapi-gen=true
type AnalyticsSpec struct {
	CommonConfiguration  PodConfiguration       `json:"commonConfiguration,omitempty"`
	ServiceConfiguration AnalyticsConfiguration `json:"serviceConfiguration"`
}

// AnalyticsConfiguration is the Spec for the Analytics API.
// +k8s:openapi-gen=true
type AnalyticsConfiguration struct {
	Containers                 []*Container `json:"containers,omitempty"`
	AnalyticsPort              *int         `json:"analyticsPort,omitempty"`
	CollectorPort              *int         `json:"collectorPort,omitempty"`
	AnalyticsApiIntrospectPort *int         `json:"analyticsIntrospectPort,omitempty"`
	CollectorIntrospectPort    *int         `json:"collectorIntrospectPort,omitempty"`
	AAAMode                    AAAMode      `json:"aaaMode,omitempty"`
	// Time (in hours) that the analytics object and log data stays in the Cassandra database. Defaults to 48 hours.
	AnalyticsDataTTL *int `json:"analyticsDataTTL,omitempty"`
	// Time (in hours) the analytics config data entering the collector stays in the Cassandra database. Defaults to 2160 hours.
	AnalyticsConfigAuditTTL *int `json:"analyticsConfigAuditTTL,omitempty"`
	// Time to live (TTL) for statistics data in hours. Defaults to 4 hours.
	AnalyticsStatisticsTTL *int `json:"analyticsStatisticsTTL,omitempty"`
	// Time to live (TTL) for flow data in hours. Defaults to 2 hours.
	AnalyticsFlowTTL *int `json:"analyticsFlowTTL,omitempty"`
}

// AnalyticsStatus status of Analytics
// +k8s:openapi-gen=true
type AnalyticsStatus struct {
	CommonStatus `json:",inline"`
	Endpoint     string `json:"endpoint,omitempty"`
}

// AnalyticsList contains a list of Analytics.
// +k8s:openapi-gen=true
type AnalyticsList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Analytics `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Analytics{}, &AnalyticsList{})
}

// InstanceConfiguration configures and updates configmaps
func (c *Analytics) InstanceConfiguration(podList []corev1.Pod, client client.Client,
) (data map[string]string, err error) {
	data, err = make(map[string]string), nil

	analyticsCassandraInstance, err := GetAnalyticsCassandraInstance(client)
	if analyticsCassandraInstance == "" {
		return
	}

	analyticsdbCassandraNodesInformation, err := NewCassandraClusterConfiguration(
		analyticsCassandraInstance, c.Namespace, client)
	if err != nil {
		return
	}

	cassandraNodesInformation, err := NewCassandraClusterConfiguration(
		CassandraInstance, c.Namespace, client)
	if err != nil {
		return
	}

	zookeeperNodesInformation, err := NewZookeeperClusterConfiguration(
		ZookeeperInstance, c.Namespace, client)
	if err != nil {
		return
	}

	redisNodesInformation, err := NewRedisClusterConfiguration(
		RedisInstance, c.Namespace, client)
	if err != nil {
		return
	}

	rabbitmqNodesInformation, err := NewRabbitmqClusterConfiguration(
		RabbitmqInstance, c.Namespace, client)
	if err != nil {
		return
	}

	configNodesInformation, err := NewConfigClusterConfiguration(
		ConfigInstance, c.Namespace, client)
	if err != nil {
		return
	}

	analyticsAuth := c.Spec.CommonConfiguration.AuthParameters.KeystoneAuthParameters

	var rabbitmqSecretUser string
	var rabbitmqSecretPassword string
	var rabbitmqSecretVhost string
	if rabbitmqNodesInformation.Secret != "" {
		rabbitmqSecret := &corev1.Secret{}
		err = client.Get(context.TODO(), types.NamespacedName{Name: rabbitmqNodesInformation.Secret, Namespace: c.Namespace}, rabbitmqSecret)
		if err != nil {
			return
		}
		rabbitmqSecretUser = string(rabbitmqSecret.Data["user"])
		rabbitmqSecretPassword = string(rabbitmqSecret.Data["password"])
		rabbitmqSecretVhost = string(rabbitmqSecret.Data["vhost"])
	}

	analyticsConfig := c.ConfigurationParameters()
	if rabbitmqSecretUser == "" {
		rabbitmqSecretUser = RabbitmqUser
	}
	if rabbitmqSecretPassword == "" {
		rabbitmqSecretPassword = RabbitmqPassword
	}
	if rabbitmqSecretVhost == "" {
		rabbitmqSecretVhost = RabbitmqVhost
	}
	nodes := pods2nodes(podList)
	sort.SliceStable(podList, func(i, j int) bool { return podList[i].Status.PodIP < podList[j].Status.PodIP })

	configApiIPListCommaSeparated := configtemplates.JoinListWithSeparator(configNodesInformation.APIServerIPList, ",")
	analyticsNodes := strings.Join(nodes, ",")

	var collectorServerList, analyticsServerSpaceSeparatedList string
	collectorServerList = strings.Join(nodes, ":"+strconv.Itoa(*analyticsConfig.CollectorPort)+" ")
	collectorServerList = collectorServerList + ":" + strconv.Itoa(*analyticsConfig.CollectorPort)
	analyticsServerSpaceSeparatedList = strings.Join(nodes, ":"+strconv.Itoa(*analyticsConfig.AnalyticsPort)+" ")
	analyticsServerSpaceSeparatedList = analyticsServerSpaceSeparatedList + ":" + strconv.Itoa(*analyticsConfig.AnalyticsPort)
	apiServerEndpointList := configtemplates.EndpointList(configNodesInformation.APIServerIPList, configNodesInformation.APIServerPort)
	apiServerEndpointListSpaceSeparated := configtemplates.JoinListWithSeparator(apiServerEndpointList, " ")
	apiServerIPListCommaSeparated := configtemplates.JoinListWithSeparator(configNodesInformation.APIServerIPList, ",")
	cassandraEndpointList := configtemplates.EndpointList(cassandraNodesInformation.ServerIPList, cassandraNodesInformation.Port)
	cassandraEndpointListSpaceSeparated := configtemplates.JoinListWithSeparator(cassandraEndpointList, " ")
	analyticsdbCassandraCQLEndpointList := configtemplates.EndpointList(analyticsdbCassandraNodesInformation.ServerIPList, analyticsdbCassandraNodesInformation.CQLPort)
	analyticsdbCassandraCQLEndpointListSpaceSeparated := configtemplates.JoinListWithSeparator(analyticsdbCassandraCQLEndpointList, " ")
	cassandraCQLEndpointList := configtemplates.EndpointList(cassandraNodesInformation.ServerIPList, cassandraNodesInformation.CQLPort)
	cassandraCQLEndpointListSpaceSeparated := configtemplates.JoinListWithSeparator(cassandraCQLEndpointList, " ")
	rabbitMqSSLEndpointList := configtemplates.EndpointList(rabbitmqNodesInformation.ServerIPList, rabbitmqNodesInformation.Port)
	rabbitmqSSLEndpointListSpaceSeparated := configtemplates.JoinListWithSeparator(rabbitMqSSLEndpointList, " ")
	rabbitmqSSLEndpointListCommaSeparated := configtemplates.JoinListWithSeparator(rabbitMqSSLEndpointList, ",")
	zookeeperEndpointList := configtemplates.EndpointList(zookeeperNodesInformation.ServerIPList, zookeeperNodesInformation.ClientPort)
	zookeeperEndpointListCommaSeparated := configtemplates.JoinListWithSeparator(zookeeperEndpointList, ",")
	zookeeperEndpointListSpaceSpearated := configtemplates.JoinListWithSeparator(zookeeperEndpointList, " ")

	redisEndpointList := configtemplates.EndpointList(redisNodesInformation.ServerIPList, redisNodesInformation.ServerPort)
	redisEndpointListSpaceSpearated := configtemplates.JoinListWithSeparator(redisEndpointList, " ")

	kafkaServerList, err := GetAnalyticsAlarmNodes(c.Namespace, client)
	if err != nil {
		return
	}
	kafkaServerSpaceSeparatedList := ""
	if len(kafkaServerList) > 0 {
		kafkaPortSuffix := ":" + strconv.Itoa(KafkaPort)
		kafkaServerSpaceSeparatedList = strings.Join(kafkaServerList, kafkaPortSuffix+" ") + kafkaPortSuffix
	}

	logLevel := ConvertLogLevel(c.Spec.CommonConfiguration.LogLevel)

	queryengineEnabled, err := GetQueryEngineEnabled(client)
	if err != nil {
		return
	}

	for _, pod := range podList {
		hostname := pod.Annotations["hostname"]
		podIP := pod.Status.PodIP
		instrospectListenAddress := c.Spec.CommonConfiguration.IntrospectionListenAddress(podIP)

		var analyticsapiBuffer bytes.Buffer
		err = configtemplates.AnalyticsapiConfig.Execute(&analyticsapiBuffer, struct {
			PodIP                      string
			ListenAddress              string
			InstrospectListenAddress   string
			AnalyticsApiIntrospectPort string
			ApiServerList              string
			AnalyticsServerList        string
			CassandraServerList        string
			ZookeeperServerList        string
			RabbitmqServerList         string
			CollectorServerList        string
			RedisServerList            string
			RedisPort                  int
			RabbitmqUser               string
			RabbitmqPassword           string
			RabbitmqVhost              string
			AuthMode                   string
			AAAMode                    AAAMode
			CAFilePath                 string
			LogLevel                   string
			QueryEngineEnabled         bool
		}{
			PodIP:                      podIP,
			ListenAddress:              podIP,
			InstrospectListenAddress:   instrospectListenAddress,
			AnalyticsApiIntrospectPort: strconv.Itoa(*analyticsConfig.AnalyticsApiIntrospectPort),
			ApiServerList:              apiServerEndpointListSpaceSeparated,
			AnalyticsServerList:        analyticsServerSpaceSeparatedList,
			CassandraServerList:        cassandraEndpointListSpaceSeparated,
			ZookeeperServerList:        zookeeperEndpointListSpaceSpearated,
			RabbitmqServerList:         rabbitmqSSLEndpointListCommaSeparated,
			CollectorServerList:        collectorServerList,
			RedisServerList:            redisEndpointListSpaceSpearated,
			RedisPort:                  redisNodesInformation.ServerPort,
			RabbitmqUser:               rabbitmqSecretUser,
			RabbitmqPassword:           rabbitmqSecretPassword,
			RabbitmqVhost:              rabbitmqSecretVhost,
			AAAMode:                    analyticsConfig.AAAMode,
			CAFilePath:                 SignerCAFilepath,
			LogLevel:                   logLevel,
			QueryEngineEnabled:         queryengineEnabled,
		})
		if err != nil {
			panic(err)
		}
		data["analyticsapi."+podIP] = analyticsapiBuffer.String()

		var collectorBuffer bytes.Buffer
		err = configtemplates.CollectorConfig.Execute(&collectorBuffer, struct {
			Hostname                       string
			PodIP                          string
			ListenAddress                  string
			InstrospectListenAddress       string
			CollectorIntrospectPort        string
			ApiServerList                  string
			CassandraServerList            string
			AnalyticsdbCassandraServerList string
			KafkaServerList                string
			ZookeeperServerList            string
			RabbitmqServerList             string
			RabbitmqUser                   string
			RabbitmqPassword               string
			RabbitmqVhost                  string
			LogLevel                       string
			CAFilePath                     string
			AnalyticsDataTTL               string
			AnalyticsConfigAuditTTL        string
			AnalyticsStatisticsTTL         string
			AnalyticsFlowTTL               string
			RedisPort                      int
			QueryEngineEnabled             bool
		}{
			Hostname:                       hostname,
			PodIP:                          podIP,
			ListenAddress:                  podIP,
			InstrospectListenAddress:       instrospectListenAddress,
			CollectorIntrospectPort:        strconv.Itoa(*analyticsConfig.CollectorIntrospectPort),
			ApiServerList:                  apiServerEndpointListSpaceSeparated,
			CassandraServerList:            cassandraCQLEndpointListSpaceSeparated,
			AnalyticsdbCassandraServerList: analyticsdbCassandraCQLEndpointListSpaceSeparated,
			KafkaServerList:                kafkaServerSpaceSeparatedList,
			ZookeeperServerList:            zookeeperEndpointListCommaSeparated,
			RabbitmqServerList:             rabbitmqSSLEndpointListSpaceSeparated,
			RabbitmqUser:                   rabbitmqSecretUser,
			RabbitmqPassword:               rabbitmqSecretPassword,
			RabbitmqVhost:                  rabbitmqSecretVhost,
			LogLevel:                       logLevel,
			CAFilePath:                     SignerCAFilepath,
			AnalyticsDataTTL:               strconv.Itoa(*analyticsConfig.AnalyticsDataTTL),
			AnalyticsConfigAuditTTL:        strconv.Itoa(*analyticsConfig.AnalyticsConfigAuditTTL),
			AnalyticsStatisticsTTL:         strconv.Itoa(*analyticsConfig.AnalyticsStatisticsTTL),
			AnalyticsFlowTTL:               strconv.Itoa(*analyticsConfig.AnalyticsFlowTTL),
			RedisPort:                      redisNodesInformation.ServerPort,
			QueryEngineEnabled:             queryengineEnabled,
		})
		if err != nil {
			panic(err)
		}
		data["collector."+podIP] = collectorBuffer.String()

		var nodemanagerBuffer bytes.Buffer
		err = configtemplates.NodemanagerConfig.Execute(&nodemanagerBuffer, struct {
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
			Hostname:                 hostname,
			PodIP:                    podIP,
			ListenAddress:            podIP,
			InstrospectListenAddress: instrospectListenAddress,
			CollectorServerList:      collectorServerList,
			CassandraPort:            strconv.Itoa(cassandraNodesInformation.CQLPort),
			CassandraJmxPort:         strconv.Itoa(cassandraNodesInformation.JMXPort),
			CAFilePath:               SignerCAFilepath,
			LogLevel:                 logLevel,
		})
		if err != nil {
			panic(err)
		}
		data["analytics-nodemgr.conf."+podIP] = nodemanagerBuffer.String()
		// empty env as no db tracking
		data["analytics-nodemgr.env."+podIP] = ""

		var analyticsKeystoneAuthConfBuffer bytes.Buffer
		err = configtemplates.ConfigKeystoneAuthConf.Execute(&analyticsKeystoneAuthConfBuffer, struct {
			KeystoneAuthParameters KeystoneAuthParameters
			CAFilePath             string
			PodIP                  string
			AuthMode               AuthenticationMode
		}{
			KeystoneAuthParameters: analyticsAuth,
			CAFilePath:             SignerCAFilepath,
			PodIP:                  podIP,
			AuthMode:               c.Spec.CommonConfiguration.AuthParameters.AuthMode,
		})
		if err != nil {
			panic(err)
		}
		data["contrail-keystone-auth.conf."+podIP] = analyticsKeystoneAuthConfBuffer.String()

		// TODO: commonize for all services
		var vncApiBuffer bytes.Buffer
		err = configtemplates.ConfigAPIVNC.Execute(&vncApiBuffer, struct {
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
			PodIP:                  podIP,
		})
		if err != nil {
			panic(err)
		}
		data["vnc_api_lib.ini."+podIP] = vncApiBuffer.String()
	}
	clusterNodes := ClusterNodes{ConfigNodes: configApiIPListCommaSeparated,
		AnalyticsNodes: analyticsNodes}
	data["analytics-provisioner.env"] = ProvisionerEnvData(&clusterNodes, "",
		c.Spec.CommonConfiguration.AuthParameters)
	return
}

// CreateConfigMap makes default empty ConfigMap
func (c *Analytics) CreateConfigMap(configMapName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.ConfigMap, error) {
	data := make(map[string]string)
	data["run-collector.sh"] = c.CommonStartupScript(
		"exec /usr/bin/contrail-collector --conf_file /etc/contrailconfigmaps/collector.${POD_IP}",
		map[string]string{
			"collector.${POD_IP}":       "",
			"vnc_api_lib.ini.${POD_IP}": "vnc_api_lib.ini",
		})
	data["run-analyticsapi.sh"] = c.CommonStartupScript(
		"exec /usr/bin/contrail-analytics-api -c /etc/contrailconfigmaps/analyticsapi.${POD_IP} -c /etc/contrailconfigmaps/contrail-keystone-auth.conf.${POD_IP}",
		map[string]string{
			"analyticsapi.${POD_IP}":                "",
			"contrail-keystone-auth.conf.${POD_IP}": "",
			"vnc_api_lib.ini.${POD_IP}":             "vnc_api_lib.ini",
		})
	return CreateConfigMap(configMapName,
		client,
		scheme,
		request,
		"analytics",
		data,
		c)
}

// CreateSecret creates a secret.
func (c *Analytics) CreateSecret(secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.Secret, error) {
	return CreateSecret(secretName,
		client,
		scheme,
		request,
		"analytics",
		c)
}

// PrepareSTS prepares the intented statefulset for the analytics object
func (c *Analytics) PrepareSTS(sts *appsv1.StatefulSet, commonConfiguration *PodConfiguration, request reconcile.Request, scheme *runtime.Scheme) error {
	return PrepareSTS(sts, commonConfiguration, "analytics", request, scheme, c, true)
}

// AddVolumesToIntendedSTS adds volumes to the analytics statefulset
func (c *Analytics) AddVolumesToIntendedSTS(sts *appsv1.StatefulSet, volumeConfigMapMap map[string]string) {
	AddVolumesToIntendedSTS(sts, volumeConfigMapMap)
}

// SetInstanceActive sets the Analytics instance to active
func (c *Analytics) SetInstanceActive(client client.Client, activeStatus *bool, degradedStatus *bool, sts *appsv1.StatefulSet, request reconcile.Request) error {
	if err := client.Get(context.TODO(), types.NamespacedName{Name: sts.Name, Namespace: request.Namespace}, sts); err != nil {
		return err
	}
	*activeStatus = sts.Status.ReadyReplicas >= *sts.Spec.Replicas/2+1
	*degradedStatus = sts.Status.ReadyReplicas < *sts.Spec.Replicas

	if err := client.Status().Update(context.TODO(), c); err != nil {
		return err
	}
	return nil
}

// PodIPListAndIPMapFromInstance gets a list with POD IPs and a map of POD names and IPs.
func (c *Analytics) PodIPListAndIPMapFromInstance(request reconcile.Request, reconcileClient client.Client) ([]corev1.Pod, map[string]NodeInfo, error) {
	return PodIPListAndIPMapFromInstance("analytics", request, reconcileClient, "")
}

// ManageNodeStatus updates nodes in status
func (c *Analytics) ManageNodeStatus(podNameIPMap map[string]NodeInfo,
	client client.Client) (updated bool, err error) {
	updated = false
	err = nil

	if reflect.DeepEqual(c.Status.Nodes, podNameIPMap) {
		return
	}

	c.Status.Nodes = podNameIPMap
	if err = client.Status().Update(context.TODO(), c); err != nil {
		return
	}

	updated = true
	return
}

// IsActive returns true if instance is active
func (c *Analytics) IsActive(name string, namespace string, client client.Client) bool {
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, c)
	if err != nil || c.Status.Active == nil {
		return false
	}
	return *c.Status.Active
}

// ConfigurationParameters create analytics struct
func (c *Analytics) ConfigurationParameters() AnalyticsConfiguration {
	analyticsConfiguration := AnalyticsConfiguration{}
	var analyticsPort int
	var collectorPort int

	if c.Spec.ServiceConfiguration.AnalyticsPort != nil {
		analyticsPort = *c.Spec.ServiceConfiguration.AnalyticsPort
	} else {
		analyticsPort = AnalyticsApiPort
	}
	analyticsConfiguration.AnalyticsPort = &analyticsPort

	if c.Spec.ServiceConfiguration.CollectorPort != nil {
		collectorPort = *c.Spec.ServiceConfiguration.CollectorPort
	} else {
		collectorPort = CollectorPort
	}
	analyticsConfiguration.CollectorPort = &collectorPort

	var analyticsApiIntrospectPort int
	if c.Spec.ServiceConfiguration.AnalyticsApiIntrospectPort != nil {
		analyticsApiIntrospectPort = *c.Spec.ServiceConfiguration.AnalyticsApiIntrospectPort
	} else {
		analyticsApiIntrospectPort = AnalyticsApiIntrospectPort
	}
	analyticsConfiguration.AnalyticsApiIntrospectPort = &analyticsApiIntrospectPort

	var collectorIntrospectPort int
	if c.Spec.ServiceConfiguration.CollectorIntrospectPort != nil {
		collectorIntrospectPort = *c.Spec.ServiceConfiguration.CollectorIntrospectPort
	} else {
		collectorIntrospectPort = CollectorIntrospectPort
	}
	analyticsConfiguration.CollectorIntrospectPort = &collectorIntrospectPort

	analyticsConfiguration.AAAMode = c.Spec.ServiceConfiguration.AAAMode
	if analyticsConfiguration.AAAMode == "" {
		analyticsConfiguration.AAAMode = AAAModeNoAuth
		ap := c.Spec.CommonConfiguration.AuthParameters
		if ap.AuthMode == AuthenticationModeKeystone {
			analyticsConfiguration.AAAMode = AAAModeRBAC
		}
	}

	var analyticsDataTTL int
	if c.Spec.ServiceConfiguration.AnalyticsDataTTL != nil {
		analyticsDataTTL = *c.Spec.ServiceConfiguration.AnalyticsDataTTL
	} else {
		analyticsDataTTL = AnalyticsDataTTL
	}
	analyticsConfiguration.AnalyticsDataTTL = &analyticsDataTTL

	var analyticsConfigAuditTTL int
	if c.Spec.ServiceConfiguration.AnalyticsConfigAuditTTL != nil {
		analyticsConfigAuditTTL = *c.Spec.ServiceConfiguration.AnalyticsConfigAuditTTL
	} else {
		analyticsConfigAuditTTL = AnalyticsConfigAuditTTL
	}
	analyticsConfiguration.AnalyticsConfigAuditTTL = &analyticsConfigAuditTTL

	var analyticsStatisticsTTL int
	if c.Spec.ServiceConfiguration.AnalyticsStatisticsTTL != nil {
		analyticsStatisticsTTL = *c.Spec.ServiceConfiguration.AnalyticsStatisticsTTL
	} else {
		analyticsStatisticsTTL = AnalyticsStatisticsTTL
	}
	analyticsConfiguration.AnalyticsStatisticsTTL = &analyticsStatisticsTTL

	var analyticsFlowTTL int
	if c.Spec.ServiceConfiguration.AnalyticsFlowTTL != nil {
		analyticsFlowTTL = *c.Spec.ServiceConfiguration.AnalyticsFlowTTL
	} else {
		analyticsFlowTTL = AnalyticsFlowTTL
	}
	analyticsConfiguration.AnalyticsFlowTTL = &analyticsFlowTTL

	return analyticsConfiguration

}

func (c *Analytics) SetEndpointInStatus(client client.Client, clusterIP string) error {
	c.Status.Endpoint = clusterIP
	err := client.Status().Update(context.TODO(), c)
	return err
}

// CommonStartupScript prepare common run service script
//  command - is a final command to run
//  configs - config files to be waited for and to be linked from configmap mount
//   to a destination config folder (if destination is empty no link be done, only wait), e.g.
//   { "api.${POD_IP}": "", "vnc_api.ini.${POD_IP}": "vnc_api.ini"}
func (c *Analytics) CommonStartupScript(command string, configs map[string]string) string {
	return CommonStartupScript(command, configs)
}
