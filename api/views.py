from django.shortcuts import render
from rest_framework.views import APIView
from .models import Instrument, ScanLog
from .serializers import InstrumentSerializers, ScanLogSerializers
from rest_framework.response import Response
from rest_framework import status


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
