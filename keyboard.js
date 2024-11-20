async function initializeApp() {
    await Tone.loaded();

    const pianoSampler = new Tone.Sampler({
        urls: {
            C3: "C3.mp3",
            "D#3": "Ds3.mp3",
            "F#3": "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            "D#5": "Ds5.mp3",
            "F#5": "Fs5.mp3",
            A5: "A5.mp3",
        },
        release: 1,
        baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();

    const casioSampler = new Tone.Sampler({
        urls: {
            A1: "A1.mp3",
            A2: "A2.mp3",
        },
        release: 2,
        baseUrl: "https://tonejs.github.io/audio/casio/",
    }).toDestination();

    const metronomeSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0
        }
    }).toDestination();

    const keyMapping = {
        "a": "C4",
        "w": "C#4",
        "s": "D4",
        "e": "D#4",
        "d": "E4",
        "f": "F4",
        "t": "F#4",
        "g": "G4",
        "y": "G#4",
        "h": "A4",
        "u": "A#4",
        "j": "B4",
        "k": "C5",
        "o": "C#5",
        "l": "D5",
        "p": "D#5",
        "m": "B3",
        "n": "A3"
    };

    const clairDeLuneNotes = [
        { note: "F4", time: 0 },
        { note: "G#4", time: 0 },
        { note: "F5", time: 1 },
        { note: "G#5", time: 1 },
        { note: "C#5", time: 2 },
        { note: "F5", time: 2 },
        { note: "F#4", time: 3.5 },
        { note: "A4", time: 3.5 },
        { note: "C5", time: 4 },
        { note: "D#5", time: 4 },
        { note: "F5", time: 4.5 },
        { note: "C5", time: 5 },
        { note: "D#5", time: 5 },
        { note: "F4", time: 6.5 },
        { note: "G#4", time: 6.5 },
        { note: "A#4", time: 7 },
        { note: "C#5", time: 7 },
        { note: "D#5", time: 7.5 },
        { note: "A#4", time: 8 },
        { note: "C#5", time: 8 },
        { note: "F5", time: 8.5 },
        { note: "C#5", time: 9.5 },
        { note: "D#4", time: 10 },
        { note: "F#4", time: 10 },
        { note: "G#4", time: 10.5 },
        { note: "C5", time: 10.5 },
        { note: "C#5", time: 11 },
        { note: "G#4", time: 11.5 },
        { note: "C5", time: 11.5 }
    ];

    const pressedKeys = new Set();

    let currentInstrument = pianoSampler;

    let metronomeLoop;
    let isMetronomeOn = false;
    Tone.Transport.bpm.value = 120;

    function onKeyDown(key) {
        const note = key.getAttribute("data-note");
        currentInstrument.triggerAttack(note);
        key.style.transform = "translateY(5px)";
        key.style.backgroundColor = "#ccc";
        key.style.boxShadow = "none";
    }

    function onKeyUp(key) {
        const note = key.getAttribute("data-note");
        currentInstrument.triggerRelease(note);
        key.style.transform = "translateY(0)";
        key.style.backgroundColor = "";
        key.style.boxShadow = "";
    }

    function onKeyLeave(key) {
        const note = key.getAttribute("data-note");
        currentInstrument.triggerRelease(note);
        key.style.transform = "translateY(0)";
        key.style.backgroundColor = "";
        key.style.boxShadow = "";
    }

    function switchInstrument() {
        currentInstrument = (currentInstrument === pianoSampler) ? casioSampler : pianoSampler;
        const switchButton = document.getElementById("switchInstrument");
        switchButton.textContent = (currentInstrument !== pianoSampler) ? "Casio" : "Piano";
    }

    function playClairDeLune() {
        clairDeLuneNotes.forEach(noteObj => {
            setTimeout(() => {
                const keyElement = document.querySelector(`[data-note="${noteObj.note}"]`);
                if (keyElement) {
                    onKeyDown(keyElement);
                    setTimeout(() => onKeyUp(keyElement), 500);
                }
                currentInstrument.triggerAttack(noteObj.note, "+0", 1);
            }, noteObj.time * 1000);
        });
    }

    async function playMIDIWithToneJS(midiUrl) {
        const midi = await Midi.fromUrl(midiUrl);

        const synth = new Tone.PolySynth(Tone.Synth, {
            envelope: {
                attack: 0.02,
                decay: 0.1,
                sustain: 0.3,
                release: 1
            }
        }).toDestination();

        const now = Tone.now() + 0.5;

        midi.tracks.forEach(track => {
            track.notes.forEach(note => {
                synth.triggerAttackRelease(note.name, note.duration, note.time + now, note.velocity);
            });
        });
    }

    function toggleMetronome() {
        if (isMetronomeOn) {
            metronomeLoop.stop();
            Tone.Transport.stop();
            isMetronomeOn = false;
        } else {
            if (!metronomeLoop) {
                metronomeLoop = new Tone.Loop((time) => {
                    metronomeSynth.triggerAttackRelease("C2", "8n", time);
                }, "4n");
            }
            Tone.Transport.start();
            metronomeLoop.start(0);
            isMetronomeOn = true;
        }
    }

    document.querySelectorAll(".key").forEach(key => {
        key.addEventListener("mousedown", () => onKeyDown(key));
        key.addEventListener("mouseup", () => onKeyUp(key));
        key.addEventListener("mouseleave", () => onKeyLeave(key));
    });

    document.addEventListener("keydown", (event) => {
        const note = keyMapping[event.key];
        if (note && !pressedKeys.has(event.key)) {
            const keyElement = document.querySelector(`[data-note="${note}"]`);
            if (keyElement) {
                onKeyDown(keyElement);
                pressedKeys.add(event.key);
            }
        }
    });

    document.addEventListener("keyup", (event) => {
        const note = keyMapping[event.key];
        if (note) {
            const keyElement = document.querySelector(`[data-note="${note}"]`);
            if (keyElement) {
                onKeyUp(keyElement);
                pressedKeys.delete(event.key);
            }
        }
    });

    document.getElementById("switchInstrument").addEventListener("click", switchInstrument);
    document.getElementById("playClairDeLune").addEventListener("click", playClairDeLune);
    document.getElementById("playBach").addEventListener("click", () => playMIDIWithToneJS("./bach_846.mid"));
    document.getElementById("toggleMetronome").addEventListener("click", toggleMetronome);

}

initializeApp();