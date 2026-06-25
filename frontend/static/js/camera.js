const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let isScanning = false

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {facingMode: 'environment'}
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
        if (isScanning) return isScanning = true

        try {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            canvas.getContext('2d').drawImage(video, 0, 0)
            const base64 = canvas.toDataURL('image/jpeg', 0.8)

            const response = await fetch('http://localhost:8000/api/scan/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_base64: base64 })
            })

            const data = await response.json()
            handleResult(data)

        } catch (err) {
            console.error('Scan error:', err)
        } finally {
            isScanning = false
        }

    }, 1500)
}

window.addEventListener('DOMContentLoaded', startCamera)