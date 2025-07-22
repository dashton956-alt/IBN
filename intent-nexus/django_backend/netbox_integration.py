import requests
from django.conf import settings
from .urls_central import API_URLS, NETBOX_API_TOKEN

HEADERS = {
    'Authorization': f'Token {NETBOX_API_TOKEN}',
    'Accept': 'application/json',
}

def get_netbox_devices():
    resp = requests.get(API_URLS['devices'], headers=HEADERS)
    resp.raise_for_status()
    return resp.json()['results']

def get_netbox_interfaces():
    resp = requests.get(API_URLS['interfaces'], headers=HEADERS)
    resp.raise_for_status()
    return resp.json()['results']

def get_netbox_connections():
    resp = requests.get(API_URLS['connections'], headers=HEADERS)
    resp.raise_for_status()
    return resp.json()['results']
