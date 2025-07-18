
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class NetworkDevice(models.Model):
    DEVICE_TYPES = [
        ('core', 'Core'),
        ('distribution', 'Distribution'),
        ('access', 'Access'),
        ('firewall', 'Firewall'),
        ('router', 'Router'),
    ]
    
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('maintenance', 'Maintenance'),
        ('unknown', 'Unknown'),
    ]
    
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unknown')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    model = models.CharField(max_length=255, null=True, blank=True)
    vendor = models.CharField(max_length=255, null=True, blank=True)
    netbox_id = models.IntegerField(null=True, blank=True, unique=True)
    nso_device_name = models.CharField(max_length=255, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name

class PerformanceThreshold(models.Model):
    OPERATOR_CHOICES = [
        ('greater_than', 'Greater Than'),
        ('less_than', 'Less Than'),
        ('equals', 'Equals'),
    ]
    
    device = models.ForeignKey(NetworkDevice, on_delete=models.CASCADE, null=True, blank=True)
    metric_type = models.CharField(max_length=100)
    warning_threshold = models.DecimalField(max_digits=10, decimal_places=2)
    critical_threshold = models.DecimalField(max_digits=10, decimal_places=2)
    operator = models.CharField(max_length=20, choices=OPERATOR_CHOICES, default='greater_than')
    enabled = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
