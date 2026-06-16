from django.urls import path
from .views import (
    AuditLogListView,
    BranchListCreateView,
    BranchDetailView,
    BranchMemberView,
    BranchMemberRemoveView,
    AvailableManagersView,
)

urlpatterns = [
    path('audit-logs/', AuditLogListView.as_view()),
    path('audit-logs', AuditLogListView.as_view()),
    path('admin/audit/', AuditLogListView.as_view()),
    path('admin/audit', AuditLogListView.as_view()),
    path('branches/', BranchListCreateView.as_view()),
    path('branches', BranchListCreateView.as_view()),
    path('branches/<uuid:pk>/', BranchDetailView.as_view()),
    path('branches/<uuid:pk>', BranchDetailView.as_view()),
    path('branches/<uuid:pk>/members/', BranchMemberView.as_view()),
    path('branches/<uuid:pk>/members', BranchMemberView.as_view()),
    path('branches/<uuid:pk>/members/<uuid:user_id>/', BranchMemberRemoveView.as_view()),
    path('branches/<uuid:pk>/members/<uuid:user_id>', BranchMemberRemoveView.as_view()),
    path('branches/<uuid:pk>/available-managers/', AvailableManagersView.as_view()),
    path('branches/<uuid:pk>/available-managers', AvailableManagersView.as_view()),
]