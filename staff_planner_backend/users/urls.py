from django.urls import path
from .views import (
    LoginView, LogoutView, MeView, RegisterView, ChildrenMyView, ManagerBranchesView,
    BranchChildrenView, MarkChildAttendanceView, AssignStaffToChildView,
)

urlpatterns = [
    path('auth/register',  RegisterView.as_view()),
    path('auth/register/', RegisterView.as_view()),
    path('auth/login',  LoginView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/logout',  LogoutView.as_view()),
    path('auth/logout/', LogoutView.as_view()),
    path('auth/me',  MeView.as_view()),
    path('auth/me/', MeView.as_view()),

    path('children/my/',     ChildrenMyView.as_view()),
    path('children/my',      ChildrenMyView.as_view()),
    path('children/branch/', BranchChildrenView.as_view()),
    path('children/branch',  BranchChildrenView.as_view()),

    path('children/<uuid:child_id>/attendance/',  MarkChildAttendanceView.as_view()),
    path('children/<uuid:child_id>/attendance',   MarkChildAttendanceView.as_view()),
    path('children/<uuid:child_id>/assign/',      AssignStaffToChildView.as_view()),
    path('children/<uuid:child_id>/assign',       AssignStaffToChildView.as_view()),

    path('managers/<uuid:user_id>/branches',  ManagerBranchesView.as_view()),
    path('managers/<uuid:user_id>/branches/', ManagerBranchesView.as_view()),
]