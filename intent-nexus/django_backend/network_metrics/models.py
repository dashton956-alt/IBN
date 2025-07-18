
from django.db import models

class NetworkMetric(models.Model):
    device = models.ForeignKey('network_devices.NetworkDevice', on_delete=models.CASCADE, null=True, blank=True)
    metric_type = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=50, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', 'metric_type', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.device.name if self.device else 'Unknown'} - {self.metric_type}: {self.value}"
