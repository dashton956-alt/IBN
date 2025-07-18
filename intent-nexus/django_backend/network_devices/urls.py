
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NetworkDeviceListCreateView.as_view(), name='device-list'),
    path('<int:pk>/', views.NetworkDeviceDetailView.as_view(), name='device-detail'),
    path('thresholds/', views.PerformanceThresholdListCreateView.as_view(), name='threshold-list'),
    path('thresholds/<int:pk>/', views.PerformanceThresholdDetailView.as_view(), name='threshold-detail'),
]
