const modelMap = {
    'guitar':'guitar.glb',
    'piano':'piano.glb',
    'guzheng':'guzheng.glb',
}

function showModel(instrumentName){
    const modelViewer = document.getElementById('instrument-model')
    const modelContainer = document.getElementById('model-container')

    const modelFile = modelMap[instrumentName]
    if(modelFile){
        modelContainer.classList.remove('hidden')
        setTimeout(() => {
            modelViewer.setAttribute('src', modelFile)
        }, 100)
        
    }
}

function closeModel(){
    document.getElementById('model-container').classList.add('hidden')
    document.getElementById('instrument-model').setAttribute('src', '')
}


function handleResult(data) {
    const resultBox = document.getElementById('result-box')
    const instrumentName = document.getElementById('instrument-name')
    const confidenceText = document.getElementById('confidence-text')
    const statusText = document.getElementById('status-text')

    if (data.detected && data.confidence > 10) {
        resultBox.classList.remove('hidden')
        instrumentName.textContent = data.instrument.display_name
        confidenceText.textContent = `${data.confidence}% confidence`
        statusText.textContent = 'Instrument found!'
        showModel(data.instrument.name)
    } else {
        resultBox.classList.add('hidden')
        statusText.textContent = 'Scanning...'
    }
}