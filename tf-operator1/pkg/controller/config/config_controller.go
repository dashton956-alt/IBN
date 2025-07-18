package config

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	core "k8s.io/api/core/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"github.com/tungstenfabric/tf-operator/pkg/apis/tf/v1alpha1"
	"github.com/tungstenfabric/tf-operator/pkg/controller/utils"
	"github.com/tungstenfabric/tf-operator/pkg/k8s"
)

var log = logf.Log.WithName("controller_config")

var restartTime, _ = time.ParseDuration("3s")
var requeueReconcile = reconcile.Result{Requeue: true, RequeueAfter: restartTime}

func resourceHandler(myclient client.Client) handler.Funcs {
	appHandler := handler.Funcs{
		CreateFunc: func(e event.CreateEvent, q workqueue.RateLimitingInterface) {
			listOps := &client.ListOptions{Namespace: e.Meta.GetNamespace()}
			list := &v1alpha1.ConfigList{}
			err := myclient.List(context.TODO(), list, listOps)
			if err == nil {
				for _, app := range list.Items {
					q.Add(reconcile.Request{NamespacedName: types.NamespacedName{
						Name:      app.GetName(),
						Namespace: e.Meta.GetNamespace(),
					}})
				}
			}
		},
		UpdateFunc: func(e event.UpdateEvent, q workqueue.RateLimitingInterface) {
			listOps := &client.ListOptions{Namespace: e.MetaNew.GetNamespace()}
			list := &v1alpha1.ConfigList{}
			err := myclient.List(context.TODO(), list, listOps)
			if err == nil {
				for _, app := range list.Items {
					q.Add(reconcile.Request{NamespacedName: types.NamespacedName{
						Name:      app.GetName(),
						Namespace: e.MetaNew.GetNamespace(),
					}})
				}
			}
		},
		DeleteFunc: func(e event.DeleteEvent, q workqueue.RateLimitingInterface) {
			listOps := &client.ListOptions{Namespace: e.Meta.GetNamespace()}
			list := &v1alpha1.ConfigList{}
			err := myclient.List(context.TODO(), list, listOps)
			if err == nil {
				for _, app := range list.Items {
					q.Add(reconcile.Request{NamespacedName: types.NamespacedName{
						Name:      app.GetName(),
						Namespace: e.Meta.GetNamespace(),
					}})
				}
			}
		},
		GenericFunc: func(e event.GenericEvent, q workqueue.RateLimitingInterface) {
			listOps := &client.ListOptions{Namespace: e.Meta.GetNamespace()}
			list := &v1alpha1.ConfigList{}
			err := myclient.List(context.TODO(), list, listOps)
			if err == nil {
				for _, app := range list.Items {
					q.Add(reconcile.Request{NamespacedName: types.NamespacedName{
						Name:      app.GetName(),
						Namespace: e.Meta.GetNamespace(),
					}})
				}
			}
		},
	}
	return appHandler
}

// Add adds the Config controller to the manager.
func Add(mgr manager.Manager) error {
	return add(mgr, newReconciler(mgr))
}

