from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.contrib.auth import views as auth_views
from django.template.loader import get_template
from django.http import HttpResponse

urlpatterns = [
    path('admin/', admin.site.urls),

    # Redirect root to login
    path('', RedirectView.as_view(url='/accounts/login/', permanent=False)),

    # Login/Logout
    path("accounts/login/", auth_views.LoginView.as_view(
        template_name="registration/login.html"
    ), name="login"),

    path("accounts/logout/", auth_views.LogoutView.as_view(), name="logout"),

    # Custom Password Reset Views
    path("accounts/password_reset/", auth_views.PasswordResetView.as_view(
        template_name="registration/password_reset_form.html"
    ), name="password_reset"),

    path("accounts/password_reset/done/", auth_views.PasswordResetDoneView.as_view(
        template_name="registration/password_reset_done.html"
    ), name="password_reset_done"),

    path("accounts/reset/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(
        template_name="registration/password_reset_confirm.html"
    ), name="password_reset_confirm"),

    path("accounts/reset/done/", auth_views.PasswordResetCompleteView.as_view(
        template_name="registration/password_reset_complete.html"
    ), name="password_reset_complete"),

    path("__reload__/", include("django_browser_reload.urls")),
    path("", include("intents.urls")),
    
]