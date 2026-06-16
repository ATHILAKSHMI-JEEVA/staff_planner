from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('leaves.urls')),
    path('api/', include('roles.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('admin_ops.urls')),
    path('api/', include('manager_ops.urls')),
    path('api/sessions/', include('session_management.urls')),
]