func newReconciler(mgr manager.Manager) reconcile.Reconciler {
	return &ReconcileConfig{
		Client:     mgr.GetClient(),
		Scheme:     mgr.GetScheme(),
		Manager:    mgr,
		Kubernetes: k8s.New(mgr.GetClient(), mgr.GetScheme()),
	}
}
func add(mgr manager.Manager, r reconcile.Reconciler) error {
	// Create a new controller.
	c, err := controller.New("config-controller", mgr, controller.Options{Reconciler: r})
	if err != nil {
		return err
	}

	// Watch for changes to primary resource Config
	if err = c.Watch(&source.Kind{Type: &v1alpha1.Config{}}, &handler.EnqueueRequestForObject{}); err != nil {
		return err
	}
	resourceHandler := resourceHandler(mgr.GetClient())

	if err := c.Watch(&source.Kind{Type: &corev1.Node{}}, nodeChangeHandler(mgr.GetClient())); err != nil {
		return err
	}

	serviceMap := map[string]string{"tf_manager": "config"}
	srcPod := &source.Kind{Type: &corev1.Pod{}}
	predPodIPChange := utils.PodIPChange(serviceMap)
	if err = c.Watch(srcPod, resourceHandler, predPodIPChange); err != nil {
		return err
	}

	ownerHandler := &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &v1alpha1.Config{},
	}

	if err = c.Watch(&source.Kind{Type: &corev1.Secret{}}, ownerHandler); err != nil {
		return err
	}

	if err = c.Watch(&source.Kind{Type: &corev1.Service{}}, ownerHandler); err != nil {
		return err
	}

	srcCassandra := &source.Kind{Type: &v1alpha1.Cassandra{}}
	predCassandraSizeChange := utils.CassandraActiveChange()
	if err = c.Watch(srcCassandra, resourceHandler, predCassandraSizeChange); err != nil {
		return err
	}

	srcRabbitmq := &source.Kind{Type: &v1alpha1.Rabbitmq{}}
	predRabbitmqSizeChange := utils.RabbitmqActiveChange()
	if err = c.Watch(srcRabbitmq, resourceHandler, predRabbitmqSizeChange); err != nil {
		return err
	}

	srcZookeeper := &source.Kind{Type: &v1alpha1.Zookeeper{}}
	predZookeeperSizeChange := utils.ZookeeperActiveChange()
	if err = c.Watch(srcZookeeper, resourceHandler, predZookeeperSizeChange); err != nil {
		return err
	}

	srcAnalytics := &source.Kind{Type: &v1alpha1.Analytics{}}
	predAnalyticsSizeChange := utils.AnalyticsActiveChange()
	if err = c.Watch(srcAnalytics, resourceHandler, predAnalyticsSizeChange); err != nil {
		return err
	}

	srcSTS := &source.Kind{Type: &appsv1.StatefulSet{}}
	stsPred := utils.STSStatusChange(utils.ConfigGroupKind())
	if err = c.Watch(srcSTS, ownerHandler, stsPred); err != nil {
		return err
	}

	return nil
}

// blank assignment to verify that ReconcileConfig implements reconcile.Reconciler.
var _ reconcile.Reconciler = &ReconcileConfig{}

// ReconcileConfig reconciles a Config object.
type ReconcileConfig struct {
	// This client, initialized using mgr.Client() above, is a split client
	// that reads objects from the cache and writes to the apiserver.
	Client     client.Client
	Scheme     *runtime.Scheme
	Manager    manager.Manager
	Kubernetes *k8s.Kubernetes
}

