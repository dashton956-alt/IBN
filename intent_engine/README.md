# Intent Engine (Django Version)

## Features
- Submit VLAN intents via API
- Store in DB
- Process and return NSO-ready payload
- Admin interface for viewing intents

## Run
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Submit Intent
```http
POST /api/intents/
{
  "type": "create_vlan",
  "site": "siteA",
  "vlan_id": 100,
  "name": "users_vlan"
}
```
