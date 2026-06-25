function handleResult(data) {
    const resultBox = document.getElementById('result-box')
    const instrumentName = document.getElementById('instrument-name')
    const confidenceText = document.getElementById('confidence-text')
    const statusText = document.getElementById('status-text')

    if (data.detected) {
        resultBox.classList.remove('hidden')
        instrumentName.textContent = data.instrument.display_name
        confidenceText.textContent = `${data.confidence}% confidence`
        statusText.textContent = 'Instrument found!'
    } else {
        resultBox.classList.add('hidden')
        statusText.textContent = 'Scanning...'
    }
}