
from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import MergeRequest
from .serializers import MergeRequestSerializer

class MergeRequestListCreateView(generics.ListCreateAPIView):
    queryset = MergeRequest.objects.all()
    serializer_class = MergeRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'author_email']
    search_fields = ['title', 'description', 'change_number']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

class MergeRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MergeRequest.objects.all()
    serializer_class = MergeRequestSerializer
