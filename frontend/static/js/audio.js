let audioCtx = null;

export function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

const HARMONICS = [[1, 1.0], [2, 0.4], [3, 0.2], [4, 0.1], [5, 0.05]];

export function pluckString(frequency, duration = 1.0) {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.5, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ctx.destination);

    HARMONICS.forEach(([mult, amp]) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency * mult;
        const gain = ctx.createGain();
        gain.gain.value = amp;
        osc.connect(gain).connect(master);
        osc.start(now);
        osc.stop(now + duration);
    });
}

export const CHORD_FREQS = {
    C:  [130.81, 164.81, 196.00, 261.63, 329.63, 523.25],
    G:  [98.00,  123.47, 146.83, 196.00, 293.66, 392.00],
    Am: [110.00, 164.81, 220.00, 261.63, 329.63, 440.00],
    Em: [82.41,  110.00, 146.83, 196.00, 246.94, 329.63],
};

export function playChordString(chordName, stringIndex) {
    const freqs = CHORD_FREQS[chordName] || CHORD_FREQS.Em;
    const freq = freqs[stringIndex];
    if (freq) pluckString(freq);
}