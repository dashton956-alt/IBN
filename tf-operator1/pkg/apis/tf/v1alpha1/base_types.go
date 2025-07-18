package v1alpha1

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"reflect"
	"sort"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	"github.com/operator-framework/operator-sdk/pkg/k8sutil"
	"github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1/templates"
	configtemplates "github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1/templates"
	"github.com/tungstenfabric/tf-operator/pkg/certificates"
	"github.com/tungstenfabric/tf-operator/pkg/k8s"
)

// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

const (
	RHEL   string = "rhel"
	CENTOS string = "centos"
	UBUNTU string = "ubuntu"
)

// Container defines name, image and command.
// +k8s:openapi-gen=true
type Container struct {
	Name    string   `json:"name,omitempty"`
	Image   string   `json:"image,omitempty"`
	Command []string `json:"command,omitempty"`
}

// ServiceStatus provides information on the current status of the service.
// +k8s:openapi-gen=true
type ServiceStatus struct {
	Name    *string `json:"name,omitempty"`
	Active  *bool   `json:"active,omitempty"`
	Created *bool   `json:"created,omitempty"`
}

// PodConfiguration is the common services struct.
// +k8s:openapi-gen=true
type PodConfiguration struct {
	// NodeSelector is a selector which must be true for the pod to fit on a node.
	// Selector which must match a node's labels for the pod to be scheduled on that node.
	// More info: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/.
	// +optional
	NodeSelector map[string]string `json:"nodeSelector,omitempty" protobuf:"bytes,7,rep,name=nodeSelector"`
	// ImagePullSecrets is an optional list of references to secrets in the same namespace to use for pulling any of the images used by this PodSpec.
	ImagePullSecrets []string `json:"imagePullSecrets,omitempty"`
	// If specified, the pod's tolerations.
	// +optional
	Tolerations []corev1.Toleration `json:"tolerations,omitempty" protobuf:"bytes,22,opt,name=tolerations"`
	// AuthParameters auth parameters
	// +optional
	AuthParameters AuthParameters `json:"authParameters,omitempty"`
	// Kubernetes Cluster Configuration
	// +kubebuilder:validation:Enum=info;debug;warning;error;critical;none
	// +optional
	LogLevel string `json:"logLevel,omitempty"`
	// OS family
	// +optional
	Distribution *string `json:"distribution,omitempty"`
}

type ClusterNodes struct {
	AnalyticsNodes      string
	AnalyticsDBNodes    string
	AnalyticsAlarmNodes string
	AnalyticsSnmpNodes  string
	ConfigNodes         string
	ControlNodes        string
}

var ZiuKindsNoVrouterCNI = []string{
	"Config",
	"Analytics",
	"AnalyticsAlarm",
	"AnalyticsSnmp",
	"Redis",
	"QueryEngine",
	"Cassandra",
	"Zookeeper",
	"Rabbitmq",
	"Control",
	"Webui",
}

var ZiuKindsAll = append(ZiuKindsNoVrouterCNI, "Kubemanager")

// Establishes ZIU staging
var ZiuKinds []string

var ZiuRestartTime, _ = time.ParseDuration("20s")

// IntrospectionListenAddress returns listen address for instrospection
func (cc *PodConfiguration) IntrospectionListenAddress(addr string) string {
	if IntrospectListenAll {
		return "0.0.0.0"
	}
	return addr
}

func CmpConfigMaps(first, second *corev1.ConfigMap) bool {
	if first.Data == nil {
		first.Data = map[string]string{}
	}
	if second.Data == nil {
		second.Data = map[string]string{}
	}
	return reflect.DeepEqual(first.Data, second.Data)
}

func (ss *ServiceStatus) ready() bool {
	if ss == nil {
		return false
	}
	if ss.Active == nil {
		return false
	}

	return *ss.Active

}

// ensureSecret creates Secret for a service account
func ensureSecret(serviceAccountName, secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	owner v1.Object) error {

	namespace := owner.GetNamespace()
	existingSecret := &corev1.Secret{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: secretName, Namespace: namespace}, existingSecret)
	if err != nil && !k8serrors.IsNotFound(err) {
		return err
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
			Annotations: map[string]string{
				"kubernetes.io/service-account.name": serviceAccountName,
			},
		},
		Type: corev1.SecretType("kubernetes.io/service-account-token"),
	}
	err = controllerutil.SetControllerReference(owner, secret, scheme)
	if err != nil {
		return err
	}
	return client.Create(context.TODO(), secret)
}

// ensureClusterRole creates ClusterRole
func ensureClusterRole(clusterRoleName string,
	client client.Client,
	scheme *runtime.Scheme,
	owner v1.Object) error {

	existingClusterRole := &rbacv1.ClusterRole{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: clusterRoleName}, existingClusterRole)
	if err != nil && !k8serrors.IsNotFound(err) {
		return err
	}
	namespace := owner.GetNamespace()
	clusterRole := &rbacv1.ClusterRole{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac/v1",
			Kind:       "ClusterRole",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterRoleName,
			Namespace: namespace,
		},
		Rules: []rbacv1.PolicyRule{{
			Verbs: []string{
				"*",
			},
			APIGroups: []string{
				"*",
			},
			Resources: []string{
				"*",
			},
		}},
	}
	return client.Create(context.TODO(), clusterRole)
}

// ensureClusterRoleBinding creates ClusterRole binding
func ensureClusterRoleBinding(
	serviceAccountName, clusterRoleName, clusterRoleBindingName string,
	client client.Client,
	scheme *runtime.Scheme,
	owner v1.Object) error {

	namespace := owner.GetNamespace()
	existingClusterRoleBinding := &rbacv1.ClusterRoleBinding{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: clusterRoleBindingName}, existingClusterRoleBinding)
	if err != nil && !k8serrors.IsNotFound(err) {
		return err
	}
	clusterRoleBinding := &rbacv1.ClusterRoleBinding{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "rbac/v1",
			Kind:       "ClusterRoleBinding",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      clusterRoleBindingName,
			Namespace: namespace,
		},
		Subjects: []rbacv1.Subject{{
			Kind:      "ServiceAccount",
			Name:      serviceAccountName,
			Namespace: namespace,
		}},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     clusterRoleName,
		},
	}
	return client.Create(context.TODO(), clusterRoleBinding)
}

// ensureServiceAccount creates ServiceAccoung, Secret, ClusterRole and ClusterRoleBinding objects
func ensureServiceAccount(
	serviceAccountName string,
	clusterRoleName string,
	clusterRoleBindingName string,
	secretName string,
	imagePullSecret []string,
	client client.Client,
	scheme *runtime.Scheme,
	owner v1.Object) error {

	if err := ensureSecret(serviceAccountName, secretName, client, scheme, owner); err != nil {
		return nil
	}

	namespace := owner.GetNamespace()
	existingServiceAccount := &corev1.ServiceAccount{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: serviceAccountName, Namespace: namespace}, existingServiceAccount)
	if err != nil && k8serrors.IsNotFound(err) {
		serviceAccount := &corev1.ServiceAccount{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "v1",
				Kind:       "ServiceAccount",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name:      serviceAccountName,
				Namespace: namespace,
			},
		}
		serviceAccount.Secrets = append(serviceAccount.Secrets,
			corev1.ObjectReference{
				Kind:      "Secret",
				Namespace: namespace,
				Name:      secretName})
		for _, name := range imagePullSecret {
			serviceAccount.ImagePullSecrets = append(serviceAccount.ImagePullSecrets,
				corev1.LocalObjectReference{Name: name})
		}

		err = controllerutil.SetControllerReference(owner, serviceAccount, scheme)
		if err != nil {
			return err
		}
		if err = client.Create(context.TODO(), serviceAccount); err != nil && !k8serrors.IsAlreadyExists(err) {
			return err
		}
	}
	if err := ensureClusterRole(clusterRoleName, client, scheme, owner); err != nil {
		return nil
	}
	if err := ensureClusterRoleBinding(serviceAccountName, clusterRoleName, clusterRoleName, client, scheme, owner); err != nil {
		return nil
	}
	return nil
}

// EnsureServiceAccount prepares the intended podList.
func EnsureServiceAccount(spec *corev1.PodSpec,
	instanceType string,
	imagePullSecret []string,
	client client.Client,
	request reconcile.Request,
	scheme *runtime.Scheme,
	object v1.Object) error {

	baseName := request.Name + "-" + instanceType + "-"
	serviceAccountName := baseName + "service-account"
	err := ensureServiceAccount(
		serviceAccountName,
		baseName+"role",
		baseName+"role-binding",
		baseName+"secret",
		imagePullSecret,
		client, scheme, object)
	if err != nil {
		log.Error(err, "EnsureServiceAccount failed")
		return err
	}
	spec.ServiceAccountName = serviceAccountName
	return nil
}

// +k8s:deepcopy-gen=false
type podAltIPsRetriver func(pod corev1.Pod) []string

// PodAlternativeIPs alternative IPs list for cert alt names subject
// +k8s:deepcopy-gen=false
type PodAlternativeIPs struct {
	// Function which operate over pod object
	// to retrieve additional IP addresses used
	// by this pod.
	Retriever podAltIPsRetriver
	// ServiceIP through which pod can be reached.
	ServiceIP string
}

