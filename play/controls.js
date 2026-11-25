(() => {
    'use strict';
    const output = document.getElementById('consoleOutput');
    const prompt = document.getElementById('consolePrompt');
    const text = document.getElementById('consoleInput');
    const password = document.getElementById('consolePassword');
    const submit = document.getElementById('consoleSubmit');
    const cancel = document.getElementById('consoleCancel');
    const keys = new Map([
        ['key_0', 0], ['key_1', 1], ['key_2', 2], ['key_3', 3],
        ['key_4', 4], ['key_5', 5], ['key_6', 6], ['key_7', 7],
        ['key_8', 8], ['key_9', 9], ['key_star', 10], ['key_pound', 11],
        ['key_up', 12], ['key_down', 13], ['key_left', 14], ['key_right', 15],
        ['key_power', 16], ['key_sleft', 17], ['key_sright', 18],
        ['key_send', 19], ['key_ok', 20],
    ]);
    let ready = false;
    let waiting = false;
    let modal = false;
    let passwordMode = false;
    const held = new Map();
    window.vmrpConsoleLog = message => {
        const bottom = output.scrollTop + output.clientHeight >= output.scrollHeight - 8;
        output.value = (output.value + String(message) + '\n').slice(-65536);
        if (bottom) output.scrollTop = output.scrollHeight;
    };
    function sendKey(pressed, code) {
        if (Module._queuePhoneKey(pressed ? 1 : 0, code) !== 0) {
            vmrpConsoleLog('Phone key event was rejected.');
        }
    }
    function release(button, pointerId) {
        if (!held.has(button)) return;
        const { code, pointer } = held.get(button);
        if (pointerId !== undefined && pointer !== pointerId) return;
        held.delete(button);
        button.classList.remove('pressed');
        sendKey(false, code);
    }
    function releaseAll() {
        for (const button of held.keys()) release(button);
    }
    function updateControls() {
        const enabled = ready && !waiting && !modal;
        if (!enabled) releaseAll();
        const state = document.getElementById('runtimeState');
        state.textContent = !ready ? '未就绪' : waiting ? '等待输入' : modal ? '对话框' : '运行中';
        state.dataset.state = !ready ? 'loading' : waiting || modal ? 'waiting' : 'ready';
        document.getElementById('import').disabled = !ready;
        for (const id of keys.keys()) document.getElementById(id).disabled = !enabled;
        text.disabled = password.disabled = submit.disabled = cancel.disabled = !ready || !waiting;
    }
    window.vmrpControlsReady = value => {
        if (!value) releaseAll();
        ready = value;
        updateControls();
    };
    window.vmrpSetModal = value => { modal = value; updateControls(); };
    window.vmrpEditChanged = (title, value, type, limit) => {
        waiting = title !== null;
        passwordMode = type === 2;
        text.hidden = waiting && passwordMode;
        password.hidden = !waiting || !passwordMode;
        text.value = password.value = '';
        prompt.textContent = waiting ? `${title} (最多 ${limit} 个 UCS-2 字符)` : '应用当前未等待输入';
        updateControls();
        if (waiting) {
            const target = passwordMode ? password : text;
            target.value = value;
            target.inputMode = type === 1 ? 'numeric' : 'text';
            target.focus();
            vmrpConsoleLog('应用请求文本输入，请填写下方输入框后提交或取消。');
        }
    };
    for (const [id, code] of keys) {
        const button = document.getElementById(id);
        button.style.touchAction = 'none';
        button.addEventListener('pointerdown', event => {
            if (button.disabled || event.button !== 0 || held.has(button)) return;
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            held.set(button, { code, pointer: event.pointerId });
            button.classList.add('pressed');
            sendKey(true, code);
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
            button.addEventListener(type, event => release(button, event.pointerId));
        }
        button.addEventListener('keydown', event => {
            if (![' ', 'Enter'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat && !button.disabled && !held.has(button)) {
                held.set(button, { code, pointer: null });
                button.classList.add('pressed');
                sendKey(true, code);
            }
        });
        button.addEventListener('keyup', event => {
            if (![' ', 'Enter'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            release(button);
        });
        button.addEventListener('blur', () => release(button));
    }
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseAll();
    });
    document.getElementById('consoleClear').addEventListener('click', () => { output.value = ''; });
    document.getElementById('consoleCopy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(output.value);
        } catch (error) {
            output.focus();
            output.select();
            vmrpConsoleLog(`无法访问剪贴板，请手动复制所选日志：${error.message}`);
        }
    });
    function submitText() {
        if (!ready || !waiting) {
            vmrpConsoleLog('应用当前未等待输入');
            return;
        }
        const value = (passwordMode ? password : text).value;
        if (value.includes('\0')) {
            vmrpConsoleLog('输入不能包含 NUL 字符');
            return;
        }
        if (/[\uD800-\uDFFF]/.test(value)) {
            vmrpConsoleLog('MRP UCS-2 输入不支持代理字符或 emoji');
            return;
        }
        const encoded = new TextEncoder().encode(value + '\0');
        const pointer = Module._malloc(encoded.length);
        if (!pointer) {
            vmrpConsoleLog('无法分配输入缓冲区');
            return;
        }
        try {
            Module.HEAPU8.set(encoded, pointer);
            Module._submitEditText(pointer);
        } finally {
            Module._free(pointer);
        }
    }
    submit.addEventListener('click', submitText);
    cancel.addEventListener('click', () => {
        if (ready && waiting) Module._cancelEdit();
    });
    for (const element of [text, password, output]) {
        for (const type of ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'wheel']) {
            element.addEventListener(type, event => {
                event.stopPropagation();
                if (type === 'keydown' && (event.ctrlKey || event.metaKey) && event.key === 'Enter' &&
                    element !== output) {
                    event.preventDefault();
                    submitText();
                }
            });
        }
    }
    updateControls();
})();
