package v1alpha1

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"net"
	"reflect"
	"strconv"
	"strings"

	configtemplates "github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1/templates"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"

	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Vrouter is the Schema for the vrouters API.
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
type Vrouter struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   VrouterSpec   `json:"spec,omitempty"`
	Status VrouterStatus `json:"status,omitempty"`
}

// VrouterStatus is the Status for vrouter API.
// +k8s:openapi-gen=true
// TODO: after update to controllter-tool v0.4 rework AgentStatus
// to make it map instead of [] for performance
// (https://github.com/operator-framework/operator-sdk/issues/2485
// https://github.com/kubernetes-sigs/controller-tools/pull/317)
type VrouterStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book.kubebuilder.io/beyond_basics/generating_crd.html
	Nodes               map[string]NodeInfo `json:"nodes,omitempty"`
	Active              *bool               `json:"active,omitempty"`
	ActiveOnControllers *bool               `json:"activeOnControllers,omitempty"`
	Agents              []*AgentStatus      `json:"agents,omitempty"`
}

// AgentStatus is the Status of the agent.
// +k8s:openapi-gen=true
type AgentStatus struct {
	Name            string             `json:"name,omitempty"`
	Status          AgentServiceStatus `json:"status,omitempty"`
	ControlNodes    string             `json:"controlNodes,omitempty"`
	ConfigNodes     string             `json:"configNodes,omitempty"`
	AnalyticsNodes  string             `json:"analyticsNodes,omitempty"`
	EncryptedParams string             `json:"encryptedParams,omitempty"`
}

// AgentServiceStatus is the status value: Starting, Ready, Updating
// +k8s:openapi-gen=true
type AgentServiceStatus string

// VrouterSpec is the Spec for the vrouter API.
// +k8s:openapi-gen=true
type VrouterSpec struct {
	CommonConfiguration  PodConfiguration     `json:"commonConfiguration,omitempty"`
	ServiceConfiguration VrouterConfiguration `json:"serviceConfiguration"`
}