// Reconcile reconciles Config
func (r *ReconcileConfig) Reconcile(request reconcile.Request) (reconcile.Result, error) {
	reqLogger := log.WithName("Reconcile").WithName(request.Name)
	reqLogger.Info("Start")
	instanceType := "config"
	// Check ZIU status
	f, err := v1alpha1.CanReconcile("Config", r.Client)
	if err != nil {
		log.Error(err, "When check config ziu status")
		return reconcile.Result{}, err
	}
	if !f {
		log.Info("config reconcile blocks by ZIU status")
		return reconcile.Result{Requeue: true, RequeueAfter: v1alpha1.ZiuRestartTime}, nil
	}
	instance := &v1alpha1.Config{}
	cassandraInstance := &v1alpha1.Cassandra{}
	zookeeperInstance := &v1alpha1.Zookeeper{}
	rabbitmqInstance := &v1alpha1.Rabbitmq{}

	if err = r.Client.Get(context.TODO(), request.NamespacedName, instance); err != nil && errors.IsNotFound(err) {
		reqLogger.Error(err, "Failed to get config obj")
		return reconcile.Result{}, nil
	}

	if !instance.GetDeletionTimestamp().IsZero() {
		reqLogger.Info("Config is deleting, skip reconcile")
		return reconcile.Result{}, nil
	}

	cassandraActive := cassandraInstance.IsActive(v1alpha1.CassandraInstance, request.Namespace, r.Client)
	rabbitmqActive := rabbitmqInstance.IsActive(v1alpha1.RabbitmqInstance, request.Namespace, r.Client)
	zookeeperActive := zookeeperInstance.IsActive(v1alpha1.ZookeeperInstance, request.Namespace, r.Client)
	if !cassandraActive || !rabbitmqActive || !zookeeperActive {
		reqLogger.Info("Dependencies not ready", "db", cassandraActive, "zk", zookeeperActive, "rmq", rabbitmqActive)
		return reconcile.Result{}, nil
	}

	servicePortsMap := map[int32]string{
		int32(v1alpha1.ConfigApiPort): "api",
	}
	configService := r.Kubernetes.Service(request.Name+"-"+instanceType, corev1.ServiceTypeClusterIP, servicePortsMap, instanceType, instance)

	if err := configService.EnsureExists(); err != nil {
		reqLogger.Error(err, "Config service doesnt exist")
		return reconcile.Result{}, err
	}

	configMapName := request.Name + "-" + instanceType + "-configmap"
	configMap, err := instance.CreateConfigMap(configMapName, r.Client, r.Scheme, request)
	if err != nil {
		reqLogger.Error(err, "Failed to create configmap")
		return reconcile.Result{}, err
	}

	_, err = instance.CreateSecret(request.Name+"-secret-certificates", r.Client, r.Scheme, request)
	if err != nil {
		reqLogger.Error(err, "Failed to create secret")
		return reconcile.Result{}, err
	}

	statefulSet := GetSTS()
	if err = instance.PrepareSTS(statefulSet, &instance.Spec.CommonConfiguration, request, r.Scheme); err != nil {
		reqLogger.Error(err, "Failed to prepare stateful set")
		return reconcile.Result{}, err
	}
	if err = v1alpha1.EnsureServiceAccount(&statefulSet.Spec.Template.Spec,
		instanceType, instance.Spec.CommonConfiguration.ImagePullSecrets,
		r.Client, request, r.Scheme, instance); err != nil {
		return reconcile.Result{}, err
	}

	configmapsVolumeName := request.Name + "-" + instanceType + "-volume"
	instance.AddVolumesToIntendedSTS(statefulSet, map[string]string{
		configMapName: configmapsVolumeName,
	})

	v1alpha1.AddCAVolumeToIntendedSTS(statefulSet)
	v1alpha1.AddSecretVolumesToIntendedSTS(statefulSet, request.Name)

	statefulSet.Spec.Template.Spec.Affinity = &corev1.Affinity{
		PodAntiAffinity: &corev1.PodAntiAffinity{
			RequiredDuringSchedulingIgnoredDuringExecution: []corev1.PodAffinityTerm{{
				LabelSelector: &metav1.LabelSelector{
					MatchExpressions: []metav1.LabelSelectorRequirement{{
						Key:      instanceType,
						Operator: "In",
						Values:   []string{request.Name},
					}},
				},
				TopologyKey: "kubernetes.io/hostname",
			}},
		},
	}

	utils.CleanupContainers(&statefulSet.Spec.Template.Spec, instance.Spec.ServiceConfiguration.Containers)
	for idx := range statefulSet.Spec.Template.Spec.Containers {

		container := &statefulSet.Spec.Template.Spec.Containers[idx]

		instanceContainer := utils.GetContainerFromList(container.Name, instance.Spec.ServiceConfiguration.Containers)
		if instanceContainer.Command != nil {
			container.Command = instanceContainer.Command
		}

		container.Image = instanceContainer.Image

		container.VolumeMounts = append(container.VolumeMounts,
			corev1.VolumeMount{
				Name:      request.Name + "-" + instanceType + "-volume",
				MountPath: "/etc/contrailconfigmaps",
			})

		v1alpha1.AddCertsMounts(request.Name, container)
		v1alpha1.SetLogLevelEnv(instance.Spec.CommonConfiguration.LogLevel, container)

		if container.Command == nil {
			command := []string{"bash", fmt.Sprintf("/etc/contrailconfigmaps/run-%s.sh", container.Name)}
			container.Command = command
		}

		switch container.Name {

		case "api":
			apiWorkerCount := instance.Spec.ServiceConfiguration.APIWorkerCount
			if apiWorkerCount != nil && *apiWorkerCount > 1 {
				container.Env = append(container.Env, corev1.EnvVar{
					Name:  "CONFIG_API_WORKER_COUNT",
					Value: strconv.Itoa(*apiWorkerCount),
				})
			}

		case "provisioner":
			cfg := instance.ConfigurationParameters()
			if cfg.LinklocalServiceConfig != nil {
				ll := cfg.LinklocalServiceConfig
				container.Env = append(container.Env,
					corev1.EnvVar{
						Name:  "IPFABRIC_SERVICE_HOST",
						Value: ll.IPFabricServiceHost,
					},
					corev1.EnvVar{
						Name:  "IPFABRIC_SERVICE_PORT",
						Value: fmt.Sprint(*ll.IPFabricServicePort),
					},
					corev1.EnvVar{
						Name:  "LINKLOCAL_SERVICE_NAME",
						Value: *ll.Name,
					},
					corev1.EnvVar{
						Name:  "LINKLOCAL_SERVICE_IP",
						Value: *ll.IP,
					},
					corev1.EnvVar{
						Name:  "LINKLOCAL_SERVICE_PORT",
						Value: fmt.Sprint(*ll.Port),
					},
				)
			}
			container.Env = append(container.Env,
				corev1.EnvVar{
					Name:  "BGP_ASN",
					Value: strconv.Itoa(*cfg.GlobalASNNumber),
				},
				corev1.EnvVar{
					Name:  "BGP_AUTO_MESH",
					Value: strconv.FormatBool(*cfg.BgpAutoMesh),
				},
				corev1.EnvVar{
					Name:  "ENABLE_4BYTE_AS",
					Value: strconv.FormatBool(*cfg.BgpEnable4Byte),
				},
			)
		}
	}

	extraVolumes := !k8s.IsOpenshift() && !v1alpha1.IsVrouterExists(r.Client)

	if extraVolumes {
		statefulSet.Spec.Template.Spec.Volumes = append(statefulSet.Spec.Template.Spec.Volumes,
			core.Volume{
				Name: "host-sysctl",
				VolumeSource: core.VolumeSource{
					HostPath: &core.HostPathVolumeSource{
						Path: "/etc/sysctl.d",
					},
				},
			})
	}

	for idx := range statefulSet.Spec.Template.Spec.InitContainers {

		container := &statefulSet.Spec.Template.Spec.InitContainers[idx]
		if instanceContainer := utils.GetContainerFromList(container.Name, instance.Spec.ServiceConfiguration.Containers); instanceContainer != nil {
			if instanceContainer.Command != nil {
				container.Command = instanceContainer.Command
			}
			container.Image = instanceContainer.Image
		}

		v1alpha1.AddCertsMounts(request.Name, container)
		v1alpha1.SetLogLevelEnv(instance.Spec.CommonConfiguration.LogLevel, container)

		switch container.Name {

		case "nodeinit":
			var statusImage string
			if spc := utils.GetContainerFromList("nodeinit-status-prefetch", instance.Spec.ServiceConfiguration.Containers); spc != nil && spc.Image != "" {
				statusImage = spc.Image
			} else {
				statusImage = strings.Replace(container.Image, "contrail-node-init", "contrail-status", 1)
			}
			container.Env = append(container.Env,
				core.EnvVar{
					Name:  "CONTRAIL_STATUS_IMAGE",
					Value: statusImage,
				},
				// env with cert files needed to avoid issue certs by node-init
				// configmap is readonly, so node-init treats it as 'another one issue certs' ans skips it
				corev1.EnvVar{
					Name:  "SERVER_CA_CERTFILE",
					Value: v1alpha1.SignerCAFilepath,
				},
				corev1.EnvVar{
					Name:  "SERVER_CERTFILE",
					Value: "/etc/certificates/server-${POD_IP}.crt",
				},
				corev1.EnvVar{
					Name:  "SERVER_KEYFILE",
					Value: "/etc/certificates/server-key-${POD_IP}.pem",
				},
			)
			if extraVolumes {
				container.VolumeMounts = append(container.VolumeMounts,
					core.VolumeMount{
						Name:      "host-sysctl",
						MountPath: "/etc/sysctl.d",
					})
			}
		}
	}

	v1alpha1.AddCommonVolumes(&statefulSet.Spec.Template.Spec, instance.Spec.CommonConfiguration)
	v1alpha1.DefaultSecurityContext(&statefulSet.Spec.Template.Spec)

	if created, err := v1alpha1.CreateServiceSTS(instance, instanceType, statefulSet, r.Client); err != nil || created {
		if err != nil {
			reqLogger.Error(err, "Failed to create the stateful set.")
			return reconcile.Result{}, err
		}
		return requeueReconcile, nil
	}

	if updated, err := v1alpha1.UpdateServiceSTS(instance, instanceType, statefulSet, false, r.Client); err != nil || updated {
		if err != nil && !v1alpha1.IsOKForRequeque(err) {
			reqLogger.Error(err, "Failed to update the stateful set.")
			return reconcile.Result{}, err
		}
		return requeueReconcile, nil
	}

	podIPList, podIPMap, err := instance.PodIPListAndIPMapFromInstance(request, r.Client)
	if err != nil {
		return reconcile.Result{}, err
	}
	if updated, err := v1alpha1.UpdatePodsAnnotations(podIPList, r.Client); updated || err != nil {
		if err != nil && !v1alpha1.IsOKForRequeque(err) {
			reqLogger.Error(err, "Failed to update pods annotations.")
			return reconcile.Result{}, err
		}
		return requeueReconcile, nil
	}

	if len(podIPMap) > 0 {
		// TODO: Services can be run on masters only, ensure that pods number is
		nodeselector := instance.Spec.CommonConfiguration.NodeSelector
		if nodes, err := v1alpha1.GetNodes(nodeselector, r.Client); err != nil || len(podIPList) < len(nodes) {
			// to avoid redundand sts-es reloading configure only as STS pods are ready
			reqLogger.Error(err, "Not enough pods are ready to generate configs (pods < nodes)", "pods", len(podIPList), "nodes", len(nodes))
			return requeueReconcile, err
		}

		if err := v1alpha1.EnsureCertificatesExist(instance, podIPList, instanceType, r.Client, r.Scheme); err != nil {
			reqLogger.Error(err, "Failed to ensure CertificatesExist")
			return reconcile.Result{}, err
		}

		data, err := instance.InstanceConfiguration(podIPList, r.Client)
		if err != nil {
			reqLogger.Error(err, "Failed to get config data.")
			return reconcile.Result{}, err
		}
		if err = v1alpha1.UpdateConfigMap(instance, instanceType, data, r.Client); err != nil {
			reqLogger.Error(err, "Failed to update config map.")
			return reconcile.Result{}, err
		}

		if updated, err := instance.ManageNodeStatus(podIPMap, r.Client); err != nil || updated {
			if err != nil && !v1alpha1.IsOKForRequeque(err) {
				reqLogger.Error(err, "Failed to manage node status")
				return reconcile.Result{}, err
			}
			return requeueReconcile, nil
		}
	}

	falseVal := false
	if instance.Status.ConfigChanged == nil {
		instance.Status.ConfigChanged = &falseVal
	}
	beforeCheck := *instance.Status.ConfigChanged
	newConfigMap := &corev1.ConfigMap{}
	if err = r.Client.Get(context.TODO(), types.NamespacedName{Name: configMapName, Namespace: request.Namespace}, newConfigMap); err != nil {
		return reconcile.Result{}, err
	}
	*instance.Status.ConfigChanged = !v1alpha1.CmpConfigMaps(configMap, newConfigMap)

	if *instance.Status.ConfigChanged {
		reqLogger.Info("Update StatefulSet: ConfigChanged")
		if _, err := v1alpha1.UpdateServiceSTS(instance, instanceType, statefulSet, true, r.Client); err != nil && !v1alpha1.IsOKForRequeque(err) {
			reqLogger.Error(err, "Update StatefulSet failed")
			return reconcile.Result{}, err
		}
		return requeueReconcile, nil
	}

	if beforeCheck != *instance.Status.ConfigChanged {
		reqLogger.Info("Update Status: ConfigChanged")
		if err := r.Client.Status().Update(context.TODO(), instance); err != nil && !v1alpha1.IsOKForRequeque(err) {
			reqLogger.Error(err, "Update Status failed")
			return reconcile.Result{}, err
		}
		return requeueReconcile, nil
	}

	instance.Status.Active = new(bool)
	instance.Status.Degraded = new(bool)
	instance.Status.Endpoint = configService.ClusterIP()

	if err = instance.SetInstanceActive(r.Client, instance.Status.Active, instance.Status.Degraded, statefulSet, request); err != nil {
		if v1alpha1.IsOKForRequeque(err) {
			reqLogger.Info("Failed to set instance active, and reconcile is restarting.")
			return requeueReconcile, nil
		}
		reqLogger.Error(err, "Failed to set instance active")
		return reconcile.Result{}, err
	}

	if !*instance.Status.Active {
		reqLogger.Info("Not Active => requeue reconcile")
		return requeueReconcile, nil
	}

	reqLogger.Info("Done")
	return reconcile.Result{}, nil
}
