issues 


/home/daniel/IBNaaS/intent-orchestrator-nexus/django_backend/venv/lib/python3.12/site-packages/rest_framework_simplejwt/__init__.py:1: UserWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html. The pkg_resources package is slated for removal as early as 2025-11-30. Refrain from using this package or pin to Setuptools<81.
  from pkg_resources import DistributionNotFound, get_distribution
SystemCheckError: System check identified some issues:

ERRORS:
accounts.User.groups: (fields.E304) Reverse accessor 'Group.user_set' for 'accounts.User.groups' clashes with reverse accessor for 'auth.User.groups'.
	HINT: Add or change a related_name argument to the definition for 'accounts.User.groups' or 'auth.User.groups'.
accounts.User.user_permissions: (fields.E304) Reverse accessor 'Permission.user_set' for 'accounts.User.user_permissions' clashes with reverse accessor for 'auth.User.user_permissions'.
	HINT: Add or change a related_name argument to the definition for 'accounts.User.user_permissions' or 'auth.User.user_permissions'.
auth.User.groups: (fields.E304) Reverse accessor 'Group.user_set' for 'auth.User.groups' clashes with reverse accessor for 'accounts.User.groups'.
	HINT: Add or change a related_name argument to the definition for 'auth.User.groups' or 'accounts.User.groups'.
auth.User.user_permissions: (fields.E304) Reverse accessor 'Permission.user_set' for 'auth.User.user_permissions' clashes with reverse accessor for 'accounts.User.user_permissions'.
	HINT: Add or change a related_name argument to the definition for 'auth.User.user_permissions' or 'accounts.User.user_permissions'.
