from rest_framework import serializers
from .models import Instrument, ScanLog


class InstrumentSerializers(serializers.ModelSerializer):
    class Meta:
        model = Instrument
        fields = [
            'id',
            'name',
            'category',
            'display_name',
            'description',
            'ar_layout',
            'sound_mapping'
        ]


class ScanLogSerializers(serializers.ModelSerializer):
    instrument = InstrumentSerializers(read_only=True)

    class Meta:
        model = ScanLog
        fields = [
            'id',
            'instrument',
            'confidence',
            'scanned_at'
        ]
