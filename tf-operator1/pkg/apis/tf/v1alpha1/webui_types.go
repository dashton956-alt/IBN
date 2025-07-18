package v1alpha1

import (
	"bytes"
	"context"
	"reflect"
	"sort"
	"strconv"

	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	configtemplates "github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1/templates"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Webui is the Schema for the webuis API.
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Endpoint",type=string,JSONPath=`.status.endpoint`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
// +kubebuilder:printcolumn:name="Active",type=boolean,JSONPath=`.status.active`
type Webui struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   WebuiSpec   `json:"spec,omitempty"`
	Status WebuiStatus `json:"status,omitempty"`
}

// WebuiSpec is the Spec for the cassandras API.
// +k8s:openapi-gen=true
type WebuiSpec struct {
	CommonConfiguration  PodConfiguration   `json:"commonConfiguration,omitempty"`
	ServiceConfiguration WebuiConfiguration `json:"serviceConfiguration"`
}

// WebuiConfiguration is the Spec for the cassandras API.
// +k8s:openapi-gen=true
type WebuiConfiguration struct {
	ControlInstance string       `json:"controlInstance,omitempty"`
	Containers      []*Container `json:"containers,omitempty"`
}

// +k8s:openapi-gen=true
type WebUIStatusPorts struct {
	WebUIHttpPort  int `json:"webUIHttpPort,omitempty"`
	WebUIHttpsPort int `json:"webUIHttpsPort,omitempty"`
}

// +k8s:openapi-gen=true
type WebUIServiceStatus struct {
	ModuleName  string `json:"moduleName,omitempty"`
	ModuleState string `json:"state"`
}

// +k8s:openapi-gen=true
type WebuiStatus struct {
	CommonStatus  `json:",inline"`
	Ports         WebUIStatusPorts                 `json:"ports,omitempty"`
	ServiceStatus map[string]WebUIServiceStatusMap `json:"serviceStatus,omitempty"`
	Endpoint      string                           `json:"endpoint,omitempty"`
}

// +k8s:openapi-gen=true
type WebUIServiceStatusMap map[string]WebUIServiceStatus