// Retrieve and add hostname from data subnet
func _addAltHostname(pod corev1.Pod, instanceType string, altNames []string) []string {
	if cidr, isSet := pod.Annotations["dataSubnet"]; isSet {
		altName, err := GetHostname(&pod, instanceType, cidr)
		if err == nil && altName != "" {
			for _, name := range altNames {
				if name == altName {
					return altNames
				}
			}
			altNames = append(altNames, altName)
		}
	}
	return altNames
}

// PodsCertSubjects iterates over passed list of pods and for every pod prepares certificate subject
// which can be later used for generating certificate for given pod.
func PodsCertSubjects(domain string, podList []corev1.Pod, podAltIPs PodAlternativeIPs, clientAuth bool, instanceType string) []certificates.CertificateSubject {
	var pods []certificates.CertificateSubject
	var osName string
	if hn, err := os.Hostname(); err != nil && hn != "" {
		osName = hn
	}
	for _, pod := range podList {
		var alternativeIPs []string
		if podAltIPs.ServiceIP != "" {
			alternativeIPs = append(alternativeIPs, podAltIPs.ServiceIP)
		}
		if podAltIPs.Retriever != nil {
			if altIPs := podAltIPs.Retriever(pod); len(altIPs) > 0 {
				for _, v := range altIPs {
					if v != pod.Status.PodIP {
						alternativeIPs = append(alternativeIPs, v)
					}
				}
			}
		}
		altNames := []string{
			pod.Spec.NodeName,
			pod.Annotations["hostname"],
		}
		if osName != "" {
			altNames = append(altNames, osName)
		}
		if instanceType == "control" || instanceType == "vrouter" {
			altNames = _addAltHostname(pod, instanceType, altNames)
		}
		podInfo := certificates.NewSubject(pod.Name, domain, pod.Spec.NodeName,
			pod.Status.PodIP, alternativeIPs, altNames, clientAuth)
		pods = append(pods, podInfo)
	}
	return pods
}

// GetConfigMap creates a config map based on the instance type.
func GetConfigMap(name, ns string, client client.Client) (*corev1.ConfigMap, error) {
	configMap := &corev1.ConfigMap{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: ns}, configMap)
	return configMap, err
}

func prepConfigData(instanceType string, data map[string]string, configMap *corev1.ConfigMap) {
	if configMap.Data == nil {
		configMap.Data = make(map[string]string)
	}
	for k, v := range data {
		configMap.Data[k] = v
	}
	configMap.Data["run-provisioner.sh"] = ProvisionerRunnerData(instanceType + "-provisioner")
	configMap.Data["run-nodemanager.sh"] = NodemanagerStartupScript()
}

// CreateConfigMap creates a config map based on the instance type.
func CreateConfigMap(
	configMapName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request,
	instanceType string,
	data map[string]string,
	object v1.Object) (*corev1.ConfigMap, error) {

	configMap, err := GetConfigMap(configMapName, request.Namespace, client)
	if err == nil {
		prepConfigData(instanceType, data, configMap)
		return configMap, client.Update(context.TODO(), configMap)
	}
	if !k8serrors.IsNotFound(err) {
		return nil, err
	}
	// TODO: Bug. If config map exists without labels and references, they won't be updated
	configMap.SetName(configMapName)
	configMap.SetNamespace(request.Namespace)
	configMap.SetLabels(map[string]string{"tf_manager": instanceType, instanceType: request.Name})
	prepConfigData(instanceType, data, configMap)
	if err = controllerutil.SetControllerReference(object, configMap, scheme); err != nil {
		return nil, err
	}
	if err = client.Create(context.TODO(), configMap); err != nil && !k8serrors.IsAlreadyExists(err) {
		return nil, err
	}
	return configMap, nil
}

// CreateSecretEx creates a secret based on the instance type.
func CreateSecretEx(secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request,
	instanceType string,
	data map[string][]byte,
	object v1.Object) (*corev1.Secret, error) {

	secret := &corev1.Secret{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: secretName, Namespace: request.Namespace}, secret)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			secret.SetName(secretName)
			secret.SetNamespace(request.Namespace)
			secret.SetLabels(map[string]string{"tf_manager": instanceType, instanceType: request.Name})
			secret.Data = data
			if err = controllerutil.SetControllerReference(object, secret, scheme); err != nil {
				return nil, err
			}
			if err = client.Create(context.TODO(), secret); err != nil && !k8serrors.IsAlreadyExists(err) {
				return nil, err
			}
		}
	}
	return secret, nil
}

func CreateSecret(secretName string,
	client client.Client,
	scheme *runtime.Scheme,
	request reconcile.Request,
	instanceType string,
	object v1.Object) (*corev1.Secret, error) {

	emptyData := make(map[string][]byte)
	return CreateSecretEx(secretName, client, scheme, request, instanceType, emptyData, object)
}

// PrepareSTS prepares the intended podList.
func PrepareSTS(sts *appsv1.StatefulSet,
	commonConfiguration *PodConfiguration,
	instanceType string,
	request reconcile.Request,
	scheme *runtime.Scheme,
	object v1.Object,
	usePralallePodManagementPolicy bool) error {

	SetSTSCommonConfiguration(sts, commonConfiguration)
	if usePralallePodManagementPolicy {
		sts.Spec.PodManagementPolicy = appsv1.PodManagementPolicyType("Parallel")
	} else {
		sts.Spec.PodManagementPolicy = appsv1.PodManagementPolicyType("OrderedReady")
	}
	baseName := request.Name + "-" + instanceType
	name := baseName + "-statefulset"
	sts.SetName(name)
	sts.SetNamespace(request.Namespace)
	labels := map[string]string{"tf_manager": instanceType, instanceType: request.Name}
	sts.SetLabels(labels)
	sts.Spec.Selector.MatchLabels = labels
	sts.Spec.Template.SetLabels(labels)

	if err := controllerutil.SetControllerReference(object, sts, scheme); err != nil {
		return err
	}
	return nil
}

// SetDeploymentCommonConfiguration takes common configuration parameters
// and applies it to the deployment.
func SetDeploymentCommonConfiguration(deployment *appsv1.Deployment,
	commonConfiguration *PodConfiguration) *appsv1.Deployment {
	var replicas = int32(1)
	deployment.Spec.Replicas = &replicas
	if len(commonConfiguration.Tolerations) > 0 {
		deployment.Spec.Template.Spec.Tolerations = commonConfiguration.Tolerations
	}
	if len(commonConfiguration.NodeSelector) > 0 {
		deployment.Spec.Template.Spec.NodeSelector = commonConfiguration.NodeSelector
	}

	if len(commonConfiguration.ImagePullSecrets) > 0 {
		imagePullSecretList := []corev1.LocalObjectReference{}
		for _, imagePullSecretName := range commonConfiguration.ImagePullSecrets {
			imagePullSecret := corev1.LocalObjectReference{
				Name: imagePullSecretName,
			}
			imagePullSecretList = append(imagePullSecretList, imagePullSecret)
		}
		deployment.Spec.Template.Spec.ImagePullSecrets = imagePullSecretList
	}
	return deployment
}

// SetSTSCommonConfiguration takes common configuration parameters
// and applies it to the pod.
func SetSTSCommonConfiguration(sts *appsv1.StatefulSet,
	commonConfiguration *PodConfiguration) {
	var replicas = int32(1)
	sts.Spec.Replicas = &replicas
	if len(commonConfiguration.Tolerations) > 0 {
		sts.Spec.Template.Spec.Tolerations = commonConfiguration.Tolerations
	}
	if len(commonConfiguration.NodeSelector) > 0 {
		sts.Spec.Template.Spec.NodeSelector = commonConfiguration.NodeSelector
	}

	if len(commonConfiguration.ImagePullSecrets) > 0 {
		imagePullSecretList := []corev1.LocalObjectReference{}
		for _, imagePullSecretName := range commonConfiguration.ImagePullSecrets {
			imagePullSecret := corev1.LocalObjectReference{
				Name: imagePullSecretName,
			}
			imagePullSecretList = append(imagePullSecretList, imagePullSecret)
		}
		sts.Spec.Template.Spec.ImagePullSecrets = imagePullSecretList
	}
}

func AddVolumesToPodSpec(spec *corev1.PodSpec, volumeConfigMapMap map[string]string) {
	volumeList := spec.Volumes
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
	spec.Volumes = volumeList
}

func AddHostMountsToPodSpec(spec *corev1.PodSpec, volumeConfigMapMap map[string]string) {
	volumeList := spec.Volumes
	var hostPathType corev1.HostPathType = corev1.HostPathDirectory
	for hostPath, volumeName := range volumeConfigMapMap {
		volume := corev1.Volume{
			Name: volumeName,
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: hostPath,
					Type: &hostPathType,
				},
			},
		}
		volumeList = append(volumeList, volume)
	}
	spec.Volumes = volumeList
}

// AddVolumesToIntendedSTS adds volumes to a deployment.
func AddVolumesToIntendedSTS(sts *appsv1.StatefulSet, volumeConfigMapMap map[string]string) {
	AddVolumesToPodSpec(&sts.Spec.Template.Spec, volumeConfigMapMap)
}

// AddVolumesToIntendedDS adds volumes to a deployment.
func AddVolumesToIntendedDS(ds *appsv1.DaemonSet, volumeConfigMapMap map[string]string) {
	AddVolumesToPodSpec(&ds.Spec.Template.Spec, volumeConfigMapMap)
}

