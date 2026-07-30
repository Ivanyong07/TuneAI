import { setExplodeAmount, rotateGuitar, tryGrabPart } from './guitar3d.js'
import { runTutorialSystem } from './index.js'
import { playChordString } from './audio.js'

const video = document.getElementById('video')
const handsCanvas = document.getElementById('hands-canvas')
const ctx = handsCanvas.getContext('2d')

const trackCanvas = document.createElement('canvas')
trackCanvas.width = 480
trackCanvas.height = 270
const trackCtx = trackCanvas.getContext('2d')

let handsStarted = false
let lastHandX = null
let handsReady = true
let processingFrame = false

export let mode = 'idle'
export function setMode(newMode) {
    mode = newMode
    hands.setOptions({ maxNumHands: newMode === 'tutorial' ? 2 : 1 })
}

export function startHandTracking() {
    if (handsStarted) return
    handsStarted = true
    trackFrame()
}

function trackFrame() {
    requestAnimationFrame(trackFrame)
    if (!handsReady || processingFrame) return
    if (video.readyState < 2 || video.videoWidth === 0) return

    handsCanvas.width = video.videoWidth
    handsCanvas.height = video.videoHeight

    trackCtx.drawImage(video, 0, 0, trackCanvas.width, trackCanvas.height)

    processingFrame = true
    hands.send({ image: trackCanvas })
        .catch(err => {
            console.error('Hands send failed:', err)
            handsReady = false
        })
        .finally(() => { processingFrame = false })
}

const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` })
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 0,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
})

const lastStrumTime = [0, 0, 0, 0, 0, 0]
let currentChord = 'Em'
let openHistory = []
const HISTORY_LEN = 4

// Dynamically measured string Y-positions (0-1, relative to video element)
let dynamicStringYs = null

export function refreshStringPositions() {
    const fretboard = document.getElementById('guitar-fretboard')
    if (!fretboard || !video) return
    const rows = fretboard.querySelectorAll('.string-row')
    if (!rows.length) return

    const videoRect = video.getBoundingClientRect()
    if (videoRect.height === 0) return

    dynamicStringYs = Array.from(rows).map(row => {
        const rect = row.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2
        return (centerY - videoRect.top) / videoRect.height
    })
    console.log('String Y positions refreshed:', dynamicStringYs)
}

hands.onResults((results) => {
    ctx.clearRect(0, 0, handsCanvas.width, handsCanvas.height)
    if (!results.multiHandLandmarks?.length) { lastHandX = null; return }

    const wristsX = results.multiHandLandmarks.map(h => h[0].x)
    let leftIdx = wristsX.indexOf(Math.min(...wristsX))
    let rightIdx = results.multiHandLandmarks.length > 1 ? (leftIdx === 0 ? 1 : 0) : -1
    if (results.multiHandLandmarks.length === 1 && wristsX[0] > 0.55) {
        rightIdx = 0; leftIdx = -1
    }

    if (mode === 'tutorial' && leftIdx !== -1) {
        const angle = handTiltDegrees(results.multiHandLandmarks[leftIdx])
        currentChord = angle < 35 ? 'Em' : angle < 55 ? 'Am' : angle < 75 ? 'C' : 'G'
    }

    const activeIdx = rightIdx !== -1 ? rightIdx : leftIdx
    if (activeIdx === -1) return
    const landmarks = results.multiHandLandmarks[activeIdx]
    const wrist = landmarks[0]
    const handIsOpen = isHandOpenSmoothed(landmarks)

    if (mode === 'model') {
        if (lastHandX !== null) rotateGuitar((wrist.x - lastHandX) * 300, 0)
        const indexTip = landmarks[8]
        tryGrabPart(indexTip.x, indexTip.y, !handIsOpen)
        setExplodeAmount(handIsOpen ? 1 : 0)
    }

    if (mode === 'tutorial') {
        runTutorialSystem(landmarks, handIsOpen)
        const indexTip = landmarks[8]
        checkStringHit(indexTip.x, indexTip.y)
    }

    lastHandX = wrist.x
    ;[4, 8, 12, 16, 20].forEach(tipIndex => {
        const tip = landmarks[tipIndex]
        ctx.fillStyle = 'red'
        ctx.beginPath()
        ctx.arc(tip.x * handsCanvas.width, tip.y * handsCanvas.height, 10, 0, Math.PI * 2)
        ctx.fill()
    })
})

function handTiltDegrees(landmarks) {
    const wrist = landmarks[0], mcp = landmarks[9]
    return Math.abs(Math.atan2(wrist.y - mcp.y, mcp.x - wrist.x) * 180 / Math.PI)
}

function isHandOpen(landmarks) {
    const tips = [8, 12, 16, 20], bases = [6, 10, 14, 18]
    let open = 0
    tips.forEach((tip, i) => { if (landmarks[tip].y < landmarks[bases[i]].y) open++ })
    return open >= 2
}

function isHandOpenSmoothed(landmarks) {
    const rawOpen = isHandOpen(landmarks)
    openHistory.push(rawOpen)
    if (openHistory.length > HISTORY_LEN) openHistory.shift()
    return openHistory.filter(Boolean).length >= 3
}

// Now takes normalized fingerY (0-1) directly, matches how dynamicStringYs is measured
function checkStringHit(fingerXNorm, fingerYNorm) {
    if (!dynamicStringYs) refreshStringPositions()
    if (!dynamicStringYs) return

    const now = performance.now()
    dynamicStringYs.forEach((sy, i) => {
        if (Math.abs(fingerYNorm - sy) < 0.08 && now - lastStrumTime[i] > 180) {
            playChordString(currentChord, i)
            lastStrumTime[i] = now
            highlightString(i)
        }
    })
}

function highlightString(i) {
    const row = document.querySelectorAll('#guitar-fretboard .string-row')[i]
    if (!row) return
    row.classList.add('ring-2', 'ring-purple-400')
    setTimeout(() => row.classList.remove('ring-2', 'ring-purple-400'), 150)
}