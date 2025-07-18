
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/devices/', include('network_devices.urls')),
    path('api/intents/', include('network_intents.urls')),
    path('api/metrics/', include('network_metrics.urls')),
    path('api/alerts/', include('network_alerts.urls')),
    path('api/activity/', include('activity_logs.urls')),
    path('api/merge-requests/', include('merge_requests.urls')),
]
