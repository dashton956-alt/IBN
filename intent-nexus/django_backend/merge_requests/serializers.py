
from rest_framework import serializers
from .models import MergeRequest

class MergeRequestSerializer(serializers.ModelSerializer):
    intent_title = serializers.CharField(source='intent.title', read_only=True)
    
    class Meta:
        model = MergeRequest
        fields = '__all__'
