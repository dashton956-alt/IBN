
from rest_framework import serializers
from .models import NetworkDevice, PerformanceThreshold

class NetworkDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NetworkDevice
        fields = '__all__'

class PerformanceThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceThreshold
        fields = '__all__'
