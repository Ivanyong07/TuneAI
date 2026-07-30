import { handleResult } from './index.js'

// Pointing directly to your local Django backend (no trailing slash)
const API_BASE = 'http://127.0.0.1:8000';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let isScanning = false

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        })

        video.srcObject = stream
        startScanning()
    } catch (err) {
        document.getElementById('status-text').textContent = 'Camera permission denied'
        console.error(err)
    }
}


function startScanning() {
    setInterval(async () => {
        if (isScanning || video.videoWidth === 0) return
        if (isScanning) return 
        isScanning = true

        try {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d').drawImage(video, 0, 0)

            const base64 = canvas.toDataURL('image/jpeg', 0.6)

            // This will now request: http://127.0.0.1:8000/api/scan/
            const response = await fetch(`${API_BASE}/api/scan/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_base64: base64 })
            });

            if (!response.ok) {
                console.error('Scan request failed:', response.status, await response.text());
                document.getElementById('status-text').textContent = `Scan error (${response.status})`;
                return;
            }

            const data = await response.json()
            window.dispatchEvent(new CustomEvent('scanResult', { detail: data }))

        } catch (err) {
            console.error('Scan error:', err)
        } finally {
            isScanning = false
        }

    }, 1500)
}

window.addEventListener('DOMContentLoaded', startCamera)
window.addEventListener('scanResult', (e) => {
    handleResult(e.detail)
})