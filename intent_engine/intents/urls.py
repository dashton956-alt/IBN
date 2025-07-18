from django.urls import path
from . import views
from intents import views

urlpatterns = [
    path("home/", views.home_view, name="home"),
    path("submit", views.submit_view, name="submit"),
    path("success", views.success_view, name="success"),
    path('populate-netbox/', views.populate_netbox, name='populate_netbox'),
]