// VrouterConfiguration is the Spec for the vrouter API.
// +k8s:openapi-gen=true
type VrouterConfiguration struct {
	Containers        []*Container `json:"containers,omitempty"`
	PhysicalInterface string       `json:"physicalInterface,omitempty"`
	// What is it doing?
	// VrouterEncryption   bool              `json:"vrouterEncryption,omitempty"`
	// What is it doing?
	// What is it doing?
	EnvVariablesConfig map[string]string `json:"envVariablesConfig,omitempty"`
	ControlInstance    string            `json:"controlInstance,omitempty"`

	// New params for vrouter configuration
	CloudOrchestrator string `json:"cloudOrchestrator,omitempty"`
	HypervisorType    string `json:"hypervisorType,omitempty"`

	// Collector
	StatsCollectorDestinationPath string `json:"statsCollectorDestinationPath,omitempty"`
	CollectorPort                 string `json:"collectorPort,omitempty"`

	// Config
	ConfigApiPort             string `json:"configApiPort,omitempty"`
	ConfigApiServerCaCertfile string `json:"configApiServerCaCertfile,omitempty"`
	ConfigApiSslEnable        *bool  `json:"configApiSslEnable,omitempty"`

	// DNS
	DnsServerPort string `json:"dnsServerPort,omitempty"`

	// Host
	DpdkUioDriver          string `json:"dpdkUioDriver,omitempty"`
	SriovPhysicalInterface string `json:"sriovPhysicalInterface,omitempty"`
	SriovPhysicalNetwork   string `json:"sriovPhysicalNetwork,omitempty"`
	SriovVf                string `json:"sriovVf,omitempty"`

	// Introspect
	IntrospectSslEnable *bool `json:"introspectSslEnable,omitempty"`

	// Keystone authentication
	KeystoneAuthAdminPort         string `json:"keystoneAuthAdminPort,omitempty"`
	KeystoneAuthCaCertfile        string `json:"keystoneAuthCaCertfile,omitempty"`
	KeystoneAuthCertfile          string `json:"keystoneAuthCertfile,omitempty"`
	KeystoneAuthHost              string `json:"keystoneAuthHost,omitempty"`
	KeystoneAuthInsecure          *bool  `json:"keystoneAuthInsecure,omitempty"`
	KeystoneAuthKeyfile           string `json:"keystoneAuthKeyfile,omitempty"`
	KeystoneAuthProjectDomainName string `json:"keystoneAuthProjectDomainName,omitempty"`
	KeystoneAuthProto             string `json:"keystoneAuthProto,omitempty"`
	KeystoneAuthRegionName        string `json:"keystoneAuthRegionName,omitempty"`
	KeystoneAuthUrlTokens         string `json:"keystoneAuthUrlTokens,omitempty"`
	KeystoneAuthUrlVersion        string `json:"keystoneAuthUrlVersion,omitempty"`
	KeystoneAuthUserDomainName    string `json:"keystoneAuthUserDomainName,omitempty"`
	KeystoneAuthAdminPassword     string `json:"keystoneAuthAdminPassword,omitempty"`

	// Kubernetes
	K8sToken                string `json:"k8sToken,omitempty"`
	K8sTokenFile            string `json:"k8sTokenFile,omitempty"`
	KubernetesApiPort       string `json:"kubernetesApiPort,omitempty"`
	KubernetesApiSecurePort string `json:"kubernetesApiSecurePort,omitempty"`
	KubernetesPodSubnet     string `json:"kubernetesPodSubnet,omitempty"`

	// Logging
	LogDir   string `json:"logDir,omitempty"`
	LogLocal *int   `json:"logLocal,omitempty"`

	// Metadata
	MetadataProxySecret   string `json:"metadataProxySecret,omitempty"`
	MetadataSslCaCertfile string `json:"metadataSslCaCertfile,omitempty"`
	MetadataSslCertfile   string `json:"metadataSslCertfile,omitempty"`
	MetadataSslCertType   string `json:"metadataSslCertType,omitempty"`
	MetadataSslEnable     string `json:"metadataSslEnable,omitempty"`
	MetadataSslKeyfile    string `json:"metadataSslKeyfile,omitempty"`

	// Openstack
	BarbicanTenantName string `json:"barbicanTenantName,omitempty"`
	BarbicanPassword   string `json:"barbicanPassword,omitempty"`
	BarbicanUser       string `json:"barbicanUser,omitempty"`

	// Sandesh
	SandeshCaCertfile     string `json:"sandeshCaCertfile,omitempty"`
	SandeshCertfile       string `json:"sandeshCertfile,omitempty"`
	SandeshKeyfile        string `json:"sandeshKeyfile,omitempty"`
	SandeshServerCertfile string `json:"sandeshServerCertfile,omitempty"`
	SandeshServerKeyfile  string `json:"sandeshServerKeyfile,omitempty"`
	SandeshSslEnable      *bool  `json:"sandeshSslEnable,omitempty"`

	// Server SSL
	ServerCaCertfile string `json:"serverCaCertfile,omitempty"`
	ServerCertfile   string `json:"serverCertfile,omitempty"`
	ServerKeyfile    string `json:"serverKeyfile,omitempty"`
	SslEnable        *bool  `json:"sslEnable,omitempty"`
	SslInsecure      *bool  `json:"sslInsecure,omitempty"`

	// TSN
	TsnAgentMode string `json:"tsnAgentMode,omitempty"`

	// vRouter
	AgentMode                       string `json:"agentMode,omitempty"`
	FabricSnatHashTableSize         string `json:"fabricSntHashTableSize,omitempty"`
	PriorityBandwidth               string `json:"priorityBandwidth,omitempty"`
	PriorityId                      string `json:"priorityId,omitempty"`
	PriorityScheduling              string `json:"priorityScheduling,omitempty"`
	PriorityTagging                 *bool  `json:"priorityTagging,omitempty"`
	QosDefHwQueue                   *bool  `json:"qosDefHwQueue,omitempty"`
	QosLogicalQueues                string `json:"qosLogicalQueues,omitempty"`
	QosQueueId                      string `json:"qosQueueId,omitempty"`
	RequiredKernelVrouterEncryption string `json:"requiredKernelVrouterEncryption,omitempty"`
	SampleDestination               string `json:"sampleDestination,omitempty"`
	SloDestination                  string `json:"sloDestination,omitempty"`
	VrouterCryptInterface           string `json:"vrouterCryptInterface,omitempty"`
	VrouterDecryptInterface         string `json:"vrouterDecryptInterface,omitempty"`
	VrouterDecyptKey                string `json:"vrouterDecryptKey,omitempty"`
	VrouterEncryption               *bool  `json:"vrouterEncryption,omitempty"`
	VrouterGateway                  string `json:"vrouterGateway,omitempty"`
	DataSubnet                      string `json:"dataSubnet,omitempty"`

	// XMPP
	Subcluster           string `json:"subcluster,omitempty"`
	XmppServerCaCertfile string `json:"xmppServerCaCertfile,omitempty"`
	XmppServerCertfile   string `json:"xmppServerCertfile,omitempty"`
	XmppServerKeyfile    string `json:"xmppServerKeyfile,omitempty"`
	XmppServerPort       string `json:"xmppServerPort,omitempty"`
	XmppSslEnable        *bool  `json:"xmmpSslEnable,omitempty"`

	// HugePages
	HugePages2M *int `json:"hugePages2M,omitempty"`
	HugePages1G *int `json:"hugePages1G,omitempty"`

	// L3MH
	L3MHCidr string `json:"l3mhCidr,omitempty"`

	// CniMTU - mtu for virtual tap devices
	CniMTU *int `json:"cniMTU,omitempty"`
}

// VrouterList contains a list of Vrouter.
// +k8s:openapi-gen=true
type VrouterList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Vrouter `json:"items"`
}

var vrouter_log = logf.Log.WithName("controller_vrouter")

func init() {
	SchemeBuilder.Register(&Vrouter{}, &VrouterList{})
}

// CreateConfigMap creates configMap with specified name
func (c *Vrouter) CreateConfigMap(configMapName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.ConfigMap, error) {

	data := make(map[string]string)
	initCmd := "wait_file /etc/contrailconfigmaps/params.env.${POD_IP}; " +
		"source /etc/contrailconfigmaps/params.env.${POD_IP}; " +
		"source /common.sh; " +
		"source /agent-functions.sh; " +
		"source /actions.sh; " +
		"mkdir -p /var/log/contrail/vrouter-agent; " +
		"prepare_agent; " +
		"echo INFO: prepare_agent done"
	data["run-vrouteragent.sh"] = CommonStartupScriptEx(
		// agent handles errors w/o -e (use of -e leads to un-recovered bind iface on cleanup)
		"source /etc/contrailconfigmaps/params.env.${POD_IP}; "+
			"source /common.sh; "+
			"source /agent-functions.sh; "+
			"source /actions.sh; "+
			// set_traps needed as it is run as child but init cmd in parent
			"set +e; set_traps; start_agent; "+
			"echo INFO: agent finished",
		initCmd,
		map[string]string{
			"params.env.${POD_IP}":                  "",
			"contrail-vrouter-agent.conf.${POD_IP}": "contrail-vrouter-agent.conf",
			"contrail-lbaas.auth.conf.${POD_IP}":    "contrail-lbaas.auth.conf",
			"vnc_api_lib.ini.${POD_IP}":             "vnc_api_lib.ini",
		},
		"/etc/contrailconfigmaps",
		"/etc/contrail",
		"HUP",
	)

	return CreateConfigMap(configMapName,
		client,
		scheme,
		request,
		"vrouter",
		data,
		c)
}

