
from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import NetworkDevice, PerformanceThreshold
from .serializers import NetworkDeviceSerializer, PerformanceThresholdSerializer

class NetworkDeviceListCreateView(generics.ListCreateAPIView):
    queryset = NetworkDevice.objects.all()
    serializer_class = NetworkDeviceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'status', 'location', 'vendor']
    search_fields = ['name', 'ip_address', 'location', 'model']
    ordering_fields = ['name', 'created_at', 'last_updated']

class NetworkDeviceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NetworkDevice.objects.all()
    serializer_class = NetworkDeviceSerializer

class PerformanceThresholdListCreateView(generics.ListCreateAPIView):
    queryset = PerformanceThreshold.objects.all()
    serializer_class = PerformanceThresholdSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['device', 'metric_type', 'enabled']

class PerformanceThresholdDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PerformanceThreshold.objects.all()
    serializer_class = PerformanceThresholdSerializer
