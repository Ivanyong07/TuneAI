from django.shortcuts import render
from rest_framework.views import APIView
from .models import Instrument, ScanLog
from .serializers import InstrumentSerializers, ScanLogSerializers
from rest_framework.response import Response
from rest_framework import status
import base64
from PIL import Image
import io
import os
from ultralytics import YOLO
import tempfile

model = YOLO('runs/detect/tuneai/weights/best.pt')


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

        serializer = InstrumentSerializers(instrument)
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

        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(image_data)
            tmp_path = tmp.name

        results = model(tmp_path)
        os.unlink(tmp_path)

        detected_name = None
        confidence = 0

        for result in results:
            for box in result.boxes:
                conf = float(box.conf[0])
                cls = result.names[int(box.cls[0])]
                if conf > confidence:
                    confidence = conf
                    detected_name = cls.lower()

        name_map = {
            'gitar': 'guitar',
        }

        if detected_name:
            detected_name = name_map.get(detected_name, detected_name)

        if not detected_name or confidence < 0.5:
            return Response({'detected': False, 'message': 'No instrument detected'})

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