// CreateSecret creates a secret.
func (c *Vrouter) CreateSecret(secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request) (*corev1.Secret, error) {
	return CreateSecret(secretName,
		client,
		scheme,
		request,
		"vrouter",
		c)
}

// PrepareDaemonSet prepares the intended podList.
func (c *Vrouter) PrepareDaemonSet(ds *appsv1.DaemonSet,
	commonConfiguration *PodConfiguration,
	request reconcile.Request,
	scheme *runtime.Scheme,
	client client.Client) error {
	instanceType := "vrouter"
	SetDSCommonConfiguration(ds, commonConfiguration)
	ds.SetName(request.Name + "-" + instanceType + "-daemonset")
	ds.SetNamespace(request.Namespace)
	ds.SetLabels(map[string]string{"tf_manager": instanceType,
		instanceType: request.Name})
	ds.Spec.Selector.MatchLabels = map[string]string{"tf_manager": instanceType,
		instanceType: request.Name}
	ds.Spec.Template.SetLabels(map[string]string{"tf_manager": instanceType,
		instanceType: request.Name})
	ds.Spec.UpdateStrategy.Type = "OnDelete"
	ds.Spec.Template.Spec.Affinity = &corev1.Affinity{
		PodAntiAffinity: &corev1.PodAntiAffinity{
			RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{{
				LabelSelector: &metav1.LabelSelector{
					MatchExpressions: []metav1.LabelSelectorRequirement{{
						Key:      instanceType,
						Operator: "Exists",
					}},
				},
				TopologyKey: "kubernetes.io/hostname",
			}},
		},
	}
	err := controllerutil.SetControllerReference(c, ds, scheme)
	if err != nil {
		return err
	}
	return nil
}

// SetDSCommonConfiguration takes common configuration parameters
// and applies it to the pod.
func SetDSCommonConfiguration(ds *appsv1.DaemonSet,
	commonConfiguration *PodConfiguration) {
	if len(commonConfiguration.Tolerations) > 0 {
		ds.Spec.Template.Spec.Tolerations = commonConfiguration.Tolerations
	}
	if len(commonConfiguration.NodeSelector) > 0 {
		ds.Spec.Template.Spec.NodeSelector = commonConfiguration.NodeSelector
	}
	if len(commonConfiguration.ImagePullSecrets) > 0 {
		imagePullSecretList := []corev1.LocalObjectReference{}
		for _, imagePullSecretName := range commonConfiguration.ImagePullSecrets {
			imagePullSecret := corev1.LocalObjectReference{
				Name: imagePullSecretName,
			}
			imagePullSecretList = append(imagePullSecretList, imagePullSecret)
		}
		ds.Spec.Template.Spec.ImagePullSecrets = imagePullSecretList
	}
}

// AddVolumesToIntendedDS adds volumes to a deployment.
func (c *Vrouter) AddVolumesToIntendedDS(ds *appsv1.DaemonSet, volumeConfigMapMap map[string]string) {
	volumeList := ds.Spec.Template.Spec.Volumes
	for configMapName, volumeName := range volumeConfigMapMap {
		volume := corev1.Volume{
			Name: volumeName,
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: configMapName,
					},
				},
			},
		}
		volumeList = append(volumeList, volume)
	}
	ds.Spec.Template.Spec.Volumes = volumeList
}

