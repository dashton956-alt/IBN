
from django.urls import path
from . import views

urlpatterns = [
    path('', views.MergeRequestListCreateView.as_view(), name='merge-request-list'),
    path('<int:pk>/', views.MergeRequestDetailView.as_view(), name='merge-request-detail'),
]
