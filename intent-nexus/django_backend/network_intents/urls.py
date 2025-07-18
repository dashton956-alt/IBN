
from django.urls import path
from . import views

urlpatterns = [
    path('', views.NetworkIntentListCreateView.as_view(), name='intent-list'),
    path('<int:pk>/', views.NetworkIntentDetailView.as_view(), name='intent-detail'),
    path('<int:pk>/approve/', views.approve_intent, name='approve-intent'),
    path('snapshots/', views.ConfigurationSnapshotListView.as_view(), name='snapshot-list'),
]
