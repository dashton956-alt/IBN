
from django.db import models

class MergeRequest(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('review', 'Review'),
        ('approved', 'Approved'),
        ('merged', 'Merged'),
        ('rejected', 'Rejected'),
    ]
    
    intent = models.ForeignKey('network_intents.NetworkIntent', on_delete=models.CASCADE, null=True, blank=True)
    netbox_mr_id = models.CharField(max_length=100, null=True, blank=True, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    change_number = models.CharField(max_length=100, null=True, blank=True)
    author_email = models.EmailField(null=True, blank=True)
    reviewers = models.JSONField(default=list, blank=True)
    netbox_url = models.URLField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
