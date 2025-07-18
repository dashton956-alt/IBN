
from rest_framework import serializers
from .models import NetworkMetric

class NetworkMetricSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.name', read_only=True)
    
    class Meta:
        model = NetworkMetric
        fields = '__all__'
