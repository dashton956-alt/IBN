🚀 Getting Started:

Setup Environment:


cd django_backend

cp .env.example .env

# Edit .env with your database and service URLs
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