// AddCAVolumeToIntendedSTS adds volumes to a deployment.
func AddCAVolumeToIntendedSTS(sts *appsv1.StatefulSet) {
	if certificates.ClientSignerName != certificates.ExternalSigner {
		AddVolumesToIntendedSTS(sts, map[string]string{
			certificates.CAConfigMapName: "ca-certs",
		})
	} else {
		AddHostMountsToPodSpec(&sts.Spec.Template.Spec, map[string]string{
			certificates.ExternalCAHostPath: "ca-certs",
		})
	}
}

// AddCAVolumeToIntendedDS adds volumes to a deployment.
func AddCAVolumeToIntendedDS(ds *appsv1.DaemonSet) {
	if certificates.ClientSignerName != certificates.ExternalSigner {
		AddVolumesToIntendedDS(ds, map[string]string{
			certificates.CAConfigMapName: "ca-certs",
		})
	} else {
		AddHostMountsToPodSpec(&ds.Spec.Template.Spec, map[string]string{
			certificates.ExternalCAHostPath: "ca-certs",
		})
	}
}

func AddCertsMounts(name string, container *corev1.Container) {
	container.VolumeMounts = append(container.VolumeMounts,
		corev1.VolumeMount{
			Name:      "ca-certs",
			MountPath: SignerCAMountPath,
			ReadOnly:  true,
		},
	)
	container.VolumeMounts = append(container.VolumeMounts,
		corev1.VolumeMount{
			Name:      name + "-secret-certificates",
			MountPath: "/etc/certificates",
			ReadOnly:  true,
		},
	)
}

func SetLogLevelEnv(logLevel string, container *corev1.Container) {
	container.Env = append(container.Env, corev1.EnvVar{Name: "LOG_LEVEL", Value: ConvertLogLevel(logLevel)})
}

func addSecretVolumeToPopSpec(spec *corev1.PodSpec, name string) {
	n := name + "-secret-certificates"
	if certificates.ClientSignerName != certificates.ExternalSigner {
		volume := corev1.Volume{
			Name: n,
			VolumeSource: corev1.VolumeSource{
				Secret: &corev1.SecretVolumeSource{
					SecretName: n,
				},
			},
		}
		spec.Volumes = append(spec.Volumes, volume)
	} else {
		AddHostMountsToPodSpec(spec, map[string]string{
			certificates.ExternalCertHostPath: n,
		})
	}
}

// AddSecretVolumesToIntendedSTS adds volumes to a deployment.
func AddSecretVolumesToIntendedSTS(sts *appsv1.StatefulSet, name string) {
	addSecretVolumeToPopSpec(&sts.Spec.Template.Spec, name)
}

// AddSecretVolumesToIntendedDS adds volumes to a deployment.
func AddSecretVolumesToIntendedDS(ds *appsv1.DaemonSet, name string) {
	addSecretVolumeToPopSpec(&ds.Spec.Template.Spec, name)
}

// QuerySTS queries the STS
func QuerySTS(name string, namespace string, reconcileClient client.Client) (*appsv1.StatefulSet, error) {
	sts := &appsv1.StatefulSet{}
	err := reconcileClient.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, sts)
	if err != nil {
		return nil, err
	}
	return sts, nil
}

// CreateServiceSTS creates the service STS, if it is not exists.
func CreateServiceSTS(instance v1.Object,
	instanceType string,
	sts *appsv1.StatefulSet,
	cl client.Client,
) (created bool, err error) {
	created, err = false, nil
	stsName := instance.GetName() + "-" + instanceType + "-statefulset"
	stsNamespace := instance.GetNamespace()
	if _, err = QuerySTS(stsName, stsNamespace, cl); err == nil || !k8serrors.IsNotFound(err) {
		return
	}
	var replicas int32
	if replicas, err = GetReplicas(cl, sts.Spec.Template.Spec.NodeSelector); err == nil {
		sts.Name = stsName
		sts.Namespace = stsNamespace
		sts.Spec.Replicas = &replicas
		if err = cl.Create(context.TODO(), sts); err == nil {
			created = true
		}
	}
	return
}

func _contains(name string, containers []corev1.Container) bool {
	for _, c := range containers {
		if name == c.Name {
			return true
		}
	}
	return false
}

func _diff(first, second []corev1.Container) (added []string, deleted []string) {
	added = []string{}
	deleted = []string{}
	for _, c := range first {
		if !_contains(c.Name, second) {
			deleted = append(deleted, c.Name)
		}
	}
	for _, c := range second {
		if !_contains(c.Name, first) {
			added = append(added, c.Name)
		}
	}
	return
}

func _containersChanged(first []corev1.Container,
	second []corev1.Container,
) (changed bool) {
	logger := log.WithName("containerDiff")
	for _, container1 := range first {
		for _, container2 := range second {
			if container1.Name == container2.Name {
				if container1.Image != container2.Image {
					changed = true
					logger.Info("Image changed",
						"Container", container1.Name,
						"Current Image", container1.Image,
						"Intended Image", container2.Image,
					)
					break
				}
				sort.SliceStable(
					container1.Env,
					func(i, j int) bool { return container1.Env[i].Name < container1.Env[j].Name })
				sort.SliceStable(
					container2.Env,
					func(i, j int) bool { return container2.Env[i].Name < container2.Env[j].Name })
				if !cmp.Equal(
					container1.Env,
					container2.Env,
					cmpopts.IgnoreFields(corev1.ObjectFieldSelector{}, "APIVersion"),
				) {
					changed = true
					logger.Info("Env changed",
						"Container", container1.Name,
						"Container Env", container1.Env,
						"Intended Env", container2.Env,
					)
					break
				}
			}
		}
	}
	return

}

// TODO: Make it more intellectual. Now it's checks only images and envs.
func containersChanged(first *corev1.PodTemplateSpec,
	second *corev1.PodTemplateSpec,
) (changed bool) {
	changed = false
	logger := log.WithName("containersChanged")
	// check if same containers
	if added, deleted := _diff(first.Spec.Containers, second.Spec.Containers); len(added) != 0 || len(deleted) != 0 {
		changed = true
		logger.Info("Containers changed",
			"Added containers", added,
			"Deleted containers", deleted,
		)
		return
	}
	// same containers, check images and env variables
	if changed = _containersChanged(first.Spec.Containers, second.Spec.Containers); changed {
		return
	}
	changed = _containersChanged(first.Spec.InitContainers, second.Spec.InitContainers)
	return
}

// UpdateSafeSTS query existing statefulset and add to it allowed fields.
// Allowed fileds are template, replicas and updateStrategy (k8s restrinction).
// Template will be updated just in case when some container images or container env changed (or use force).
// Nil values to leave fields unchanged.
func UpdateSTS(stsName string,
	instanceType string,
	namespace string,
	template *corev1.PodTemplateSpec,
	strategy *appsv1.StatefulSetUpdateStrategy,
	force bool,
	cl client.Client,
) (updated bool, err error) {

	name := stsName + "-" + instanceType + "-statefulset"

	updated, err = false, nil
	logger := log.WithName("UpdateSTS").WithName(name)

	sts, err := QuerySTS(name, namespace, cl)
	if sts == nil || err != nil {
		logger.Error(err, "Failed to get the stateful set",
			"Name", name,
			"Namespace", namespace,
		)
		return
	}

	changed := false
	if force || containersChanged(&sts.Spec.Template, template) {
		logger.Info("Some of container images or env changed, or force mode", "force", force)
		changed = true
		sts.Spec.Template = *template
	}

	if !changed && !cmp.Equal(sts.Spec.Template.Spec.NodeSelector, template.Spec.NodeSelector) {
		sts.Spec.Template.Spec.NodeSelector = template.Spec.NodeSelector
		logger.Info("nodeSelector changed")
		changed = true
	}

	replicas, err := GetReplicas(cl, template.Spec.NodeSelector)
	if err != nil {
		return
	}

	if replicas != *sts.Spec.Replicas {
		if replicas < *sts.Spec.Replicas {
			logger.Info("To reduce replicas delete STS manually", "Current", *sts.Spec.Replicas, "Intended", replicas)
		} else {
			logger.Info("Replicas changed", "Current", *sts.Spec.Replicas, "Intended", replicas)
			changed = true
			sts.Spec.Replicas = &replicas
		}
	}

	if strategy != nil && !reflect.DeepEqual(strategy, &sts.Spec.UpdateStrategy) {
		logger.Info("Update strategy changed")
		changed = true
		sts.Spec.UpdateStrategy = *strategy
	}

	if !changed {
		return
	}
	sts.Spec.Template.Labels["change-at"] = time.Now().Format("2006-01-02-15-04-05")

	if err = cl.Update(context.TODO(), sts); err != nil {
		return
	}

	if sts.Spec.UpdateStrategy.Type == appsv1.OnDeleteStatefulSetStrategyType {
		logger.Info("Update OnDelete strategy")
		opts := &client.DeleteAllOfOptions{}
		opts.Namespace = namespace
		opts.LabelSelector = labelSelector(stsName, instanceType)
		pod := &corev1.Pod{}
		if err = cl.DeleteAllOf(context.TODO(), pod, opts); err != nil {
			return
		}
	}

	logger.Info("Update done")
	updated = true
	return
}

