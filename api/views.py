from django.shortcuts import render
from rest_framework.views import APIView
from .models import Instrument, ScanLog
from .serializers import InstrumentSerializers, ScanLogSerializers
from rest_framework.response import Response
from rest_framework import status
import base64
from PIL import Image
import io


class InstrumentListsView(APIView):
    def get(self, request):
        instrument = Instrument.objects.all()
        serializers = InstrumentSerializers(instrument, many=True)
        return Response(serializers.data)


class InstrumentDataView(APIView):
    def get(self, request, name):

        try:
            instrument = Instrument.objects.get(name=name)
        except Instrument.DoesNotExist:
            return Response(
                {'error': 'This instrument comming soon'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = InstrumentSerializers(Instrument)
        return Response(serializer.data)


class ScanLogInstrument(APIView):
    def post(self, request):

        if 'image_base64' not in request.data:
            return Response({
                'error': 'No image provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            b64 = request.data['image_base64']
            if ',' in b64:

                b64 = b64.split(",")[1]
                image_data = base64.b64decode(b64)
        except Exception:
            return Response(
                {'error': 'Invalid image'},
                status=status.HTTP_400_BAD_REQUEST
            )

        detected_name = 'guitar'
        confidence = 0.67

        try:
            instrument = Instrument.objects.get(name=detected_name)
        except Instrument.DoesNotExist:
            return Response(
                {'detected': False, 'message': 'Instrument comming soon'}
            )

        ScanLog.objects.create(
            instrument=instrument,
            confidence=confidence
        )

        serializer = InstrumentSerializers(instrument)
        return Response(
            {'detected': True,
             'confidence': round(confidence * 100, 1),
             'instrument': serializer.data
             })
