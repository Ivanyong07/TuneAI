from django.db import models


class Instrument(models.Model):
    category_choices = [('modern', 'Modern'), ('traditional', 'Traditional')]

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=category_choices)
    display_name = models.CharField(max_length=100)
    description = models.CharField(max_length=100)
    ar_layout = models.JSONField(default=dict)
    sound_mapping = models.JSONField(default=dict)

    def __str__(self):
        return self.display_name


class ScanLog(models.Model):
    instrument = models.ForeignKey(
        Instrument, on_delete=models.SET_NULL, null=True)

    confidence = models.FloatField(default=0.0)
    scanned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.instrument} - {self.confidence}"