func RollingUpdateStrategy() *appsv1.StatefulSetUpdateStrategy {
	zero := int32(0)
	return &appsv1.StatefulSetUpdateStrategy{
		Type: appsv1.RollingUpdateStatefulSetStrategyType,
		RollingUpdate: &appsv1.RollingUpdateStatefulSetStrategy{
			Partition: &zero,
		},
	}
}

// UpdateServiceSTS safe update for service statefulsets
func UpdateServiceSTS(instance v1.Object,
	instanceType string,
	sts *appsv1.StatefulSet,
	force bool,
	clnt client.Client,
) (updated bool, err error) {
	stsName := instance.GetName()
	stsNamespace := instance.GetNamespace()
	stsTemplate := sts.Spec.Template
	updated, err = UpdateSTS(stsName, instanceType, stsNamespace, &stsTemplate, &sts.Spec.UpdateStrategy, force, clnt)
	return
}

// SetInstanceActive sets the instance to active.
func SetInstanceActive(client client.Client, activeStatus *bool, degradedStatus *bool, sts *appsv1.StatefulSet, request reconcile.Request, object runtime.Object) error {
	if err := client.Get(context.TODO(), types.NamespacedName{Name: sts.Name, Namespace: request.Namespace},
		sts); err != nil {
		return err
	}
	active := false
	if sts.Status.ReadyReplicas == *sts.Spec.Replicas {
		active = true
	}
	degraded := sts.Status.ReadyReplicas < *sts.Spec.Replicas

	*activeStatus = active
	*degradedStatus = degraded
	if err := client.Status().Update(context.TODO(), object); err != nil {
		return err
	}
	return nil
}

func GetPodsHostname(c client.Client, pod *corev1.Pod) (string, error) {
	n := corev1.Node{}
	if err := c.Get(context.Background(), types.NamespacedName{Name: pod.Spec.NodeName}, &n); err != nil {
		return "", err
	}

	for _, a := range n.Status.Addresses {
		if a.Type == corev1.NodeHostName {
			// TODO: until moved to latest operator framework FQDN for pod is not available
			// so, artificially use FQDN based on host domain
			// TODO: commonize things between pods
			dnsDomain, err := ClusterDNSDomain(c)
			if err != nil || dnsDomain == "" || strings.HasSuffix(a.Address, dnsDomain) {
				return a.Address, nil
			}
			return a.Address + "." + dnsDomain, nil
		}
	}

	return "", errors.New("couldn't get pods hostname")
}

// UpdateAnnotations add hostname to annotation for pod.
func UpdatePodAnnotations(pod *corev1.Pod, client client.Client) (updated bool, err error) {
	updated = false
	err = nil

	annotationMap := pod.GetAnnotations()
	if annotationMap == nil {
		annotationMap = make(map[string]string)
	}

	hostname, err := GetPodsHostname(client, pod)
	if err != nil {
		return
	}

	hostnameFromAnnotation, ok := annotationMap["hostname"]
	if !ok || hostnameFromAnnotation != hostname {
		annotationMap["hostname"] = hostname
		pod.SetAnnotations(annotationMap)
		if err = client.Update(context.TODO(), pod); err != nil {
			return
		}
		updated = true
		return
	}
	return
}

// UpdatePodsAnnotations add hostname to annotations for pods in list.
func UpdatePodsAnnotations(podList []corev1.Pod, client client.Client) (updated bool, err error) {
	updated = false
	err = nil

	for _, pod := range podList {
		_updated, _err := UpdatePodAnnotations(&pod, client)
		if _err != nil {
			updated = _updated
			err = _err
			return
		}
		updated = updated || _updated
	}

	return
}

// GetDataAddresses gets ip addresses of Control pods in data network
func GetDataAddresses(pod *corev1.Pod, instanceType string, cidr string) (string, error) {
	// TODO: hack: somehow either rename instance or container
	// this is because vrouter agent container and object instance type are not same like for control
	instanceToContainerMap := map[string]string{
		"vrouter": "vrouteragent",
	}
	container := instanceType
	if c, ok := instanceToContainerMap[instanceType]; ok {
		container = c
	}
	command := "ip address | awk '/inet /{print $2}' | cut -d '/' -f1"
	stdout, _, err := ExecToContainer(pod, container, []string{"/usr/bin/bash", "-c", command}, nil)
	if err != nil {
		return stdout, fmt.Errorf("failed to get IP adresses for POD %s (err=%+v)", pod.Name, err)
	}
	var ip_addresses []string
	scanner := bufio.NewScanner(strings.NewReader(string(stdout)))
	for scanner.Scan() {
		ip_addresses = append(ip_addresses, scanner.Text())
	}
	_, network, err := net.ParseCIDR(cidr)
	if err != nil {
		return stdout, fmt.Errorf("dataSubnet CIDR is invalid %s (err=%+v)", cidr, err)
	}
	for _, ip := range ip_addresses {
		if network.Contains(net.ParseIP(ip)) {
			return ip, nil
		}
	}

	return "", nil
}

func labelSelector(ownerName, instanceType string) labels.Selector {
	return labels.SelectorFromSet(map[string]string{
		"tf_manager": instanceType,
		instanceType: ownerName})
}

func listOptions(ownerName, instanceType, namespace string) *client.ListOptions {
	return &client.ListOptions{Namespace: namespace, LabelSelector: labelSelector(ownerName, instanceType)}
}

func SelectPods(ownerName, instanceType, namespace string, clnt client.Client) (*corev1.PodList, error) {
	listOps := listOptions(ownerName, instanceType, namespace)
	pods := &corev1.PodList{}
	err := clnt.List(context.TODO(), pods, listOps)
	return pods, err
}

func GetNodes(labelSelector map[string]string, c client.Client) ([]corev1.Node, error) {
	nodeList := &corev1.NodeList{}
	var labels client.MatchingLabels = labelSelector
	if err := c.List(context.Background(), nodeList, labels); err != nil {
		return nil, err
	}
	return nodeList.Items, nil
}

// GetAnalyticsNodes returns analytics nodes list (str comma separated)
func GetAnalyticsNodes(ns string, clnt client.Client) (string, error) {
	cfg, err := NewAnalyticsClusterConfiguration(AnalyticsInstance, ns, clnt)
	if err != nil && !k8serrors.IsNotFound(err) {
		return "", err
	}
	return configtemplates.JoinListWithSeparator(cfg.AnalyticsServerIPList, ","), nil

}

func GetAnalyticsAlarmNodes(ns string, clnt client.Client) ([]string, error) {
	cfg, err := NewAnalyticsAlarmClusterConfiguration(AnalyticsAlarmInstance, ns, clnt)
	if err != nil && !k8serrors.IsNotFound(err) {
		return nil, err
	}
	return cfg.AnalyticsAlarmServerIPList, nil
}

func GetControllerNodes(c client.Client) ([]corev1.Node, error) {
	return GetNodes(map[string]string{"node-role.kubernetes.io/master": ""}, c)
}

// GetConfigNodes requests config api nodes
func GetConfigNodes(ns string, clnt client.Client) (string, error) {
	cfg, err := NewConfigClusterConfiguration(ConfigInstance, ns, clnt)
	if err != nil && !k8serrors.IsNotFound(err) {
		return "", err
	}
	return configtemplates.JoinListWithSeparator(cfg.APIServerIPList, ","), nil
}

// GetControlNodes returns control nodes list (str comma separated)
func GetControlNodes(ns string, controlName string, cidr string, clnt client.Client) (string, error) {
	control := &Control{}
	if err := clnt.Get(context.TODO(), types.NamespacedName{
		Namespace: ns,
		Name:      controlName,
	}, control); k8serrors.IsNotFound(err) {
		return "", nil
	} else if err != nil {
		return "", err
	}
	var ipList []string
	for _, node := range control.Status.Nodes {
		if cidr != "" {
			_, network, _ := net.ParseCIDR(cidr)
			if !network.Contains(net.ParseIP(node.IP)) {
				continue
			}
		}
		ipList = append(ipList, info2node(node))
	}
	sort.Strings(ipList)
	return strings.Join(ipList, ","), nil
}

// GetHostname depending on existance of dataSubnet
func GetHostname(pod *corev1.Pod, instanceType string, cidr string) (string, error) {
	logger := log.WithName("GetHostname")

	hostname := pod.Annotations["hostname"]
	if cidr != "" {
		ip, err := GetDataAddresses(pod, instanceType, cidr)
		if err != nil {
			return "", err
		}
		var names []string
		if names, err = net.LookupAddr(ip); err != nil {
			return "", fmt.Errorf("failed to resolve FQDN for IP %s (err=%+v)", ip, err)
		}
		sort.SliceStable(names, func(i, j int) bool { return len(names[i]) > len(names[j]) })
		hostname = removeLastDot(names[0])
	}
	logger.Info("Hostname in subnet",
		"CIDR", cidr,
		"hostname", hostname,
	)
	return hostname, nil
}

func removeLastDot(v string) string {
	sz := len(v)
	if sz > 0 && v[sz-1] == '.' {
		return v[:sz-1]
	}
	return v
}

