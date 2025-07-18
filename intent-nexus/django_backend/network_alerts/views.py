
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.utils import timezone
from .models import NetworkAlert
from .serializers import NetworkAlertSerializer

class NetworkAlertListCreateView(generics.ListCreateAPIView):
    queryset = NetworkAlert.objects.all()
    serializer_class = NetworkAlertSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['severity', 'status', 'alert_type', 'device']
    ordering_fields = ['created_at', 'severity']
    ordering = ['-created_at']

class NetworkAlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NetworkAlert.objects.all()
    serializer_class = NetworkAlertSerializer

@api_view(['POST'])
def acknowledge_alert(request, pk):
    try:
        alert = NetworkAlert.objects.get(pk=pk)
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        return Response({'status': 'acknowledged'})
    except NetworkAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def resolve_alert(request, pk):
    try:
        alert = NetworkAlert.objects.get(pk=pk)
        alert.status = 'resolved'
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({'status': 'resolved'})
    except NetworkAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)
