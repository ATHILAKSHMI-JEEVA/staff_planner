from django.urls import path
from .views import DashboardView, ManagerReschedulesView, ManagerRescheduleDecisionView

urlpatterns = [
    path('manager/dashboard/', DashboardView.as_view()),
    path('manager/dashboard', DashboardView.as_view()),
    path('manager/reschedules/', ManagerReschedulesView.as_view()),
    path('manager/reschedules', ManagerReschedulesView.as_view()),
    path('manager/reschedules/<uuid:id>/decision', ManagerRescheduleDecisionView.as_view()),
    path('manager/reschedules/<uuid:id>/decision/', ManagerRescheduleDecisionView.as_view()),
]