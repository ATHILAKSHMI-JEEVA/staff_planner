from django.urls import path
from .views import (
    RoleListCreateView, RoleDetailView,
    RolePermissionsView, RolePermissionsByNameView,
)

urlpatterns = [
    path("roles/",  RoleListCreateView.as_view()),
    path("roles",   RoleListCreateView.as_view()),
    path("roles/by-name/<str:name>/permissions/", RolePermissionsByNameView.as_view()),
    path("roles/by-name/<str:name>/permissions",  RolePermissionsByNameView.as_view()),
    path("roles/<uuid:pk>/permissions/", RolePermissionsView.as_view()),
    path("roles/<uuid:pk>/permissions",  RolePermissionsView.as_view()),
    path("roles/<uuid:pk>/", RoleDetailView.as_view()),
    path("roles/<uuid:pk>",  RoleDetailView.as_view()),
]