
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class NetworkIntent(models.Model):
    INTENT_TYPES = [
        ('vlan_configuration', 'VLAN Configuration'),
        ('routing_policy', 'Routing Policy'),
        ('access_control', 'Access Control'),
        ('qos_policy', 'QoS Policy'),
        ('backup_restore', 'Backup/Restore'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('deployed', 'Deployed'),
        ('failed', 'Failed'),
        ('rolled_back', 'Rolled Back'),
    ]
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    intent_type = models.CharField(max_length=50, choices=INTENT_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    natural_language_input = models.TextField(null=True, blank=True)
    configuration = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_intents')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_intents')
    deployed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title

class ConfigurationSnapshot(models.Model):
    SNAPSHOT_TYPES = [
        ('scheduled', 'Scheduled'),
        ('manual', 'Manual'),
        ('drift_detection', 'Drift Detection'),
    ]
    
    device = models.ForeignKey('network_devices.NetworkDevice', on_delete=models.CASCADE)
    intent = models.ForeignKey(NetworkIntent, on_delete=models.SET_NULL, null=True, blank=True)
    configuration_hash = models.CharField(max_length=255)
    configuration_data = models.JSONField()
    snapshot_type = models.CharField(max_length=20, choices=SNAPSHOT_TYPES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