// CreateDS creates the daemonset.
func (c *Vrouter) CreateDS(ds *appsv1.DaemonSet,
	commonConfiguration *PodConfiguration,
	instanceType string,
	request reconcile.Request,
	scheme *runtime.Scheme,
	reconcileClient client.Client) error {
	foundDS := &appsv1.DaemonSet{}
	err := reconcileClient.Get(context.TODO(), types.NamespacedName{Name: request.Name + "-" + instanceType + "-daemonset", Namespace: request.Namespace}, foundDS)
	if err != nil {
		if errors.IsNotFound(err) {
			ds.Spec.Template.ObjectMeta.Labels["version"] = "1"
			err = reconcileClient.Create(context.TODO(), ds)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// UpdateDS updates the daemonset.
func (c *Vrouter) UpdateDS(ds *appsv1.DaemonSet,
	commonConfiguration *PodConfiguration,
	instanceType string,
	request reconcile.Request,
	scheme *runtime.Scheme,
	reconcileClient client.Client) error {
	currentDS := &appsv1.DaemonSet{}
	err := reconcileClient.Get(context.TODO(), types.NamespacedName{Name: request.Name + "-" + instanceType + "-daemonset", Namespace: request.Namespace}, currentDS)
	if err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return err
	}
	containersChanges := containersChanged(&ds.Spec.Template, &currentDS.Spec.Template)

	if containersChanges {

		ds.Spec.Template.ObjectMeta.Labels["version"] = currentDS.Spec.Template.ObjectMeta.Labels["version"]

		err = reconcileClient.Update(context.TODO(), ds)
		if err != nil {
			return err
		}
	}
	return nil
}

// SetInstanceActive sets the instance to active.
func (c *Vrouter) SetInstanceActive(client client.Client, activeStatus *bool, ds *appsv1.DaemonSet, request reconcile.Request, object runtime.Object) error {
	if err := client.Get(context.TODO(), types.NamespacedName{Name: ds.Name, Namespace: request.Namespace},
		ds); err != nil {
		return err
	}
	active := false
	if ds.Status.DesiredNumberScheduled == ds.Status.NumberReady {
		active = true
	}

	*activeStatus = active
	if err := client.Status().Update(context.TODO(), object); err != nil {
		return err
	}
	return nil
}

// PodIPListAndIPMapFromInstance gets a list with POD IPs and a map of POD names and IPs.
func (c *Vrouter) PodIPListAndIPMapFromInstance(instanceType string, request reconcile.Request, reconcileClient client.Client) ([]corev1.Pod, map[string]NodeInfo, error) {
	datanetwork := c.Spec.ServiceConfiguration.DataSubnet
	if gw := c.Spec.ServiceConfiguration.VrouterGateway; gw != "" {
		if _, network, err := net.ParseCIDR(datanetwork); err == nil {
			if !network.Contains(net.ParseIP(gw)) {
				return nil, nil, fmt.Errorf("DataSubnet and Vrouter Gateway mismatch: dataSubnet=%s gw=%s", datanetwork, gw)
			}
		} else {
			return nil, nil, fmt.Errorf("DataSubnet is not provided or doesnt contain a valid CIDR: dataSubnet=%s (err=%+v)", datanetwork, err)
		}
	}
	return PodIPListAndIPMapFromInstance(instanceType, request, reconcileClient, datanetwork)
}

// CreateCNIConfigMap creates vRouter configMaps with rendered values
func (c *Vrouter) CreateCNIConfigMap(client client.Client, scheme *runtime.Scheme, request reconcile.Request) (*corev1.ConfigMap, error) {
	config, err := c.GetCNIConfig(client, request)
	if err != nil {
		return nil, err
	}
	configMap, err := c.CreateConfigMap(request.Name+"-cni-config", client, scheme, request)
	if err != nil {
		return nil, err
	}
	configMap.Data["10-tf-cni.conf"] = config
	return configMap, client.Update(context.TODO(), configMap)
}

// ManageNodeStatus updates nodes map
func (c *Vrouter) ManageNodeStatus(nodes map[string]NodeInfo,
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

// VrouterConfigurationParameters is a method for gathering data used in rendering vRouter configuration
func (c *Vrouter) VrouterConfigurationParameters(client client.Client) (*VrouterConfiguration, error) {
	cinfo, err := ClusterParameters(client)
	if err != nil {
		return nil, err
	}

	vrouterConfiguration := c.Spec.ServiceConfiguration.DeepCopy()

	trueVal := true
	falseVal := false
	defCert := "/etc/certificates/server-${POD_IP}.crt"
	defKey := "/etc/certificates/server-key-${POD_IP}.pem"
	defClientCert := "/etc/certificates/client-${POD_IP}.crt"
	defClientKey := "/etc/certificates/client-key-${POD_IP}.pem"

	if vrouterConfiguration.LogLocal == nil {
		ll := LogLocal
		vrouterConfiguration.LogLocal = &ll
	}

	if vrouterConfiguration.VrouterEncryption == nil {
		vrouterConfiguration.VrouterEncryption = &falseVal
	}

	if vrouterConfiguration.CloudOrchestrator == "" {
		vrouterConfiguration.CloudOrchestrator = "kubernetes"
	}

	if vrouterConfiguration.HypervisorType == "" {
		vrouterConfiguration.HypervisorType = "kvm"
	}

	if vrouterConfiguration.SslEnable == nil {
		vrouterConfiguration.SslEnable = &trueVal
	}
	if vrouterConfiguration.ServerCaCertfile == "" {
		vrouterConfiguration.ServerCaCertfile = SignerCAFilepath
	}
	if vrouterConfiguration.ServerCertfile == "" {
		vrouterConfiguration.ServerCertfile = defCert
	}
	if vrouterConfiguration.ServerKeyfile == "" {
		vrouterConfiguration.ServerKeyfile = defKey
	}

	if vrouterConfiguration.ConfigApiSslEnable == nil {
		vrouterConfiguration.ConfigApiSslEnable = vrouterConfiguration.SslEnable
	}
	if vrouterConfiguration.ConfigApiServerCaCertfile == "" {
		vrouterConfiguration.ConfigApiServerCaCertfile = vrouterConfiguration.ServerCaCertfile
	}

	if vrouterConfiguration.XmppSslEnable == nil {
		vrouterConfiguration.XmppSslEnable = vrouterConfiguration.SslEnable
	}
	if vrouterConfiguration.XmppServerCaCertfile == "" {
		vrouterConfiguration.XmppServerCaCertfile = vrouterConfiguration.ServerCaCertfile
	}
	if vrouterConfiguration.XmppServerCertfile == "" {
		vrouterConfiguration.XmppServerCertfile = defClientCert
	}
	if vrouterConfiguration.XmppServerKeyfile == "" {
		vrouterConfiguration.XmppServerKeyfile = defClientKey
	}

	if vrouterConfiguration.SandeshSslEnable == nil {
		vrouterConfiguration.SandeshSslEnable = vrouterConfiguration.SslEnable
	}
	if vrouterConfiguration.SandeshCaCertfile == "" {
		vrouterConfiguration.SandeshCaCertfile = vrouterConfiguration.ServerCaCertfile
	}
	if vrouterConfiguration.SandeshCertfile == "" {
		vrouterConfiguration.SandeshCertfile = defClientCert
	}
	if vrouterConfiguration.SandeshKeyfile == "" {
		vrouterConfiguration.SandeshKeyfile = defClientKey
	}
	if vrouterConfiguration.SandeshServerCertfile == "" {
		vrouterConfiguration.SandeshServerCertfile = defCert
	}
	if vrouterConfiguration.SandeshServerKeyfile == "" {
		vrouterConfiguration.SandeshServerKeyfile = defKey
	}

	if vrouterConfiguration.IntrospectSslEnable == nil {
		vrouterConfiguration.IntrospectSslEnable = vrouterConfiguration.SslEnable
	}

	if vrouterConfiguration.KubernetesApiSecurePort == "" {
		p, err := cinfo.KubernetesAPISSLPort()
		if err != nil {
			return nil, err
		}
		vrouterConfiguration.KubernetesApiSecurePort = strconv.Itoa(p)
	}
	if vrouterConfiguration.KubernetesPodSubnet == "" {
		vrouterConfiguration.KubernetesPodSubnet = cinfo.Networking.PodSubnet
	}

	return vrouterConfiguration, nil
}

// GetNodeDSPod returns daemonset pod by name
func (c *Vrouter) GetNodeDSPod(nodeName string, daemonset *appsv1.DaemonSet, clnt client.Client) *corev1.Pod {
	allPods := &corev1.PodList{}
	// var pod corev1.Pod
	_ = clnt.List(context.Background(), allPods)
	for _, pod := range allPods.Items {

		if pod.ObjectMeta.OwnerReferences != nil &&
			len(pod.ObjectMeta.OwnerReferences) > 0 &&
			pod.ObjectMeta.OwnerReferences[0].Name == daemonset.Name &&
			pod.Spec.NodeName == nodeName {
			return &pod
		}
	}
	return nil
}

// GetAgentNodes list of agent nodes
func (c *Vrouter) GetAgentNodes(daemonset *appsv1.DaemonSet, clnt client.Client) *corev1.NodeList {

	// TODO get nodes based on node selector
	// for ns_key, ns_value := range daemonset.Spec.Template.Spec.NodeSelector {
	//   vrouter_log.Info(fmt.Sprintf("Node selector = '%v' : '%v'",ns_key,ns_value))
	// }

	// Get Nodes for check agent Status
	// Using a typed object.
	nodeList := &corev1.NodeList{}
	_ = clnt.List(context.Background(), nodeList)

	return nodeList
}

// GetParamsEnv returns agent params (str comma separated)
func (c *Vrouter) GetParamsEnv(clnt client.Client, clusterNodes *ClusterNodes, vrouterHostname string) (string, error) {
	vrouterConfig, err := c.VrouterConfigurationParameters(clnt)
	if err != nil {
		return "", err
	}
	var vrouterManifestParamsEnv bytes.Buffer
	err = configtemplates.VRouterAgentParams.Execute(&vrouterManifestParamsEnv, struct {
		ServiceConfig VrouterConfiguration
		ClusterNodes  ClusterNodes
		Hostname      string
		LogLevel      string
	}{
		ServiceConfig: *vrouterConfig,
		ClusterNodes:  *clusterNodes,
		Hostname:      vrouterHostname,
		LogLevel:      ConvertLogLevel(c.Spec.CommonConfiguration.LogLevel),
	})
	if err != nil {
		panic(err)
	}
	return vrouterManifestParamsEnv.String(), nil
}

// VrouterPod is a pod, created by vrouter.
type VrouterPod struct {
	Pod *corev1.Pod
}

// ExecToAgentContainer uninterractively exec to the vrouteragent container.
func (vrouterPod *VrouterPod) ExecToAgentContainer(command string) (string, string, error) {
	cmd := `
source /etc/contrailconfigmaps/params.env.${POD_IP} || exit 1;
source /actions.sh;
source /common.sh;
source /agent-functions.sh;
` + command
	return ExecToContainer(vrouterPod.Pod, "vrouteragent", []string{"/usr/bin/bash", "-c", cmd}, nil)
}

// ExecToNodemanagerContainer uninterractively exec to the vrouteragent container.
func (vrouterPod *VrouterPod) ExecToNodemanagerContainer(command []string) (string, string, error) {
	return ExecToContainer(vrouterPod.Pod, "nodemanager", command, nil)
}

// IsAgentContainerRunning checks if agent running on the vrouteragent container.
func (vrouterPod *VrouterPod) IsAgentContainerRunning() bool {
	_, _, err := vrouterPod.ExecToAgentContainer("true")
	return err == nil
}

// IsFileInAgentContainerEqualTo checks file content
func (vrouterPod *VrouterPod) IsFileInAgentContainerEqualTo(path string, content string) (bool, error) {
	return ContainerFileChanged(vrouterPod.Pod, "vrouteragent", path, content)
}

// RecalculateAgentParameters recalculates parameters for agent from `/etc/contrail/params.env` to `/parameters.sh`
func (vrouterPod *VrouterPod) RecalculateAgentParameters() (string, string, error) {
	return vrouterPod.ExecToAgentContainer("prepare_agent_config_vars")
}

// ValidateVrouterNIC checks if vrouter pod configured on correct NIC
func (vrouterPod *VrouterPod) ValidateVrouterNIC() (string, string, error) {
	// check nic only if vhost0 is up
	// dont check for l3mh and if phys iface explicetely set
	command := `
[ -z "$PHYSICAL_INTERFACE" ] || exit 0 ;
[ -z "$L3MH_CIDR" ] || exit 0 ;
wait_vhost0 1 0 || exit 0 ;
[[ $(get_vrouter_physical_iface) == vhost0 ]] || echo "REQUIRES VHOST RELOAD"
`
	return vrouterPod.ExecToAgentContainer(command)
}

func (vrouterPod *VrouterPod) NeedVhostReload() (bool, error) {
	stdout, stderr, err := vrouterPod.ValidateVrouterNIC()
	if err != nil {
		vrouter_log.Error(err, "NeedVhostReload failed", "stdout", stdout, "stderr", stderr)
		return false, err
	}
	scanner := bufio.NewScanner(strings.NewReader(stdout))
	for scanner.Scan() {
		value := removeQuotes(scanner.Text())
		if value == "REQUIRES VHOST RELOAD" {
			return true, nil
		}
	}
	return false, nil
}

// GetAgentParameters gets parametrs from `/parametrs.sh`
func (vrouterPod *VrouterPod) GetAgentParameters(hostParams *map[string]string) (string, string, error) {
	stdout, stderr, err := vrouterPod.ExecToAgentContainer("get_parameters")
	if err != nil {
		return stdout, stderr, err
	}
	scanner := bufio.NewScanner(strings.NewReader(stdout))
	for scanner.Scan() {
		keyValue := strings.SplitAfterN(scanner.Text(), "=", 2)
		key := strings.TrimSuffix(keyValue[0], "=")
		if len(keyValue) != 2 {
			continue
		}
		value := removeQuotes(keyValue[1])
		(*hostParams)[key] = value
	}
	return "", "", nil
}

// ReloadAgentConfigs sends SIGHUP to the vrouteragent container process to reload config file.
func (vrouterPod *VrouterPod) ReloadAgentConfigs() error {
	vrouter_log.Info("ReloadAgentConfigs", "pod", vrouterPod.Pod.Name)
	_, _, err := vrouterPod.ExecToAgentContainer("reload_config")
	return err
}

// ReloadNodemanager sends sighup to nodemanager
func (vrouterPod *VrouterPod) ReloadNodemanager() error {
	vrouter_log.Info("ReloadNodemanager", "pod", vrouterPod.Pod.Name)
	command := []string{"/usr/bin/bash", "-c", "kill -HUP 1"}
	_, _, err := vrouterPod.ExecToNodemanagerContainer(command)
	return err
}

func removeQuotes(str string) string {
	if len(str) > 0 && str[0] == '"' {
		str = str[1:]
	}
	if len(str) > 0 && str[len(str)-1] == '"' {
		str = str[:len(str)-1]
	}
	return str
}

// GetAgentConfigsForPod returns correct values of `/etc/contrailconfigmaps/config_name.{$pod_ip}` files
func (c *Vrouter) GetAgentConfigsForPod(vrouterPod *VrouterPod, hostVars *map[string]string) (agentConfig, lbaasAuthConfig, vncAPILibIniConfig, nodemgrConfig string, err error) {
	newMap := make(map[string]string)
	for key, val := range *hostVars {
		newMap[key] = val
	}
	vrouterHostname, err := GetHostname(vrouterPod.Pod, "vrouter", c.Spec.ServiceConfiguration.DataSubnet)
	if err != nil {
		return "", "", "", "", err
	}

	newMap["Hostname"] = vrouterHostname

	var agentConfigBuffer bytes.Buffer
	if err = configtemplates.VRouterAgentConfig.Execute(&agentConfigBuffer, newMap); err != nil {
		panic(err)
	}
	agentConfig = agentConfigBuffer.String()

	var lbaasAuthConfigBuffer bytes.Buffer
	if err = configtemplates.VRouterLbaasAuthConfig.Execute(&lbaasAuthConfigBuffer, newMap); err != nil {
		panic(err)
	}
	lbaasAuthConfig = lbaasAuthConfigBuffer.String()

	var vncAPILibIniConfigBuffer bytes.Buffer
	if err = configtemplates.VRouterVncApiLibIni.Execute(&vncAPILibIniConfigBuffer, newMap); err != nil {
		panic(err)
	}
	vncAPILibIniConfig = vncAPILibIniConfigBuffer.String()

	var nodemgrConfigBuffer bytes.Buffer
	if err = configtemplates.VrouterNodemanagerConfig.Execute(&nodemgrConfigBuffer, newMap); err != nil {
		panic(err)
	}
	nodemgrConfig = nodemgrConfigBuffer.String()

	return
}

// GetCNIConfig creates CNI plugin config
func (c *Vrouter) GetCNIConfig(client client.Client, request reconcile.Request) (string, error) {
	cfg, err := ClusterParameters(client)
	if err != nil {
		return "", err
	}
	var contrailCNIBuffer bytes.Buffer
	err = configtemplates.ContrailCNIConfig.Execute(&contrailCNIBuffer, struct {
		KubernetesClusterName string
		MTU                   *int
	}{
		KubernetesClusterName: cfg.ClusterName,
		MTU:                   c.Spec.ServiceConfiguration.CniMTU,
	})
	if err != nil {
		panic(err)
	}
	return contrailCNIBuffer.String(), nil
}

// UpdateAgentParams updates configmap with params data
func (c *Vrouter) UpdateAgentParams(vrouterPod *VrouterPod,
	params string,
	configMap *corev1.ConfigMap,
	client client.Client,
) error {

	configMap.Data["params.env."+vrouterPod.Pod.Status.PodIP] = params
	return client.Update(context.Background(), configMap)
}

// UpdateAgentConfigMapForPod recalculates files `/etc/contrailconfigmaps/config_name.{$pod_ip}` in the agent configMap
func (c *Vrouter) UpdateAgentConfigMapForPod(vrouterPod *VrouterPod,
	clusterNodes *ClusterNodes,
	hostVars *map[string]string,
	configMap *corev1.ConfigMap,
	client client.Client,
) error {

	agentConfig, lbaasAuthConfig, vncAPILibIniConfig, nodemgrConfig, err := c.GetAgentConfigsForPod(vrouterPod, hostVars)
	if err != nil {
		return err
	}
	podIP := vrouterPod.Pod.Status.PodIP
	configMap.Data["contrail-vrouter-agent.conf."+podIP] = agentConfig
	configMap.Data["contrail-lbaas.auth.conf."+podIP] = lbaasAuthConfig
	configMap.Data["vnc_api_lib.ini."+podIP] = vncAPILibIniConfig
	configMap.Data["vrouter-nodemgr.conf."+podIP] = nodemgrConfig
	configMap.Data["vrouter-nodemgr.env."+podIP] = ""

	// update with provisioner configs
	srvCfg := c.Spec.ServiceConfiguration
	vrouterHostname, err := GetHostname(vrouterPod.Pod, "vrouter", c.Spec.ServiceConfiguration.DataSubnet)
	if err != nil {
		return err
	}

	configMap.Data["vrouter-provisioner.env."+podIP] = ProvisionerEnvDataEx(
		clusterNodes, vrouterHostname,
		c.Spec.CommonConfiguration.AuthParameters,
		srvCfg.PhysicalInterface, srvCfg.VrouterGateway, srvCfg.L3MHCidr)

	return client.Update(context.Background(), configMap)
}

// RemoveAgentConfigMapForPod removes data
func (c *Vrouter) RemoveAgentConfigMapForPod(vrouterPod *VrouterPod,
	configMap *corev1.ConfigMap,
	client client.Client,
) error {

	podIP := vrouterPod.Pod.Status.PodIP
	delete(configMap.Data, "contrail-vrouter-agent.conf."+podIP)
	delete(configMap.Data, "contrail-lbaas.auth.conf."+podIP)
	delete(configMap.Data, "vnc_api_lib.ini."+podIP)
	delete(configMap.Data, "vrouter-nodemgr.conf."+podIP)
	delete(configMap.Data, "vrouter-nodemgr.env."+podIP)
	delete(configMap.Data, "vrouter-provisioner.env."+podIP)

	return client.Update(context.Background(), configMap)
}

// UpdateAgent waits for config updates and reload containers
func (c *Vrouter) UpdateAgent(nodeName string, agentStatus *AgentStatus, vrouterPod *VrouterPod, configMap *corev1.ConfigMap, clnt client.Client) (bool, error) {

	ll := vrouter_log.WithName("UpdateAgent").WithValues("nodeName", nodeName)
	ns := c.GetNamespace()
	controlNodesList, err := GetControlNodes(ns, c.Spec.ServiceConfiguration.ControlInstance,
		c.Spec.ServiceConfiguration.DataSubnet, clnt)
	if err != nil {
		return true, err
	}
	configNodes, err := GetConfigNodes(ns, clnt)
	if err != nil {
		return true, err
	}
	analyticsNodes, err := GetAnalyticsNodes(ns, clnt)
	if err != nil {
		return true, err
	}
	clusterNodes := ClusterNodes{
		ConfigNodes:    configNodes,
		ControlNodes:   controlNodesList,
		AnalyticsNodes: analyticsNodes,
	}
	vrouterHostname, err := GetHostname(vrouterPod.Pod, "vrouter", c.Spec.ServiceConfiguration.DataSubnet)
	if err != nil {
		return true, err
	}

	ll.Info("Check params", "clusterNodes", clusterNodes, "vrouterHostname", vrouterHostname)
	params, err := c.GetParamsEnv(clnt, &clusterNodes, vrouterHostname)
	if err != nil {
		ll.Error(err, "GetParamsEnv failed")
		return true, err
	}
	paramsSha256 := EncryptString(params)

	if agentStatus.EncryptedParams != paramsSha256 {

		if agentStatus.Status != "Updating" {
			if err := c.UpdateAgentParams(vrouterPod, params, configMap, clnt); err != nil {
				ll.Error(err, "UpdateAgentParams failed")
				return true, err
			}
			ll.Info("Start update", "currentSha", agentStatus.EncryptedParams, "newSha", paramsSha256)
			agentStatus.Status = "Updating"
			// let params.env be populated to nodes
			return true, nil
		}

		if !vrouterPod.IsAgentContainerRunning() {
			ll.Info("Agent container is not runned yet")
			return true, nil
		}

		eq, err := vrouterPod.IsFileInAgentContainerEqualTo("/etc/contrailconfigmaps/params.env."+vrouterPod.Pod.Status.PodIP, params)
		if err != nil || !eq {
			ll.Info("params.env is not ready", "err", err)
			// reset status to allow UpdateAgentParams on next iteration as params might be changed since that one more times
			agentStatus.Status = "Starting"
			return true, err
		}

		if needReload, err := vrouterPod.NeedVhostReload(); err != nil || needReload {
			if needReload {
				ll.Info("Vhost is needed to be reinit, delete pod", "pod", vrouterPod.Pod.Name)
				if err = c.RemoveAgentConfigMapForPod(vrouterPod, configMap, clnt); err != nil {
					ll.Error(err, "RemoveAgentConfigMapForPod failed")
					return true, err
				}
				if err = clnt.Delete(context.Background(), vrouterPod.Pod); err != nil {
					ll.Error(err, "Remove pod failed", "pod", vrouterPod.Pod.Name)
				}
			}
			return true, err
		}

		if stdout, stderr, err := vrouterPod.RecalculateAgentParameters(); err != nil {
			ll.Error(err, "RecalculateAgentParameters failed", "stdout", stdout, "stderr", stderr)
			return true, err
		}

		hostVars := make(map[string]string)
		if stdout, stderr, err := vrouterPod.GetAgentParameters(&hostVars); err != nil {
			ll.Error(err, "GetAgentParameters failed", "stdout", stdout, "stderr", stderr)
			return true, err
		}

		if err := c.UpdateAgentConfigMapForPod(vrouterPod, &clusterNodes, &hostVars, configMap, clnt); err != nil {
			ll.Error(err, "UpdateAgentConfigMapForPod failed")
			return true, err
		}

		// Update sha as update of configmap called successfully
		agentStatus.EncryptedParams = paramsSha256
		ll.Info("Params sha updated", "sha", paramsSha256)
	}

	if agentStatus.Status == "Ready" {
		ll.Info("Agent is in Ready state, no changes")
		return false, nil
	}

	srvCfg := c.Spec.ServiceConfiguration

	provData := ProvisionerEnvDataEx(&clusterNodes, vrouterHostname,
		c.Spec.CommonConfiguration.AuthParameters, srvCfg.PhysicalInterface,
		srvCfg.VrouterGateway, srvCfg.L3MHCidr)

	// wait till new files is delivered to agent
	eq, err := vrouterPod.IsAgentConfigsAvaliable(c, provData, configMap)
	if err != nil || !eq {
		ll.Info("Configs are not available", "err", err)
		return true, err
	}

	// Send SIGHUP то container process to reload config file
	if err = vrouterPod.ReloadNodemanager(); err != nil {
		ll.Error(err, "ReloadNodemanager failed")
		return true, err
	}

	if err = vrouterPod.ReloadAgentConfigs(); err != nil {
		ll.Error(err, "ReloadAgentConfigs failed")
		return true, err
	}

	agentStatus.ConfigNodes = clusterNodes.ConfigNodes
	agentStatus.ControlNodes = clusterNodes.ControlNodes
	agentStatus.AnalyticsNodes = clusterNodes.AnalyticsNodes

	needReconcile := agentStatus.Status != "Ready"
	agentStatus.Status = "Ready"

	ll.Info("UpdateAgent finished", "needReconcile", needReconcile)
	return needReconcile, nil
}

// IsAgentConfigsAvaliable checks config inside container
func (vrouterPod *VrouterPod) IsAgentConfigsAvaliable(vrouter *Vrouter, provisionerData string, configMap *corev1.ConfigMap) (bool, error) {
	podIP := vrouterPod.Pod.Status.PodIP

	ll := vrouter_log.WithName("IsAgentConfigsAvaliable").WithName(podIP)

	path := "/etc/contrailconfigmaps/contrail-vrouter-agent.conf." + podIP
	eq, err := vrouterPod.IsFileInAgentContainerEqualTo(path, configMap.Data["contrail-vrouter-agent.conf."+podIP])
	if err != nil || !eq {
		ll.Info("contrail-vrouter-agent.conf not ready", "err", err)
		return eq, err
	}

	path = "/etc/contrailconfigmaps/contrail-lbaas.auth.conf." + podIP
	eq, err = vrouterPod.IsFileInAgentContainerEqualTo(path, configMap.Data["contrail-lbaas.auth.conf."+podIP])
	if err != nil || !eq {
		ll.Info("contrail-lbaas.auth.conf not ready", "err", err)
		return eq, err
	}

	path = "/etc/contrailconfigmaps/vnc_api_lib.ini." + podIP
	eq, err = vrouterPod.IsFileInAgentContainerEqualTo(path, configMap.Data["vnc_api_lib.ini."+podIP])
	if err != nil || !eq {
		ll.Info("vnc_api_lib.ini not ready", "err", err)
		return eq, nil
	}

	path = "/etc/contrailconfigmaps/vrouter-nodemgr.conf." + podIP
	eq, err = vrouterPod.IsFileInAgentContainerEqualTo(path, configMap.Data["vrouter-nodemgr.conf."+podIP])
	if err != nil || !eq {
		ll.Info("vrouter-nodemgr.conf not ready", "err", err)
		return eq, nil
	}

	path = "/etc/contrailconfigmaps/vrouter-provisioner.env." + podIP
	eq, err = vrouterPod.IsFileInAgentContainerEqualTo(path, provisionerData)
	if err != nil || !eq {
		ll.Info("vrouter-provisioner.env."+podIP+" not ready", "err", err)
		return eq, nil
	}

	return true, nil
}

// IsActiveOnControllers returns true if agents on master nodes are active
func (c *Vrouter) IsActiveOnControllers(clnt client.Client) (bool, error) {
	if c.Status.Agents == nil {
		return false, nil
	}
	nodes, err := GetControllerNodes(clnt)
	if err != nil {
		return false, err
	}
	for _, node := range nodes {
		if s := c.LookupAgentStatus(node.Name); s == nil || (s.Status != "Ready" && s.Status != "Upgrading") {
			return false, nil
		}
	}
	return true, nil
}

// LookupAgentStatus lookup AgentStatus for an agent
func (c *Vrouter) LookupAgentStatus(name string) *AgentStatus {
	if c.Status.Agents == nil {
		return nil
	}
	for _, s := range c.Status.Agents {
		if s.Name == name {
			return s
		}
	}
	return nil
}
