
from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import ActivityLog
from .serializers import ActivityLogSerializer

class ActivityLogListView(generics.ListAPIView):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action', 'resource_type']
    search_fields = ['action', 'resource_type', 'details']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

class ActivityLogDetailView(generics.RetrieveAPIView):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
