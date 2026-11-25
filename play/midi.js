function MidiPlayer({
    loadLibrary = () => import('./vendor/spessasynth/index.js'),
    createContext = () => new AudioContext(),
    fetchSoundBank = () => fetch('./vendor/spessasynth/GeneralUser-GS.sf2', {
        signal: AbortSignal.timeout(30000),
    }),
    onError = error => console.error('MIDI:', error),
    onStateChange = () => {},
} = {}) {
    let context, output, synth, sequencer, initialization;
    let ready = false;
    let pending = null;

    function startPending() {
        if (!pending) return;
        const request = pending;
        pending = null;
        sequencer.pause();
        synth.stopAll(true);
        sequencer.loopCount = request.loop ? Infinity : 0;
        sequencer.loadNewSongList([{ binary: request.data }]);
        sequencer.play();
        output.gain.value = 1;
        onStateChange('MIDI 播放中');
    }

    async function initialize() {
        if (sequencer) return;
        if (!context.audioWorklet) throw new Error('需要支持 AudioWorklet 的浏览器及 HTTPS/localhost。');
        const library = await loadLibrary();
        await context.audioWorklet.addModule('./vendor/spessasynth/spessasynth_processor.min.js');
        synth = new library.WorkletSynthesizer(context);
        synth.connect(output);
        await synth.isReady;
        const response = await fetchSoundBank();
        if (!response.ok) throw new Error(`音色库加载失败：HTTP ${response.status}。请运行 npm run prepare:web-audio。`);
        await synth.soundBankManager.addSoundBank(await response.arrayBuffer(), 'main');
        sequencer = new library.Sequencer(synth, { skipToFirstNoteOn: false });
        sequencer.eventHandler.addEvent('midiError', 'vmrp', error => {
            stop();
            onStateChange('MIDI 解析失败');
            onError(error);
        });
    }

    function enable() {
        if (initialization) return initialization;
        onStateChange('正在启用声音…');
        // Resume inside the user gesture, before importing or fetching assets.
        try {
            if (!context) {
                context = createContext();
                output = context.createGain();
                output.gain.value = 0;
                output.connect(context.destination);
            }
            initialization = Promise.all([context.resume(), initialize()])
                .then(() => {
                    if (context.state !== 'running') throw new Error('浏览器尚未允许声音，请再次点击启用声音。');
                    ready = true;
                    onStateChange('声音已启用');
                    startPending();
                    return true;
                })
                .catch(error => {
                    ready = false;
                    output.gain.value = 0;
                    pending = null;
                    sequencer = null;
                    if (synth) synth.destroy();
                    synth = null;
                    onStateChange('声音启用失败，可重试');
                    onError(error);
                    return false;
                })
                .finally(() => { initialization = null; });
            return initialization;
        } catch (error) {
            onStateChange('声音启用失败，可重试');
            onError(error);
            return Promise.resolve(false);
        }
    }

    function play(data, loop) {
        try {
            if (!(data instanceof ArrayBuffer) || data.byteLength < 14 ||
                new DataView(data).getUint32(0) !== 0x4d546864) {
                throw new Error('无效的标准 MIDI 文件（缺少 MThd 头）。');
            }
            pending = { data: data.slice(0), loop: Boolean(loop) };
            if (ready && context.state === 'running') startPending();
            else onStateChange('MIDI 等待播放，请点击启用声音');
            return 0;
        } catch (error) {
            pending = null;
            onError(error);
            return -1;
        }
    }

    function stop() {
        pending = null;
        if (output) output.gain.value = 0;
        if (sequencer) sequencer.pause();
        if (synth) synth.stopAll(true);
        onStateChange(ready ? '声音已启用' : '声音未启用');
        return 0;
    }

    return { enable, play, stop };
}

if (typeof module !== 'undefined' && module.exports) module.exports = MidiPlayer;
