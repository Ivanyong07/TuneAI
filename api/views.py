import base64
import io
import os
import tempfile

from django.conf import settings
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from PIL import Image
from ultralytics import YOLO

from .models import Instrument, ScanLog
from .serializers import InstrumentSerializers, ScanLogSerializers

# --- Load YOLO model once at startup ---
# Using an absolute path relative to this file avoids issues when
# Django is run from a different working directory.
MODEL_PATH = os.path.join(settings.BASE_DIR, 'runs',
                          'detect', 'tuneai', 'weights', 'best.pt')

model = YOLO(MODEL_PATH)


# --- API VIEWS ---

class InstrumentListsView(APIView):
    def get(self, request):
        instruments = Instrument.objects.all()
        serializer = InstrumentSerializers(instruments, many=True)
        return Response(serializer.data)


class InstrumentDataView(APIView):
    def get(self, request, name):
        try:
            instrument = Instrument.objects.get(name=name)
        except Instrument.DoesNotExist:
            return Response(
                {'error': 'This instrument coming soon'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = InstrumentSerializers(instrument)
        return Response(serializer.data)


class ScanLogInstrument(APIView):

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        if 'image_base64' not in request.data:
            return Response(
                {'error': 'No image provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

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

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                tmp.write(image_data)
                tmp_path = tmp.name

            results = model(tmp_path, conf=0.3)
        finally:
            if tmp_path and os.path.exists(tmp_path):
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

        if not detected_name or confidence < 0.3:
            return Response({'detected': False, 'message': 'No instrument detected'})

        # --- THE FIX IS HERE ---
        try:
            instrument = Instrument.objects.get(name=detected_name)
            serializer_data = InstrumentSerializers(instrument).data
            
            # Only log to database if the instrument actually exists in it
            ScanLog.objects.create(
                instrument=instrument,
                confidence=confidence
            )
        except Instrument.DoesNotExist:
            # Bypass the database crash so your frontend still works!
            serializer_data = {
                'name': detected_name,
                'display_name': detected_name.capitalize()
            }

        return Response({
            'detected': True,
            'confidence': round(confidence * 100, 1),
            'instrument': serializer_data
        })


# --- HTML VIEW (function-based) ---

def guitar_tutorial_view(request):
    context = {
        'detected': False,
        'result_message': None,
    }

    if request.method == 'POST' and request.FILES.get('image'):
        uploaded_image = request.FILES['image']

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                for chunk in uploaded_image.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name

            results = model(tmp_path, conf=0.3)
        finally:
            if tmp_path and os.path.exists(tmp_path):
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

        if not detected_name or confidence < 0.3:
            context['detected'] = False
            context['result_message'] = "No instrument detected."
        else:
            try:
                instrument = Instrument.objects.get(name=detected_name)
                ScanLog.objects.create(
                    instrument=instrument, confidence=confidence)
                context['detected'] = True
                context['result_message'] = (
                    f"YOLO found: {instrument.name} "
                    f"({round(confidence * 100, 1)}% confidence)"
                )
            except Instrument.DoesNotExist:
                context['detected'] = False
                context['result_message'] = (
                    f"Detected '{detected_name}', but it is not in the database."
                )

    return render(request, 'guitar_tutorial.html', context)