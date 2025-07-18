
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NetworkAlertListCreateView.as_view(), name='alert-list'),
    path('<int:pk>/', views.NetworkAlertDetailView.as_view(), name='alert-detail'),
    path('<int:pk>/acknowledge/', views.acknowledge_alert, name='acknowledge-alert'),
    path('<int:pk>/resolve/', views.resolve_alert, name='resolve-alert'),
]
