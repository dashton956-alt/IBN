
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NetworkMetricListCreateView.as_view(), name='metric-list'),
    path('<int:pk>/', views.NetworkMetricDetailView.as_view(), name='metric-detail'),
]
