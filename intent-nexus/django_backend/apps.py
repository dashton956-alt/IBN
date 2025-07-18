
from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

class NetworkDevicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'network_devices'

class NetworkIntentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'network_intents'

class NetworkMetricsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'network_metrics'

class NetworkAlertsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'network_alerts'

class ActivityLogsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'activity_logs'

class MergeRequestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'merge_requests'