// PodIPListAndIPMapFromInstance gets a list with POD IPs and a map of POD names and IPs.
// TODO: Implement selection of returning either ip's or hostnames
func PodIPListAndIPMapFromInstance(instanceType string,
	request reconcile.Request,
	clnt client.Client, datanetwork string) ([]corev1.Pod, map[string]NodeInfo, error) {

	allPods, err := SelectPods(request.Name, instanceType, request.Namespace, clnt)
	if err != nil || len(allPods.Items) == 0 {
		return nil, nil, err
	}

	var podNameIPMap = make(map[string]NodeInfo)
	var podList = []corev1.Pod{}
	for idx := range allPods.Items {
		pod := &allPods.Items[idx]
		if pod.Status.PodIP == "" || (pod.Status.Phase != "Running" && pod.Status.Phase != "Pending") {
			continue
		}
		podIP := pod.Status.PodIP
		hostname := pod.Annotations["hostname"]
		if datanetwork != "" {
			ip, err := GetDataAddresses(pod, instanceType, datanetwork)
			if err != nil {
				return nil, nil, err
			}
			var names []string
			if names, err = net.LookupAddr(ip); err != nil {
				return nil, nil, fmt.Errorf("failed to resolve FQDN for IP %s (err=%+v)", ip, err)
			}
			sort.SliceStable(names, func(i, j int) bool { return len(names[i]) > len(names[j]) })
			podIP = ip
			hostname = removeLastDot(names[0])
		}
		podNameIPMap[pod.Name] = NodeInfo{IP: podIP, Hostname: hostname}
		podList = append(podList, *pod)
	}
	sort.SliceStable(podList, func(i, j int) bool { return podList[i].Name < podList[j].Name })
	return podList, podNameIPMap, nil
}

func pod2node(pod corev1.Pod) string {
	if k8s.IsOpenshift() {
		return pod.Status.PodIP
	}
	return pod.Annotations["hostname"]
}

func info2node(node NodeInfo) string {
	if k8s.IsOpenshift() {
		return node.IP
	}
	return node.Hostname
}

func info2nodes(nodes map[string]NodeInfo) []string {
	res := []string{}
	if nodes != nil {
		for _, node := range nodes {
			res = append(res, info2node(node))
		}
		sort.SliceStable(res, func(i, j int) bool { return res[i] < res[j] })
	}
	return res
}

func pods2nodes(podList []corev1.Pod) []string {
	var nodes []string
	for _, pod := range podList {
		nodes = append(nodes, pod2node(pod))
	}
	sort.SliceStable(nodes, func(i, j int) bool { return nodes[i] < nodes[j] })
	return nodes
}

