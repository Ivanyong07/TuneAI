import { startHandTracking, setMode, refreshStringPositions } from './hands.js'
import { initGuitar3D } from './guitar3d.js'
import { getCtx } from './audio.js'

let detectedInstrument = null
export let currentStep = 1

export function showModel(instrumentName) {
    const container = document.getElementById('model-container')
    container.classList.remove('hidden')
    container.classList.add('flex')
    if (instrumentName === 'guitar') initGuitar3D('guitar-canvas-container')
    setMode('model')
    startHandTracking()
}

export function closeModel() {
    const container = document.getElementById('model-container')
    container.classList.add('hidden')
    container.classList.remove('flex')
    setMode('idle')
}

export function startTutorial() {
    document.getElementById('tutorial-popup').classList.remove('hidden')
    document.getElementById('guitar-fretboard')?.classList.remove('hidden')
    currentStep = 1
    setMode('tutorial')
    startHandTracking()
    getCtx()

    // Give the fretboard a moment to actually render/layout before measuring it
    setTimeout(() => refreshStringPositions(), 100)
}

export function closeTutorial() {
    document.getElementById('tutorial-popup').classList.add('hidden')
    setMode('idle')
}

export function handleResult(data) {
    console.log("DJANGO SENT:", data);
    // 1. Define the UI elements first
    const resultBox = document.getElementById('result-box')
    const instrumentName = document.getElementById('instrument-name')
    const confidenceText = document.getElementById('confidence-text')
    const statusText = document.getElementById('status-text')

    // 2. Check if the AI detected the guitar
    if (data.detected && (data.confidence > 0.5 || data.confidence > 50)) {
        
        // Show the result box (where the word 'guitar' will pop up)
        resultBox?.classList.remove('hidden')
        
        if (instrumentName) instrumentName.textContent = data.instrument.display_name
        if (confidenceText) confidenceText.textContent = 'High confidence'
        if (statusText) statusText.textContent = 'Instrument found!'
        
        detectedInstrument = data.instrument.name

        // Hide the live camera feed so the entire instrument is no longer shown
        
        
        // Output only the strings to the screen
        document.getElementById('guitar-fretboard')?.classList.remove('hidden')

    } else {
        if (statusText) statusText.textContent = 'Scanning...'
    }
}

export function runTutorialSystem(landmarks, handIsOpen) {
    const tutorialBox = document.getElementById('tutorial-box')
    const tutorialText = document.getElementById('tutorial-text')
    const tutorialIcon = document.getElementById('tutorial-icon')
    if (!tutorialBox || !tutorialText) return

    switch (currentStep) {
        case 1:
            if (handIsOpen) {
                currentStep = 2
                tutorialText.innerText = 'Great! Now close your hand.'
                tutorialIcon.innerText = '✊'
                flash(tutorialBox)
            }
            break
        case 2:
            if (!handIsOpen) {
                currentStep = 3
                tutorialText.innerText = 'Tilt LEFT hand for chords, touch strings with RIGHT index finger.'
                tutorialIcon.innerText = '🎸'
                flash(tutorialBox)
            }
            break
        case 3: {
            const tip = landmarks[8]
            if (tip && tip.y > 0.3 && tip.y < 0.75) {
                currentStep = 4
                tutorialText.innerText = 'Perfect! Keep strumming.'
                tutorialIcon.innerText = '🎉'
                flash(tutorialBox)
            }
            break
        }
    }
}

function flash(box) {
    box.classList.add('scale-105', 'brightness-125')
    setTimeout(() => box.classList.remove('scale-105', 'brightness-125'), 200)
}

let audioUnlocked = false
function unlockAudioOnce() {
    if (audioUnlocked) return
    audioUnlocked = true
    getCtx()
}
document.addEventListener('click', unlockAudioOnce, { once: true })
document.addEventListener('touchstart', unlockAudioOnce, { once: true })

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('open-model-btn')?.addEventListener('click', () => {
        if (detectedInstrument) showModel(detectedInstrument)
    })
    document.getElementById('open-tutorial-btn')?.addEventListener('click', startTutorial)
    document.getElementById('close-model-panel-btn')?.addEventListener('click', closeModel)
    document.getElementById('close-tutorial-btn')?.addEventListener('click', closeTutorial)
    document.getElementById('close-tutorial-x-btn')?.addEventListener('click', closeTutorial)
})