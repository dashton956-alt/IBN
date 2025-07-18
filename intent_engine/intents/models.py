from django.db import models

class IntentLog(models.Model):
    intent_type = models.CharField(max_length=100)
    input_json = models.JSONField()
    output_json = models.JSONField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.intent_type} @ {self.timestamp}"