// NewCassandraClusterConfiguration gets a struct containing various representations of Cassandra nodes string.
func NewCassandraClusterConfiguration(name string, namespace string, client client.Client) (CassandraClusterConfiguration, error) {
	instance := &Cassandra{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return CassandraClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := CassandraClusterConfiguration{
		Port:         *config.Port,
		CQLPort:      *config.CqlPort,
		JMXPort:      *config.JmxLocalPort,
		ServerIPList: nodes,
	}
	return clusterConfig, nil
}

// NewControlClusterConfiguration gets a struct containing various representations of Control nodes string.
func NewControlClusterConfiguration(name string, namespace string, myclient client.Client) (ControlClusterConfiguration, error) {
	instance := &Control{}
	err := myclient.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return ControlClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := ControlClusterConfiguration{
		XMPPPort:            *config.XMPPPort,
		BGPPort:             *config.BGPPort,
		DNSPort:             *config.DNSPort,
		DNSIntrospectPort:   *config.DNSIntrospectPort,
		ControlServerIPList: nodes,
	}

	return clusterConfig, nil
}

// NewZookeeperClusterConfiguration gets a struct containing various representations of Zookeeper nodes string.
func NewZookeeperClusterConfiguration(name, namespace string, client client.Client) (ZookeeperClusterConfiguration, error) {
	instance := &Zookeeper{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return ZookeeperClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := ZookeeperClusterConfiguration{
		ClientPort:   *config.ClientPort,
		ServerIPList: nodes,
	}
	return clusterConfig, nil
}

// NewRabbitmqClusterConfiguration gets a struct containing various representations of Rabbitmq nodes string.
func NewRabbitmqClusterConfiguration(name, namespace string, client client.Client) (RabbitmqClusterConfiguration, error) {
	instance := &Rabbitmq{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return RabbitmqClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	instance.ConfigurationParameters()
	clusterConfig := RabbitmqClusterConfiguration{
		Port:         *instance.Spec.ServiceConfiguration.Port,
		ServerIPList: nodes,
		Secret:       instance.Status.Secret,
	}
	return clusterConfig, nil
}

// NewAnalyticsClusterConfiguration gets a struct containing various representations of Analytics nodes string.
func NewAnalyticsClusterConfiguration(name, namespace string, client client.Client) (AnalyticsClusterConfiguration, error) {
	instance := &Analytics{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return AnalyticsClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := AnalyticsClusterConfiguration{
		AnalyticsServerIPList: nodes,
		AnalyticsServerPort:   *config.AnalyticsPort,
		AnalyticsDataTTL:      *config.AnalyticsDataTTL,
		CollectorServerIPList: nodes,
		CollectorPort:         *config.CollectorPort,
	}
	return clusterConfig, nil
}

func NewAnalyticsAlarmClusterConfiguration(name, namespace string, client client.Client) (AnalyticsAlarmClusterConfiguration, error) {
	instance := &AnalyticsAlarm{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return AnalyticsAlarmClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	clusterConfig := AnalyticsAlarmClusterConfiguration{
		AnalyticsAlarmServerIPList: nodes,
	}
	return clusterConfig, nil
}

// NewQueryEngineClusterConfiguration gets a struct containing various representations of QueryEngine nodes string.
func NewQueryEngineClusterConfiguration(name, namespace string, client client.Client) (QueryEngineClusterConfiguration, error) {
	instance := &QueryEngine{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return QueryEngineClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := QueryEngineClusterConfiguration{
		QueryEngineServerIPList: nodes,
		QueryEngineServerPort:   *config.AnalyticsdbPort,
	}
	return clusterConfig, nil
}

// NewConfigClusterConfiguration gets a struct containing various representations of Config nodes string.
func NewConfigClusterConfiguration(name, namespace string, client client.Client) (ConfigClusterConfiguration, error) {
	instance := &Config{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return ConfigClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := ConfigClusterConfiguration{
		APIServerPort:   *config.APIPort,
		APIServerIPList: nodes,
	}
	return clusterConfig, nil
}

// NewRedisClusterConfiguration gets a struct containing various representations of Redis nodes string.
func NewRedisClusterConfiguration(name, namespace string, client client.Client) (RedisClusterConfiguration, error) {
	instance := &Redis{}
	err := client.Get(context.TODO(), types.NamespacedName{Name: name, Namespace: namespace}, instance)
	if err != nil {
		return RedisClusterConfiguration{}, err
	}
	nodes := info2nodes(instance.Status.Nodes)
	config := instance.ConfigurationParameters()
	clusterConfig := RedisClusterConfiguration{
		ServerIPList: nodes,
		ServerPort:   *config.RedisPort,
	}
	return clusterConfig, nil
}

// AnalyticsConfiguration  stores all information about service's endpoints
// under the Contrail Analytics
type AnalyticsClusterConfiguration struct {
	AnalyticsServerPort   int      `json:"analyticsServerPort,omitempty"`
	AnalyticsServerIPList []string `json:"analyticsServerIPList,omitempty"`
	AnalyticsDataTTL      int      `json:"analyticsDataTTL,omitempty"`
	CollectorPort         int      `json:"collectorPort,omitempty"`
	CollectorServerIPList []string `json:"collectorServerIPList,omitempty"`
}

type AnalyticsAlarmClusterConfiguration struct {
	AnalyticsAlarmServerIPList []string `json:"analyticsAlarmServerIPList,omitempty"`
}

// QueryEngineConfiguration  stores all information about service's endpoints
// under the Contrail AnalyticsDB query engine
type QueryEngineClusterConfiguration struct {
	QueryEngineServerPort   int      `json:"analyticsdbServerPort,omitempty"`
	QueryEngineServerIPList []string `json:"analyticsdbServerIPList,omitempty"`
}

// ConfigClusterConfiguration  stores all information about service's endpoints
// under the Contrail Config
type ConfigClusterConfiguration struct {
	APIServerPort   int      `json:"apiServerPort,omitempty"`
	APIServerIPList []string `json:"apiServerIPList,omitempty"`
}

// AnalyticsConfiguration  stores all information about service's endpoints
// under the Contrail Analytics
type RedisClusterConfiguration struct {
	ServerPort   int      `json:"redisServerPort,omitempty"`
	ServerIPList []string `json:"redisServerIPList,omitempty"`
}

// FillWithDefaultValues sets the default port values if they are set to the
// zero value
func (c *AnalyticsClusterConfiguration) FillWithDefaultValues() {
	if c.AnalyticsServerPort == 0 {
		c.AnalyticsServerPort = AnalyticsApiPort
	}
	if c.AnalyticsDataTTL == 0 {
		c.AnalyticsDataTTL = AnalyticsDataTTL
	}
	if c.CollectorPort == 0 {
		c.CollectorPort = CollectorPort
	}
}

// FillWithDefaultValues sets the default port values if they are set to the
// zero value
func (c *QueryEngineClusterConfiguration) FillWithDefaultValues() {
	if c.QueryEngineServerPort == 0 {
		c.QueryEngineServerPort = AnalyticsdbPort
	}
}

// FillWithDefaultValues sets the default port values if they are set to the
// zero value
func (c *ConfigClusterConfiguration) FillWithDefaultValues() {
	if c.APIServerPort == 0 {
		c.APIServerPort = ConfigApiPort
	}
}

// ControlClusterConfiguration stores all information about services' endpoints
// under the Contrail Control
type ControlClusterConfiguration struct {
	XMPPPort            int      `json:"xmppPort,omitempty"`
	BGPPort             int      `json:"bgpPort,omitempty"`
	DNSPort             int      `json:"dnsPort,omitempty"`
	DNSIntrospectPort   int      `json:"dnsIntrospectPort,omitempty"`
	ControlServerIPList []string `json:"controlServerIPList,omitempty"`
}

// FillWithDefaultValues sets the default port values if they are set to the
// zero value
func (c *ControlClusterConfiguration) FillWithDefaultValues() {
	if c.XMPPPort == 0 {
		c.XMPPPort = XmppServerPort
	}
	if c.BGPPort == 0 {
		c.BGPPort = BgpPort
	}
	if c.DNSPort == 0 {
		c.DNSPort = DnsServerPort
	}
	if c.DNSIntrospectPort == 0 {
		c.DNSIntrospectPort = DnsIntrospectPort
	}
}

// ZookeeperClusterConfiguration stores all information about Zookeeper's endpoints.
type ZookeeperClusterConfiguration struct {
	ClientPort   int      `json:"clientPort,omitempty"`
	ServerPort   int      `json:"serverPort,omitempty"`
	ElectionPort int      `json:"electionPort,omitempty"`
	ServerIPList []string `json:"serverIPList,omitempty"`
}

// FillWithDefaultValues fills Zookeeper config with default values
func (c *ZookeeperClusterConfiguration) FillWithDefaultValues() {
	if c.ClientPort == 0 {
		c.ClientPort = ZookeeperPort
	}
	if c.ElectionPort == 0 {
		c.ElectionPort = ZookeeperElectionPort
	}
	if c.ServerPort == 0 {
		c.ServerPort = ZookeeperServerPort
	}
}

// RabbitmqClusterConfiguration stores all information about Rabbitmq's endpoints.
type RabbitmqClusterConfiguration struct {
	Port         int      `json:"port,omitempty"`
	ServerIPList []string `json:"serverIPList,omitempty"`
	Secret       string   `json:"secret,omitempty"`
}

// FillWithDefaultValues fills Rabbitmq config with default values
func (c *RabbitmqClusterConfiguration) FillWithDefaultValues() {
	if c.Port == 0 {
		c.Port = RabbitmqNodePort
	}
}

// CassandraClusterConfiguration stores all information about Cassandra's endpoints.
type CassandraClusterConfiguration struct {
	Port         int      `json:"port,omitempty"`
	CQLPort      int      `json:"cqlPort,omitempty"`
	JMXPort      int      `json:"jmxPort,omitempty"`
	ServerIPList []string `json:"serverIPList,omitempty"`
}

// FillWithDefaultValues fills Cassandra config with default values
func (c *CassandraClusterConfiguration) FillWithDefaultValues() {
	if c.CQLPort == 0 {
		c.CQLPort = CassandraCqlPort
	}
	if c.JMXPort == 0 {
		c.JMXPort = CassandraJmxLocalPort
	}
	if c.Port == 0 {
		c.Port = CassandraPort
	}
}

// ProvisionerEnvData returns provisioner env data
func ProvisionerEnvData(clusterNodes *ClusterNodes, hostname string, authParams AuthParameters) string {
	return ProvisionerEnvDataEx(clusterNodes, hostname, authParams, "", "", "")
}

// ProvisionerEnvDataEx returns provisioner env data for vrouter case
func ProvisionerEnvDataEx(
	clusterNodes *ClusterNodes, hostname string, authParams AuthParameters,
	physicalInterface, vrouterGateway, l3mhCidr string) string {

	var bufEnv bytes.Buffer
	err := templates.ProvisionerConfig.Execute(&bufEnv, struct {
		ClusterNodes           ClusterNodes
		Hostname               string
		SignerCAFilepath       string
		Retries                string
		Delay                  string
		AuthMode               AuthenticationMode
		KeystoneAuthParameters KeystoneAuthParameters
		PhysicalInterface      string
		VrouterGateway         string
		L3MHCidr               string
	}{
		ClusterNodes:           *clusterNodes,
		Hostname:               hostname,
		SignerCAFilepath:       SignerCAFilepath,
		AuthMode:               authParams.AuthMode,
		KeystoneAuthParameters: authParams.KeystoneAuthParameters,
		PhysicalInterface:      physicalInterface,
		VrouterGateway:         vrouterGateway,
		L3MHCidr:               l3mhCidr,
	})
	if err != nil {
		panic(err)
	}
	return bufEnv.String()
}

func ProvisionerRunnerData(configMapName string) string {
	var bufRun bytes.Buffer
	err := templates.ProvisionerRunner.Execute(&bufRun, struct {
		ConfigName string
	}{
		ConfigName: configMapName + ".env",
	})
	if err != nil {
		panic(err)
	}
	return bufRun.String()
}

// RemoveProvisionerConfigMapData update provisioner data in config map
func RemoveProvisionerConfigMapData(configMapName string, configMap *corev1.ConfigMap) {
	delete(configMap.Data, configMapName+".env")
}

// ExecCmdInContainer runs command inside a container
func ExecCmdInContainer(pod *corev1.Pod, containerName string, command []string) (stdout, stderr string, err error) {
	stdout, stderr, err = k8s.ExecToPodThroughAPI(command,
		containerName,
		pod.ObjectMeta.Name,
		pod.ObjectMeta.Namespace,
		nil,
	)
	return
}

// SendSignal signal to main container process with pid 1
func SendSignal(pod *corev1.Pod, containerName, signal string) (stdout, stderr string, err error) {
	return ExecCmdInContainer(
		pod,
		containerName,
		[]string{"/usr/bin/bash", "-c", "kill -" + signal + " $(cat /service.pid.reload) || kill -" + signal + " 1"},
	)
}

// CombinedError provides a combined errors object for comfort logging
type CombinedError struct {
	errors []error
}

func (e *CombinedError) Error() string {
	var res string
	if e != nil {
		res = "CombinedError:\n"
		for _, s := range e.errors {
			res = res + fmt.Sprintf("%s\n", s)
		}
	}
	return res
}

// EncryptString returns sha
func EncryptString(str string) string {
	h := sha1.New()
	_, _ = io.WriteString(h, str)
	key := hex.EncodeToString(h.Sum(nil))
	return string(key)
}

// ExecToContainer uninterractively exec to the vrouteragent container.
func ExecToContainer(pod *corev1.Pod, container string, command []string, stdin io.Reader) (string, string, error) {
	stdout, stderr, err := k8s.ExecToPodThroughAPI(command,
		container,
		pod.ObjectMeta.Name,
		pod.ObjectMeta.Namespace,
		stdin,
	)
	return stdout, stderr, err
}

// ContainerFileSha gets sha of file from a container
func ContainerFileSha(pod *corev1.Pod, container string, path string) (string, error) {
	command := []string{"bash", "-c", fmt.Sprintf("[ ! -e %s ] || /usr/bin/sha1sum %s", path, path)}
	stdout, _, err := ExecToContainer(pod, container, command, nil)
	shakey := strings.Split(stdout, " ")[0]
	return shakey, err
}

// ContainerFileChanged checks file content
func ContainerFileChanged(pod *corev1.Pod, container string, path string, content string) (bool, error) {
	shakey1, err := ContainerFileSha(pod, container, path)
	if err != nil {
		return false, err
	}
	shakey2 := EncryptString(content)
	return shakey1 == shakey2, nil
}

// AddCommonVolumes append common volumes and mounts
func AddCommonVolumes(podSpec *corev1.PodSpec, configuration PodConfiguration) {
	commonVolumes := []corev1.Volume{
		{
			Name: "etc-hosts",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/etc/hosts",
				},
			},
		},
		{
			Name: "etc-resolv",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/etc/resolv.conf",
				},
			},
		},
		{
			Name: "etc-timezone",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/etc/timezone",
				},
			},
		},
		{
			Name: "etc-localtime",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/etc/localtime",
				},
			},
		},
		// each sts / ds needs to provide such volume with own specific path
		// as they use own entrypoint instead of contrail-entrypoint.sh from containers
		// {
		// 	Name: "contrail-logs",
		// 	VolumeSource: core.VolumeSource{
		// 		HostPath: &core.HostPathVolumeSource{
		// 			Path: "/var/log/contrail",
		// 		},
		// 	},
		// },
		{
			Name: "var-crashes",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/var/crashes",
				},
			},
		},
	}
	commonMounts := []corev1.VolumeMount{
		{
			Name:      "etc-hosts",
			MountPath: "/etc/hosts",
			ReadOnly:  true,
		},
		{
			Name:      "etc-resolv",
			MountPath: "/etc/resolv.conf",
			ReadOnly:  true,
		},
		{
			Name:      "etc-timezone",
			MountPath: "/etc/timezone",
			ReadOnly:  true,
		},
		{
			Name:      "etc-localtime",
			MountPath: "/etc/localtime",
			ReadOnly:  true,
		},
		{
			Name:      "var-crashes",
			MountPath: "/var/crashes",
		},
	}

	podSpec.Volumes = append(podSpec.Volumes, commonVolumes...)
	for _, v := range podSpec.Volumes {
		if v.Name == "contrail-logs" {
			commonMounts = append(commonMounts,
				corev1.VolumeMount{
					Name:      "contrail-logs",
					MountPath: "/var/log/contrail",
				})
		}
	}

	for idx := range podSpec.Containers {
		c := &podSpec.Containers[idx]
		c.VolumeMounts = append(c.VolumeMounts, commonMounts...)
	}
	for idx := range podSpec.InitContainers {
		c := &podSpec.InitContainers[idx]
		c.VolumeMounts = append(c.VolumeMounts, commonMounts...)
	}

	AddNodemanagerVolumes(podSpec, configuration)
}