// WebuiList contains a list of Webui.
// +k8s:openapi-gen=true
type WebuiList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Webui `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Webui{}, &WebuiList{})
}

// InstanceConfiguration updates configmaps
func (c *Webui) InstanceConfiguration(podList []corev1.Pod, client client.Client,
) (data map[string]string, err error) {
	data, err = make(map[string]string), nil

	controlNodesInformation, err := NewControlClusterConfiguration(c.Spec.ServiceConfiguration.ControlInstance, c.Namespace, client)
	if err != nil {
		return
	}

	cassandraNodesInformation, err := NewCassandraClusterConfiguration(CassandraInstance, c.Namespace, client)
	if err != nil {
		return
	}

	configNodesInformation, err := NewConfigClusterConfiguration(ConfigInstance, c.Namespace, client)
	if err != nil {
		return
	}

	analyticsNodesInformation, err := NewAnalyticsClusterConfiguration(AnalyticsInstance, c.Namespace, client)
	if err != nil {
		return
	}

	redisNodesInformation, err := NewRedisClusterConfiguration(RedisInstance, c.Namespace, client)
	if err != nil {
		return
	}

	authConfig := c.Spec.CommonConfiguration.AuthParameters.KeystoneAuthParameters

	configApiIPListCommaSeparatedQuoted := configtemplates.JoinListWithSeparatorAndSingleQuotes(configNodesInformation.APIServerIPList, ",")
	analyticsIPListCommaSeparatedQuoted := configtemplates.JoinListWithSeparatorAndSingleQuotes(analyticsNodesInformation.AnalyticsServerIPList, ",")
	controlXMPPIPListCommaSeparatedQuoted := configtemplates.JoinListWithSeparatorAndSingleQuotes(controlNodesInformation.ControlServerIPList, ",")
	cassandraIPListCommaSeparatedQuoted := configtemplates.JoinListWithSeparatorAndSingleQuotes(cassandraNodesInformation.ServerIPList, ",")
	sort.SliceStable(podList, func(i, j int) bool { return podList[i].Status.PodIP < podList[j].Status.PodIP })

	for _, pod := range podList {
		hostname := pod.Annotations["hostname"]
		var webuiWebConfigBuffer bytes.Buffer
		err := configtemplates.WebuiWebConfig.Execute(&webuiWebConfigBuffer, struct {
			PodIP                  string
			Hostname               string
			APIServerList          string
			APIServerPort          string
			AnalyticsServerList    string
			AnalyticsServerPort    string
			ControlNodeList        string
			DnsNodePort            string
			CassandraServerList    string
			CassandraPort          string
			RedisPort              int
			CAFilePath             string
			LogLevel               string
			AuthMode               AuthenticationMode
			KeystoneAuthParameters KeystoneAuthParameters
		}{
			PodIP:                  pod.Status.PodIP,
			Hostname:               hostname,
			APIServerList:          configApiIPListCommaSeparatedQuoted,
			APIServerPort:          strconv.Itoa(configNodesInformation.APIServerPort),
			AnalyticsServerList:    analyticsIPListCommaSeparatedQuoted,
			AnalyticsServerPort:    strconv.Itoa(analyticsNodesInformation.AnalyticsServerPort),
			ControlNodeList:        controlXMPPIPListCommaSeparatedQuoted,
			DnsNodePort:            strconv.Itoa(controlNodesInformation.DNSIntrospectPort),
			CassandraServerList:    cassandraIPListCommaSeparatedQuoted,
			CassandraPort:          strconv.Itoa(cassandraNodesInformation.CQLPort),
			RedisPort:              redisNodesInformation.ServerPort,
			AuthMode:               c.Spec.CommonConfiguration.AuthParameters.AuthMode,
			KeystoneAuthParameters: authConfig,
			CAFilePath:             SignerCAFilepath,
			LogLevel:               c.Spec.CommonConfiguration.LogLevel,
		})
		if err != nil {
			panic(err)
		}
		data["config.global.js."+pod.Status.PodIP] = webuiWebConfigBuffer.String()
		//fmt.Println("DATA ", data)
		var webuiAuthConfigBuffer bytes.Buffer
		err = configtemplates.WebuiAuthConfig.Execute(&webuiAuthConfigBuffer, struct {
			AuthMode               AuthenticationMode
			KeystoneAuthParameters KeystoneAuthParameters
		}{
			AuthMode:               c.Spec.CommonConfiguration.AuthParameters.AuthMode,
			KeystoneAuthParameters: authConfig,
		})
		if err != nil {
			panic(err)
		}
		data["contrail-webui-userauth.js."+pod.Status.PodIP] = webuiAuthConfigBuffer.String()
	}
	clusterNodes := ClusterNodes{ConfigNodes: configApiIPListCommaSeparatedQuoted}
	data["webui-provisioner.env"] = ProvisionerEnvData(&clusterNodes,
		"", c.Spec.CommonConfiguration.AuthParameters)

	return
}

// CreateSecret creates a secret.
func (c *Webui) CreateSecret(secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.Secret, error) {
	return CreateSecret(secretName,
		client,
		scheme,
		request,
		"webui",
		c)
}

// CreateConfigMap create webui configmap
func (c *Webui) CreateConfigMap(configMapName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.ConfigMap, error) {

	data := make(map[string]string)
	data["run-webuiweb.sh"] = c.CommonStartupScript(
		// use copy as webui resolves symlinks just to "..data/config.global.js.10.0.0.206"
		// instead of resolve like
		//    readlink -e /etc/contrailconfigmaps/config.global.js.10.0.0.206
		//    /etc/contrailconfigmaps/..2021_02_28_17_21_52.558864405/config.global.js.10.0.0.206
		"rm -rf /etc/contrail; mkdir -p /etc/contrail; "+
			"cp /etc/contrailconfigmaps/config.global.js.${POD_IP} /etc/contrail/config.global.js; "+
			"cp /etc/contrailconfigmaps/contrail-webui-userauth.js.${POD_IP} /etc/contrail/contrail-webui-userauth.js; "+
			"exec /usr/bin/node /usr/src/contrail/contrail-web-core/webServerStart.js",
		map[string]string{
			"config.global.js.${POD_IP}":           "",
			"contrail-webui-userauth.js.${POD_IP}": "",
		})
	data["run-webuijob.sh"] = c.CommonStartupScript(
		// use copy as webui resolves symlinks just to "..data/config.global.js.10.0.0.206"
		// instead of resolve like
		//    readlink -e /etc/contrailconfigmaps/config.global.js.10.0.0.206
		//    /etc/contrailconfigmaps/..2021_02_28_17_21_52.558864405/config.global.js.10.0.0.206
		"rm -rf /etc/contrail; mkdir -p /etc/contrail; "+
			"cp /etc/contrailconfigmaps/config.global.js.${POD_IP} /etc/contrail/config.global.js; "+
			"cp /etc/contrailconfigmaps/contrail-webui-userauth.js.${POD_IP} /etc/contrail/contrail-webui-userauth.js; "+
			"exec /usr/bin/node /usr/src/contrail/contrail-web-core/jobServerStart.js",
		map[string]string{
			"config.global.js.${POD_IP}":           "",
			"contrail-webui-userauth.js.${POD_IP}": "",
		})

	return CreateConfigMap(configMapName,
		client,
		scheme,
		request,
		"webui",
		data,
		c)
}

// PrepareSTS prepares the intended deployment for the Webui object.
func (c *Webui) PrepareSTS(sts *appsv1.StatefulSet, commonConfiguration *PodConfiguration, request reconcile.Request, scheme *runtime.Scheme) error {
	return PrepareSTS(sts, commonConfiguration, "webui", request, scheme, c, true)
}

// AddVolumesToIntendedSTS adds volumes to the Webui deployment.
func (c *Webui) AddVolumesToIntendedSTS(sts *appsv1.StatefulSet, volumeConfigMapMap map[string]string) {
	AddVolumesToIntendedSTS(sts, volumeConfigMapMap)
}

// PodIPListAndIPMapFromInstance gets a list with POD IPs and a map of POD names and IPs.
func (c *Webui) PodIPListAndIPMapFromInstance(instanceType string, request reconcile.Request, reconcileClient client.Client) ([]corev1.Pod, map[string]NodeInfo, error) {
	return PodIPListAndIPMapFromInstance(instanceType, request, reconcileClient, "")
}

// SetInstanceActive sets the Webui instance to active.
func (c *Webui) SetInstanceActive(client client.Client, activeStatus *bool, degradedStatus *bool, sts *appsv1.StatefulSet, request reconcile.Request) error {
	return SetInstanceActive(client, activeStatus, degradedStatus, sts, request, c)
}

// ManageNodeStatus updates nodes map
func (c *Webui) ManageNodeStatus(nodes map[string]NodeInfo,
	client client.Client) (updated bool, err error) {
	updated = false
	err = nil

	if reflect.DeepEqual(c.Status.Nodes, nodes) {
		return
	}
	c.Status.Nodes = nodes
	if err = client.Status().Update(context.TODO(), c); err != nil {
		return
	}

	updated = true
	return
}

// CommonStartupScript prepare common run service script
//  command - is a final command to run
//  configs - config files to be waited for and to be linked from configmap mount
//   to a destination config folder (if destination is empty no link be done, only wait), e.g.
//   { "api.${POD_IP}": "", "vnc_api.ini.${POD_IP}": "vnc_api.ini"}
func (c *Webui) CommonStartupScript(command string, configs map[string]string) string {
	return CommonStartupScript(command, configs)
}
