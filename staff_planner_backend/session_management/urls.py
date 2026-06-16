from django.urls import path
from .views import (
    SessionListView,
    CreateSessionView,
    SubstitutesView,
    MySessionsView,
    ShortfallsView,
    AvailableSlotsView,
    MyChildSessionsView,
    RescheduleInfoView,
    RescheduleSessionView,
    ConfirmRescheduleView,
    MarkAttendanceView,
    AttendanceListView,
    AssignStaffView,
    CheckoutView,
)

urlpatterns = [
    path("",                                SessionListView.as_view()),
    path("my/",                             MySessionsView.as_view()),
    path("create/",                         CreateSessionView.as_view()),
    path("substitutes/",                    SubstitutesView.as_view()),
    path("shortfalls/",                     ShortfallsView.as_view()),
    path("available/",                      AvailableSlotsView.as_view()),
    path("my-child/",                       MyChildSessionsView.as_view()),
    path("reschedule-info/",                RescheduleInfoView.as_view()),
    path("attendance/",                     AttendanceListView.as_view()),
    path("<uuid:id>/reschedule/",           RescheduleSessionView.as_view()),
    path("<uuid:id>/confirm-reschedule/",   ConfirmRescheduleView.as_view()),
    path("<uuid:id>/attendance/",           MarkAttendanceView.as_view()),
    path("<uuid:id>/assign/",              AssignStaffView.as_view()),
    path("<uuid:id>/checkout/",            CheckoutView.as_view()),
]