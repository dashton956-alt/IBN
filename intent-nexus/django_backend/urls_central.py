# Centralized backend URL and variable definitions

NETBOX_API_URL = 'http://netbox:8000/api'
NETBOX_API_TOKEN = 'your-netbox-token'

API_URLS = {
    'devices': f'{NETBOX_API_URL}/dcim/devices/',
    'interfaces': f'{NETBOX_API_URL}/dcim/interfaces/',
    'connections': f'{NETBOX_API_URL}/dcim/cables/',
    # Add other backend service URLs here
}

# Example usage:
# from .urls_central import API_URLS
# requests.get(API_URLS['devices'], headers=...)
