
from rest_framework import serializers
from .models import NetworkIntent, ConfigurationSnapshot

class NetworkIntentSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)
    
    class Meta:
        model = NetworkIntent
        fields = '__all__'
        read_only_fields = ['created_by', 'approved_by', 'deployed_at']

class ConfigurationSnapshotSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    
    class Meta:
        model = ConfigurationSnapshot
        fields = '__all__'
