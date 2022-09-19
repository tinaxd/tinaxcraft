const sfxMap = new Map<string, string>();
sfxMap.set('block-destroy', '395327__ihitokage__block-1.ogg')

const audio = new window.AudioContext();
let audioInitalized = false;

export function enableAudio() {
    if (!audioInitalized) audioInitalized = true;
    audio.resume();
}

export function playSFX(soundname: string, done?: () => void) {
    const filename = sfxMap.get(soundname);
    if (filename == null) {
        console.log('sound ' + soundname + ' not registered');
        return;
    }

    const source = audio.createBufferSource();

    fetch('sfx/' + filename)
    .then(res => res.blob())
    .then(blob => {
        blob.arrayBuffer()
        .then(data => {
            audio.decodeAudioData(data, (buffer) => {
                source.buffer = buffer;
                source.connect(audio.destination);
                source.start();
                if (done != null) done();
            }, (err) => console.log(err));
        })
        .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
}