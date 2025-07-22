🚀 Getting Started:

Setup Environment:


cd django_backend

cp .env.example .env

# Edit .env with your database, email, SSO, and service URLs
Install & Run:


pip install -r requirements.txt

python manage.py migrate

python manage.py createsuperuser

python manage.py runserver


# Or use Docker:


docker compose up


# Create superuser in the Django container
docker compose exec web python manage.py createsuperuser

# To access the Django shell in the container
docker compose exec web python manage.py shell

# To run management commands
docker compose exec web python manage.py migrate

docker compose exec web python manage.py createsuperuser

---

## Environment Variables
See `.env.example` for all required variables:
- Django settings (DEBUG, SECRET_KEY, ALLOWED_HOSTS)
- Database (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- Redis (REDIS_HOST, REDIS_PORT)
- Email (EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, EMAIL_USE_TLS)
- SSO (SSO_CLIENT_ID, SSO_CLIENT_SECRET, SSO_PROVIDER_URL)

---

## Features & Roadmap
- JWT/OAuth2 authentication and SSO support
- Role-based access control (RBAC)
- Audit logging and error monitoring
- API documentation (Swagger/OpenAPI)
- Rate limiting and security headers
- Background task queue (Celery)
- Email/notification system
- Static/media file handling
- Automated DB backups and migrations
- API versioning
- Enhanced admin dashboard

This README will be updated as each feature is implemented.
