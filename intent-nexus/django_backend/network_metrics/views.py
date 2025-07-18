
from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import NetworkMetric
from .serializers import NetworkMetricSerializer

class NetworkMetricListCreateView(generics.ListCreateAPIView):
    queryset = NetworkMetric.objects.all()
    serializer_class = NetworkMetricSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['device', 'metric_type']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

class NetworkMetricDetailView(generics.RetrieveAPIView):
    queryset = NetworkMetric.objects.all()
    serializer_class = NetworkMetricSerializer
