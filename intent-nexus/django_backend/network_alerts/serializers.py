
from rest_framework import serializers
from .models import NetworkAlert

class NetworkAlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    intent_title = serializers.CharField(source='intent.title', read_only=True)
    acknowledged_by_email = serializers.EmailField(source='acknowledged_by.email', read_only=True)
    
    class Meta:
        model = NetworkAlert
        fields = '__all__'
