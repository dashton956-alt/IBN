from rest_framework import serializers

class VLANIntentSerializer(serializers.Serializer):
    type = serializers.CharField()
    site = serializers.CharField()
    vlan_id = serializers.IntegerField()
    name = serializers.CharField()
