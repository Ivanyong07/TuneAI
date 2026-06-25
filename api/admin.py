from django.contrib import admin
from .models import Instrument, ScanLog

# Register your models here.

admin.site.register(Instrument)
admin.site.register(ScanLog)
