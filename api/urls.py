from django.urls import path
from . import views

urlpatterns = [
    path('instrument/', views.InstrumentListsView.as_view(), name='instrument'),
    path('instrument/<str:name>/',
         views.InstrumentDataView.as_view(), name='instrument-data'),
]
