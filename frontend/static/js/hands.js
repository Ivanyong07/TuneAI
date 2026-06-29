const handsCanvas = document.getElementById('hands-canvas')
const ctx = handsCanvas.getContext('2d')
let handsStarted = false

function startHandTracking(){
    if (handsStarted) return
    handsStarted = true
    camera.start()
    console.log('Hand tracking started!')
}

const hands = new Hands({
    locateFile: (file) => `static/mediapipe/hands/${file}`
})

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0, // 0 fast, 1 accurate
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
})

hands.onResults((results) => {
    ctx.clearRect(0, 0, handsCanvas.width, handsCanvas.height)  // wipe canvas clean each frame

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {

            if (isHandOpen(landmarks)){
                explodeGuitar()
            } else {
                assembleGuitar()
            }

            const fingertips  = [4, 8, 12, 16, 20] // grab index fingertip position
            
            // draw red dot
            fingertips.forEach(tipIndex => {
                const tip = landmarks[tipIndex]
                const x = tip.x * handsCanvas.width
                const y = tip.y * handsCanvas.height
                
                ctx.fillStyle = 'red'
                ctx.beginPath()
                ctx.arc(x, y, 10, 0, Math.PI * 2)
                ctx.fill()
            })
            
            const indexTip = landmarks[8]
            const x = indexTip.x * handsCanvas.width
            const y = indexTip.y * handsCanvas.height
            checkStringHit(x, y)
            
        }
    }
})

const camera = new Camera(video, {
    onFrame: async () => {
        handsCanvas.width = video.videoWidth 
        handsCanvas.height = video.videoHeight
        await hands.send({ image: video })  // send each frame to MediaPipe
    },
    width: 1280,
    height: 720
})

function checkStringHit(x, y) {
    // console.log('finger at:', x, y)
}

function isHandOpen(landmarks) {
    // check if all fingertips are above their base joints
    const fingertips = [8, 12, 16, 20]
    const bases = [6, 10, 14, 18]
    
    let openCount = 0
    fingertips.forEach((tip, i) => {
        if (landmarks[tip].y < landmarks[bases[i]].y) {
            openCount++
        }
    })
    return openCount >= 3  // at least 3 fingers open
}
