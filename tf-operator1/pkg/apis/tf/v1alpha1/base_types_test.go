package v1alpha1

import (
	"os"
	"testing"

	"github.com/operator-framework/operator-sdk/pkg/k8sutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func getCassandras(names []string) []*CassandraInput {
	var res []*CassandraInput
	for _, n := range names {
		res = append(res, &CassandraInput{
			Metadata: Metadata{
				Name: n,
				Labels: map[string]string{
					"tf_cluster": "cluster1",
				},
			},
		})
	}
	return res
}

func getManager(dbs []string) *Manager {
	return &Manager{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "cluster1",
			Namespace: "tf",
		},
		Spec: ManagerSpec{
			Services: Services{
				Cassandras: getCassandras(dbs),
			},
		},
	}
}

func init() {
	os.Setenv(k8sutil.WatchNamespaceEnvVar, "tf")
}

func TestGetDatabaseNodeTypeSingleDB(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err)
	c := fake.NewFakeClientWithScheme(scheme, getManager([]string{"configdb1"}))
	var nodeType string
	nodeType, err = GetDatabaseNodeType(c)
	require.NoError(t, err)
	assert.Equal(t, nodeType, "database")
}

func TestGetDatabaseNodeTypeTwoDB(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err)
	c := fake.NewFakeClientWithScheme(scheme, getManager([]string{"configdb1", "analyticsdb1"}))
	var nodeType string
	nodeType, err = GetDatabaseNodeType(c)
	require.NoError(t, err)
	assert.Equal(t, nodeType, "config-database")
}

func TestGetAnalyticsCassandraInstanceSingleDB(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err)
	c := fake.NewFakeClientWithScheme(scheme, getManager([]string{"configdb1"}))
	var name string
	name, err = GetAnalyticsCassandraInstance(c)
	require.NoError(t, err)
	assert.Equal(t, CassandraInstance, name)
}

func TestGetAnalyticsCassandraInstanceTwoDB(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err)
	c := fake.NewFakeClientWithScheme(scheme, getManager([]string{"configdb1", "analyticsdb1"}))
	var name string
	name, err = GetAnalyticsCassandraInstance(c)
	require.NoError(t, err)
	assert.Equal(t, AnalyticsCassandraInstance, name)
}

func TestGetAnalyticsCassandraInstanceNoDBs(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err)
	c := fake.NewFakeClientWithScheme(scheme, getManager([]string{}))
	var name string
	name, err = GetAnalyticsCassandraInstance(c)
	require.Error(t, err)
	assert.Equal(t, "", name)
}

func TestGetAnalyticsCassandraInstanceNoManager(t *testing.T) {
	scheme, err := SchemeBuilder.Build()
	require.NoError(t, err)
	c := fake.NewFakeClientWithScheme(scheme)
	var name string
	name, err = GetAnalyticsCassandraInstance(c)
	require.Error(t, err)
	assert.Equal(t, "", name)
}

func TestContainersUnchanged(t *testing.T) {
	currentSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
							Env: []corev1.EnvVar{
								{
									Name:  "env1",
									Value: "val1",
								},
							},
						},
						{
							Name:  "container2",
							Image: "image2",
						},
					},
				},
			},
		},
	}
	targetSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
							Env: []corev1.EnvVar{
								{
									Name:  "env1",
									Value: "val1",
								},
							},
						},
						{
							Name:  "container2",
							Image: "image2",
						},
					},
				},
			},
		},
	}
	require.Equal(t, false, containersChanged(&currentSts.Spec.Template, &targetSts.Spec.Template))
}

func TestContainersAdded(t *testing.T) {
	currentSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
						},
					},
				},
			},
		},
	}
	targetSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
						},
						{
							Name:  "container2",
							Image: "image2",
						},
					},
				},
			},
		},
	}
	require.Equal(t, true, containersChanged(&currentSts.Spec.Template, &targetSts.Spec.Template))
}

func TestContainersRemoved(t *testing.T) {
	currentSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
						},
						{
							Name:  "container2",
							Image: "image2",
						},
					},
				},
			},
		},
	}
	targetSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container2",
							Image: "image2",
						},
					},
				},
			},
		},
	}
	require.Equal(t, true, containersChanged(&currentSts.Spec.Template, &targetSts.Spec.Template))
}

func TestContainersEnvChanged(t *testing.T) {
	currentSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
							Env: []corev1.EnvVar{
								{
									Name:  "env1",
									Value: "val1",
								},
							},
						},
					},
				},
			},
		},
	}
	targetSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
							Env: []corev1.EnvVar{
								{
									Name:  "env1",
									Value: "val_changed",
								},
							},
						},
					},
				},
			},
		},
	}
	require.Equal(t, true, containersChanged(&currentSts.Spec.Template, &targetSts.Spec.Template))
}

func TestContainersImageChanged(t *testing.T) {
	currentSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image1",
						},
					},
				},
			},
		},
	}
	targetSts := &appsv1.StatefulSet{
		Spec: appsv1.StatefulSetSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "container1",
							Image: "image_changed",
						},
					},
				},
			},
		},
	}
	require.Equal(t, true, containersChanged(&currentSts.Spec.Template, &targetSts.Spec.Template))
}