// AddNodemanagerVolumes append common volumes and mounts
// - /var/run:/var/run:z
// - /run/runc:/run/runc:z
// - /sys/fs/cgroup:/sys/fs/cgroup:ro
// - /sys/fs/selinux:/sys/fs/selinux
// - /var/lib/containers:/var/lib/containers:shared
func AddNodemanagerVolumes(podSpec *corev1.PodSpec, configuration PodConfiguration) {
	nodemgrVolumes := []corev1.Volume{
		{
			Name: "var-run",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/var/run",
				},
			},
		},
		{
			Name: "run-runc",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/run/runc",
				},
			},
		},
		{
			Name: "sys-fs-cgroups",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/sys/fs/cgroup",
				},
			},
		},
		{
			Name: "var-lib-containers",
			VolumeSource: corev1.VolumeSource{
				HostPath: &corev1.HostPathVolumeSource{
					Path: "/var/lib/containers",
				},
			},
		},
	}

	var sharedMode corev1.MountPropagationMode = "Bidirectional"
	nodemgrMounts := []corev1.VolumeMount{
		{
			Name:      "var-run",
			MountPath: "/var/run",
		},
		{
			Name:      "run-runc",
			MountPath: "/run/runc",
		},
		{
			Name:      "sys-fs-cgroups",
			MountPath: "/sys/fs/cgroup",
			ReadOnly:  true,
		},
		{
			Name:             "var-lib-containers",
			MountPath:        "/var/lib/containers",
			MountPropagation: &sharedMode,
		},
	}

	if configuration.Distribution == nil || *configuration.Distribution != UBUNTU {
		nodemgrMounts = append(nodemgrMounts,
			corev1.VolumeMount{
				Name:      "sys-fs-selinux",
				MountPath: "/sys/fs/selinux",
			})
		nodemgrVolumes = append(nodemgrVolumes,
			corev1.Volume{
				Name: "sys-fs-selinux",
				VolumeSource: corev1.VolumeSource{
					HostPath: &corev1.HostPathVolumeSource{
						Path: "/sys/fs/selinux",
					},
				},
			})
	}

	hasNodemgr := false
	for idx := range podSpec.Containers {
		if strings.HasPrefix(podSpec.Containers[idx].Name, "nodemanager") {
			hasNodemgr = true
			c := &podSpec.Containers[idx]
			c.VolumeMounts = append(c.VolumeMounts, nodemgrMounts...)
		}
	}
	if hasNodemgr {
		podSpec.Volumes = append(podSpec.Volumes, nodemgrVolumes...)
	}
}

// CommonStartupScript prepare common run service script
//  command - is a final command to run
//  configs - config files to be waited for and to be linked from configmap mount
//   to a destination config folder (if destination is empty no link be done, only wait), e.g.
//   { "api.${POD_IP}": "", "vnc_api.ini.${POD_IP}": "vnc_api.ini"}
func CommonStartupScriptEx(command string, initCommand string, configs map[string]string, srcDir string, dstDir string, updateSignal string) string {

	us := updateSignal
	if us == "" {
		us = "TERM"
	}
	var buf bytes.Buffer
	err := configtemplates.CommonRunConfig.Execute(&buf, struct {
		Command        string
		InitCommand    string
		Configs        map[string]string
		ConfigMapMount string
		DstConfigPath  string
		CAFilePath     string
		UpdateSignal   string
	}{
		Command:        command,
		InitCommand:    initCommand,
		Configs:        configs,
		ConfigMapMount: srcDir,
		DstConfigPath:  dstDir,
		CAFilePath:     SignerCAFilepath,
		UpdateSignal:   us,
	})
	if err != nil {
		panic(err)
	}
	return buf.String()
}

// CommonStartupScript prepare common run service script
//  command - is a final command to run
//  configs - config files to be waited for and to be linked from configmap mount
//   to a destination config folder (if destination is empty no link be done, only wait), e.g.
//   { "api.${POD_IP}": "", "vnc_api.ini.${POD_IP}": "vnc_api.ini"}
func CommonStartupScript(command string, configs map[string]string) string {
	return CommonStartupScriptEx(command, "", configs, "/etc/contrailconfigmaps", "/etc/contrail", "")
}

// NodemanagerStartupScript returns nodemanagaer runner script
func NodemanagerStartupScript() string {
	return CommonStartupScript(
		"source /etc/contrailconfigmaps/${NODE_TYPE}-nodemgr.env.${POD_IP}; "+
			"exec /usr/bin/contrail-nodemgr --nodetype=contrail-${NODE_TYPE}",
		map[string]string{
			"${NODE_TYPE}-nodemgr.env.${POD_IP}":  "",
			"vnc_api_lib.ini.${POD_IP}":           "vnc_api_lib.ini",
			"${NODE_TYPE}-nodemgr.conf.${POD_IP}": "contrail-${NODE_TYPE}-nodemgr.conf",
		})
}

func addGroup(ng int64, a []int64) []int64 {
	for _, g := range a {
		if g == ng {
			return a
		}
	}
	return append(a, ng)
}

// DefaultSecurityContext sets security context if not set yet
// (it is to be set explicetely as on openshift default is restricted
// after bootstrap completed)
func DefaultSecurityContext(podSpec *corev1.PodSpec) {
	if podSpec.SecurityContext == nil {
		podSpec.SecurityContext = &corev1.PodSecurityContext{}
	}
	var rootid int64 = 0
	var uid int64 = 1999
	if podSpec.SecurityContext.FSGroup == nil {
		podSpec.SecurityContext.FSGroup = &uid
	}
	podSpec.SecurityContext.SupplementalGroups = addGroup(uid, podSpec.SecurityContext.SupplementalGroups)
	falseVal := false
	for idx := range podSpec.Containers {
		c := &podSpec.Containers[idx]
		if c.SecurityContext == nil {
			c.SecurityContext = &corev1.SecurityContext{}
		}
		if c.SecurityContext.Privileged == nil {
			c.SecurityContext.Privileged = &falseVal
		}
		if c.SecurityContext.RunAsUser == nil {
			// for now all containers expect to be run under root, they do switch user
			// by themselves
			c.SecurityContext.RunAsUser = &rootid
		}
		if c.SecurityContext.RunAsGroup == nil {
			c.SecurityContext.RunAsGroup = &rootid
		}
	}
	// to prevent PODs to be evicted or OOM killed
	podSpec.PriorityClassName = "system-node-critical"
}

// IsOKForRequeque works for errors from request for update, and returns true if
// the error occurs from time to time due to asynchronous requests and is
// treated by restarting the reconciliation. Note that such a solution is
// suitable only if the update of the same object is not launched twice or more
// times in the same reconciliation.
func IsOKForRequeque(err error) bool {
	return k8s.CanNeedRetry(err)
}

func GetManagerObject(clnt client.Client) (*Manager, error) {
	var mngr = &Manager{}
	var ns string
	var err error
	if ns, err = k8sutil.GetWatchNamespace(); err == nil {
		mngrName := types.NamespacedName{Name: "cluster1", Namespace: ns}
		err = clnt.Get(context.Background(), mngrName, mngr)
	}
	return mngr, err
}

// Return name of casandra depending on setup
func GetAnalyticsCassandraInstance(cl client.Client) (string, error) {
	var mgr *Manager
	var err error
	if mgr, err = GetManagerObject(cl); err != nil {
		return "", err
	}
	if len(mgr.Spec.Services.Cassandras) == 0 {
		return "", fmt.Errorf("Cannot detect Analytics DB name - empty cassandra list")
	}
	name := CassandraInstance
	for _, c := range mgr.Spec.Services.Cassandras {
		if c.Metadata.Name == AnalyticsCassandraInstance {
			name = AnalyticsCassandraInstance
			break
		}
	}
	return name, nil
}

// Return NODE_TYPE for database depending on setup
func GetDatabaseNodeType(cl client.Client) (string, error) {
	var mgr *Manager
	var err error
	if mgr, err = GetManagerObject(cl); err != nil {
		return "", err
	}
	if len(mgr.Spec.Services.Cassandras) == 0 {
		return "", fmt.Errorf("Cannot detect Analytics DB name - empty cassandra list")
	}
	if len(mgr.Spec.Services.Cassandras) == 1 {
		return "database", nil
	}
	return "config-database", nil
}

// Return if queryengine is enabled
func GetQueryEngineEnabled(cl client.Client) (bool, error) {
	var mgr *Manager
	var err error
	if mgr, err = GetManagerObject(cl); err != nil {
		return false, err
	}
	if mgr.Spec.Services.QueryEngine == nil {
		return false, nil
	}
	return true, nil
}

