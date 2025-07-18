
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import NetworkIntent, ConfigurationSnapshot
from .serializers import NetworkIntentSerializer, ConfigurationSnapshotSerializer

class NetworkIntentListCreateView(generics.ListCreateAPIView):
    queryset = NetworkIntent.objects.all()
    serializer_class = NetworkIntentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['intent_type', 'status', 'created_by']
    search_fields = ['title', 'description', 'natural_language_input']
    ordering_fields = ['created_at', 'updated_at', 'title']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class NetworkIntentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = NetworkIntent.objects.all()
    serializer_class = NetworkIntentSerializer

@api_view(['POST'])
def approve_intent(request, pk):
    try:
        intent = NetworkIntent.objects.get(pk=pk)
        intent.status = 'approved'
        intent.approved_by = request.user
        intent.save()
        return Response({'status': 'approved'})
    except NetworkIntent.DoesNotExist:
        return Response({'error': 'Intent not found'}, status=status.HTTP_404_NOT_FOUND)

class ConfigurationSnapshotListView(generics.ListAPIView):
    queryset = ConfigurationSnapshot.objects.all()
    serializer_class = ConfigurationSnapshotSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['device', 'intent', 'snapshot_type']
