import os
import yaml
import requests
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import HttpResponseRedirect
from django.utils.timezone import now
from django.urls import reverse
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.views import View

@login_required

def home_view(request):
    return render(request, "home.html")


def submit_view(request):
    if request.method == "POST":
        intent_name = request.POST.get("intent_name")
        intent_description = request.POST.get("intent_description")
        target_device = request.POST.get("target_device")
        desired_state = request.POST.get("desired_state")

        intent_data = {
            "intent_name": intent_name,
            "description": intent_description,
            "target_device": target_device,
            "desired_state": desired_state,
            "timestamp": now().isoformat(),
        }

        intents_dir = os.path.join(settings.BASE_DIR, "sample_intents")
        os.makedirs(intents_dir, exist_ok=True)
        file_path = os.path.join(intents_dir, f"{intent_name}.yaml")

        with open(file_path, "w") as yaml_file:
            yaml.dump(intent_data, yaml_file)

        if request.headers.get("x-requested-with") == "XMLHttpRequest":
            return JsonResponse({"message": "Intent submitted successfully!"})
        else:
            return HttpResponseRedirect("/success")

    return render(request, "intent_form.html")

def success_view(request):
    return render(request, "success.html")

class HomeView(View):
    def get(self, request):
        intent_files = [f for f in os.listdir(INTENTS_DIR) if f.endswith('.yaml')]
        return render(request, 'home.html', {'intent_files': intent_files})

    def post(self, request):
        filename = request.POST.get('filename')
        filepath = os.path.join(INTENTS_DIR, filename)

        try:
            with open(filepath, 'r') as f:
                intent_data = yaml.safe_load(f)

            # Send intent to NSO API (replace with your actual NSO endpoint)
            nso_response = requests.post('http://nso-api-endpoint/api/push-intent', json=intent_data)
            nso_response.raise_for_status()

            messages.success(request, f"Intent '{filename}' successfully pushed to NSO.")
        except Exception as e:
            messages.error(request, f"Failed to push intent: {e}")

        return redirect('home')


def populate_netbox(request):
    try:
        # Call your custom script logic here
        os.system("python3 scripts/populate_netbox.py")
        messages.success(request, "NetBox data population script executed successfully.")
    except Exception as e:
        messages.error(request, f"Failed to populate NetBox: {e}")
    return redirect('home')