// Return if analytics-alarm is enabled
func GetAnalyticsAlarmEnabled(cl client.Client) (bool, error) {
	var mgr *Manager
	var err error
	if mgr, err = GetManagerObject(cl); err != nil {
		return false, err
	}
	if mgr.Spec.Services.AnalyticsAlarm == nil {
		return false, nil
	}
	return true, nil
}

// Return if analytics-snmp is enabled
func GetAnalyticsSnmpEnabled(cl client.Client) (bool, error) {
	var mgr *Manager
	var err error
	if mgr, err = GetManagerObject(cl); err != nil {
		return false, err
	}
	if mgr.Spec.Services.AnalyticsSnmp == nil {
		return false, nil
	}
	return true, nil
}

func updateMap(values map[string]string, data *map[string]string) {
	for k, v := range values {
		(*data)[k] = v
	}
}

func UpdateConfigMap(instance v1.Object, instanceType string, data map[string]string, client client.Client) error {
	namespacedName := types.NamespacedName{
		Name:      instance.GetName() + "-" + instanceType + "-configmap",
		Namespace: instance.GetNamespace(),
	}
	config := corev1.ConfigMap{}
	if err := client.Get(context.TODO(), namespacedName, &config); err != nil {
		return err
	}
	updateMap(data, &config.Data)

	return client.Update(context.TODO(), &config)
}

func GetReplicas(clnt client.Client, labels client.MatchingLabels) (nodesNumber int32, err error) {
	nodesNumber = 0
	err = nil
	nodeList := &corev1.NodeList{}
	if err = clnt.List(context.Background(), nodeList, labels); err == nil {
		nodesNumber = int32(len(nodeList.Items))
		if nodesNumber == 0 {
			return 0, fmt.Errorf("Cannot detect replicas by node selector %s", labels)
		}
	}
	return nodesNumber, err
}

// Extract ZIU Status from cluster manager resource
func GetZiuStage(clnt client.Client) (ZIUStatus, error) {
	if mngr, err := GetManagerObject(clnt); err == nil {
		return mngr.Status.ZiuState, nil
	} else {
		return 0, err
	}
}

// SetZiuStage sets ZIU stage
func SetZiuStage(stage int, clnt client.Client) error {
	if mngr, err := GetManagerObject(clnt); err == nil {
		mngr.Status.ZiuState = ZIUStatus(stage)
		return clnt.Status().Update(context.Background(), mngr)
	} else {
		return err
	}
}

func InitZiu(clnt client.Client) (err error) {
	var manager *Manager
	if manager, err = GetManagerObject(clnt); err != nil {
		return
	}
	if manager.Spec.Services.Kubemanager != nil {
		ZiuKinds = ZiuKindsAll
	} else {
		ZiuKinds = ZiuKindsNoVrouterCNI
	}
	err = SetZiuStage(0, clnt)
	return
}

func ziuCheckContainerImage(m *Manager) (stsName string, image string) {
	stsName = ""
	image = ""
	var cc []*Container = nil
	if m.Spec.Services.Kubemanager != nil {
		stsName = m.Spec.Services.Kubemanager.Metadata.Name + "-kubemanager"
		cc = m.Spec.Services.Kubemanager.Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.Webui != nil {
		stsName = m.Spec.Services.Webui.Metadata.Name + "-webui"
		cc = m.Spec.Services.Webui.Spec.ServiceConfiguration.Containers
	} else if len(m.Spec.Services.Controls) > 0 {
		stsName = m.Spec.Services.Controls[0].Metadata.Name + "-control"
		cc = m.Spec.Services.Controls[0].Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.Rabbitmq != nil {
		stsName = m.Spec.Services.Rabbitmq.Metadata.Name + "-rabbitmq"
		cc = m.Spec.Services.Rabbitmq.Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.Zookeeper != nil {
		stsName = m.Spec.Services.Zookeeper.Metadata.Name + "-zookeeper"
		cc = m.Spec.Services.Zookeeper.Spec.ServiceConfiguration.Containers
	} else if len(m.Spec.Services.Cassandras) > 0 {
		stsName = m.Spec.Services.Cassandras[0].Metadata.Name + "-cassandra"
		cc = m.Spec.Services.Cassandras[0].Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.QueryEngine != nil {
		stsName = m.Spec.Services.QueryEngine.Metadata.Name + "-queryengine"
		cc = m.Spec.Services.QueryEngine.Spec.ServiceConfiguration.Containers
	} else if len(m.Spec.Services.Redis) > 0 {
		stsName = m.Spec.Services.Redis[0].Metadata.Name + "-redis"
		cc = m.Spec.Services.Redis[0].Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.AnalyticsSnmp != nil {
		stsName = m.Spec.Services.AnalyticsSnmp.Metadata.Name + "-analyticssnmp"
		cc = m.Spec.Services.AnalyticsSnmp.Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.AnalyticsAlarm != nil {
		stsName = m.Spec.Services.AnalyticsAlarm.Metadata.Name + "-analyticsalarm"
		cc = m.Spec.Services.AnalyticsAlarm.Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.Analytics != nil {
		stsName = m.Spec.Services.Analytics.Metadata.Name + "-analytics"
		cc = m.Spec.Services.Analytics.Spec.ServiceConfiguration.Containers
	} else if m.Spec.Services.Config != nil {
		stsName = m.Spec.Services.Config.Metadata.Name + "-config"
		cc = m.Spec.Services.Config.Spec.ServiceConfiguration.Containers
	}
	if len(cc) > 0 {
		stsName = stsName + "-statefulset"
		image = cc[0].Image
	}
	return
}

// IsZiuRequired
// Return true if manifests image tag (get kubemanager or webui depending on CNI)
// is different from deployed STS
func IsZiuRequired(clnt client.Client) (bool, error) {
	manager, err := GetManagerObject(clnt)
	if err != nil {
		return false, err
	}
	stsName, image := ziuCheckContainerImage(manager)
	if stsName == "" || image == "" {
		return false, nil
	}
	var manifestTag string
	ss := strings.Split(image, ":")
	manifestTag = ss[len(ss)-1]
	sts := &appsv1.StatefulSet{}
	nsName := types.NamespacedName{Name: stsName, Namespace: manager.GetNamespace()}
	if err = clnt.Get(context.Background(), nsName, sts); err != nil {
		if k8serrors.IsNotFound(err) {
			// Looks like setup installed the first time
			return false, nil
		}
		return false, err
	}
	// Get first container tag from sts
	ss = strings.Split(sts.Spec.Template.Spec.Containers[0].Image, ":")
	deployedTag := ss[len(ss)-1]
	return deployedTag != manifestTag, nil
}

// Function check reconsiler request against current ZIU stage and allow reconcile for controllers
func CanReconcile(resourceKind string, clnt client.Client) (bool, error) {
	ziuStage, err := GetZiuStage(clnt)
	if err != nil {
		return false, err
	}
	if ziuStage == -1 {
		if ziuStage == -1 {
			f, err := IsZiuRequired(clnt)
			return !f, err
		}
		return true, nil
	}
	// Always block vrouter reconcile if ZIU is working
	if resourceKind == "Vrouter" {
		return false, nil
	}
	// Calculate current reconcile stage
	resourceStage := -1
	for index, kind := range ZiuKinds {
		if kind == resourceKind {
			resourceStage = index
		}
	}
	if resourceStage == -1 {
		// Reconsile blocks in case of error
		// return false, InternalError{fmt.Sprintf("Kind %v is not allowed for ZIU", resourceKind)}
		return false, fmt.Errorf("Kind %v is not allowed for ZIU", resourceKind)
	}
	log.Info(fmt.Sprintf("INFO: ZIU Stage resourceStage = %v, ziuStage = %v", resourceStage, ziuStage))
	// Enable resource controller only for current ZIU stage to avoid extra pods restarts at the ZIU time
	return int(ziuStage-1) == resourceStage, nil
}

type anyStatus struct {
	Status CommonStatus
}

func unstrToStruct(u *unstructured.Unstructured, toStruct interface{}) error {
	var err error
	var j []byte
	if j, err = u.MarshalJSON(); err != nil {
		return err
	}
	if err = json.Unmarshal(j, toStruct); err != nil {
		return err
	}
	return nil
}

// Got some contrail resource from cluster and check is it active?
func IsUnstructuredActive(kind string, name string, namespace string, clnt client.Client) bool {
	var err error
	u := &unstructured.Unstructured{}
	u.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   "tf.tungsten.io",
		Kind:    kind,
		Version: "v1alpha1",
	})
	if err = clnt.Get(context.Background(), client.ObjectKey{
		Namespace: namespace,
		Name:      name,
	}, u); err != nil {
		log.Error(err, "Cant get resource")
		return false
	}

	var status anyStatus
	if err = unstrToStruct(u, &status); err != nil {
		log.Error(err, "Cant convert unstructured to structured")
		return false
	}
	return *(status.Status.Active)
}

func IsVrouterExists(client client.Client) bool {
	vrouter := &VrouterList{}
	err := client.List(context.Background(), vrouter)
	return len(vrouter.Items) != 0 && err == nil
}

func ConvertLogLevel(logLevel string) string {
	logLevels := map[string]string{
		"info":     "SYS_INFO",
		"debug":    "SYS_DEBUG",
		"warning":  "SYS_WARN",
		"error":    "SYS_ERR",
		"critical": "SYS_CRIT",
	}
	if l, ok := logLevels[logLevel]; ok {
		return l
	}
	return logLevel
}
