from django.contrib.auth.models import Group
from django.conf import settings

def role_mapper(userinfo, user):
    """
    Map Keycloak roles to Django groups on login.
    """
    role_map = getattr(settings, 'OIDC_ROLE_MAP', {})
    keycloak_roles = userinfo.get('realm_access', {}).get('roles', [])
    user.groups.clear()
    for kc_role in keycloak_roles:
        group_name = role_map.get(kc_role)
        if group_name:
            group, _ = Group.objects.get_or_create(name=group_name)
            user.groups.add(group)
    return user
