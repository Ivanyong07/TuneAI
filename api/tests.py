from django.test import TestCase, Client
from django.urls import reverse
from .models import Instrument, ScanLog
import base64


class InstrumentModelTests(TestCase):
    def setUp(self):
        self.instrument = Instrument.objects.create(
            name='guitar', display_name='Guitar')

    def test_instrument_creation(self):
        self.assertEqual(self.instrument.name, 'guitar')
        self.assertEqual(str(Instrument.objects.count()), '1')


class InstrumentListAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        Instrument.objects.create(name='guitar', display_name='Guitar')
        Instrument.objects.create(name='piano', display_name='Piano')

    def test_list_instruments(self):
        response = self.client.get('/api/instrument/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_get_single_instrument(self):
        response = self.client.get('/api/instrument/guitar/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['name'], 'guitar')

    def test_get_nonexistent_instrument(self):
        response = self.client.get('/api/instrument/violin/')
        self.assertEqual(response.status_code, 404)


class ScanEndpointTests(TestCase):
    def setUp(self):
        self.client = Client()
        Instrument.objects.create(name='guitar', display_name='Guitar')

    def test_scan_missing_image(self):
        response = self.client.post(
            '/api/scan/', {}, content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_scan_invalid_base64(self):
        response = self.client.post(
            '/api/scan/',
            {'image_base64': 'not-valid-base64!!!'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
