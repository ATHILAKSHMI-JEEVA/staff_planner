from django.urls import path
from .views import (
    MyLeavesView, PendingLeavesView, ApplyLeaveView, LeaveDecisionView,
    MyPermissionsView, ApplyPermissionView, PermissionDecisionView,
    AllPermissionsView, AllLeavesByDateView,
)

urlpatterns = [
    # Leave routes — both with and without trailing slash
    path('leaves/my/',    MyLeavesView.as_view()),
    path('leaves/my',     MyLeavesView.as_view()),
    path('leaves/pending/', PendingLeavesView.as_view()),
    path('leaves/pending',  PendingLeavesView.as_view()),
    path('leaves/apply/', ApplyLeaveView.as_view()),
    path('leaves/apply',  ApplyLeaveView.as_view()),
    path('leaves/all/',   AllLeavesByDateView.as_view()),
    path('leaves/all',    AllLeavesByDateView.as_view()),
    path('leaves/<uuid:pk>/decision/', LeaveDecisionView.as_view()),
    path('leaves/<uuid:pk>/decision',  LeaveDecisionView.as_view()),

    # Permission routes
    path('permissions/my/',   MyPermissionsView.as_view()),
    path('permissions/my',    MyPermissionsView.as_view()),
    path('permissions/apply/', ApplyPermissionView.as_view()),
    path('permissions/apply',  ApplyPermissionView.as_view()),
    path('permissions/all/',   AllPermissionsView.as_view()),
    path('permissions/all',    AllPermissionsView.as_view()),
    path('permissions/<uuid:pk>/decision/', PermissionDecisionView.as_view()),
    path('permissions/<uuid:pk>/decision',  PermissionDecisionView.as_view()),
]