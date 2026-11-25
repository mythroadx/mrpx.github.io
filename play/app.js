/* mrpx web shell: query helpers, dialog bridge, audio, status, catalog drawer */

function GetQueryString(name) {
  const match = window.location.search.substr(1).match(new RegExp('(^|&)' + name + '=([^&]*)(&|$)'));
  if (match === null) return null;
  try {
    return decodeURIComponent(match[2].replace(/\+/g, ' '));
  } catch (error) {
    return null;
  }
}

const dialog = document.getElementById('dialog');
const dialogTextarea = document.querySelector('#dialog textarea');
const dialogTitle = document.querySelector('#dialog h1');
const dialogOkBtn = document.getElementById('dialogOk');
const dialogCancelBtn = document.getElementById('dialogCancel');
const dialogInfo = document.getElementById('dialogInfo');
const importBtn = document.getElementById('import');
const inputFile = document.getElementById('files');
const canvas = document.getElementById('canvas');
const playScreen = document.getElementById('playScreen');

const MR_DIALOG_EVENT = 6;
const MR_DIALOG_KEY_OK = 0;
const MR_DIALOG_KEY_CANCEL = 1;
const MR_DIALOG_OK = 0;
const MR_DIALOG_OK_CANCEL = 1;
const MR_DIALOG_CANCEL = 2;
const MR_EDIT_NUMERIC = 1;

importBtn.addEventListener('click', () => inputFile.click());
inputFile.addEventListener('change', () => {
  for (const file of inputFile.files) {
    const reader = new FileReader();
    reader.onerror = () => console.log('read error', reader.error);
    reader.onload = () => {
      if (typeof FS === 'undefined') {
        print('文件系统尚未就绪，请等待模拟器加载完成。');
        return;
      }
      FS.writeFile('/mythroad/' + file.name, new Uint8Array(reader.result));
      print("已写入 '" + file.name + "'。");
    };
    reader.readAsArrayBuffer(file);
  }
  inputFile.value = '';
});

const audioEnable = document.getElementById('audioEnable');
const audioStatus = document.getElementById('audioStatus');
const midi = MidiPlayer({
  onError(error) {
    console.error('MIDI:', error);
    vmrpConsoleLog('MIDI: ' + error.message);
  },
  onStateChange(text) {
    audioStatus.textContent = text;
  },
});
audioEnable.addEventListener('click', async () => {
  audioEnable.disabled = true;
  try {
    await midi.enable();
  } finally {
    audioEnable.disabled = false;
  }
});
window.addEventListener('pagehide', () => midi.stop());

const MR_SOUND_MIDI = 0;
const MR_SOUND_WAV = 1;
const MR_SOUND_MP3 = 2;

function js_playSound(type, data, dataLen, loop) {
  if (type === MR_SOUND_MIDI) {
    const buffer = Module.HEAPU8.slice(data, data + dataLen);
    return midi.play(buffer.buffer, loop);
  }
  console.log('unsupported sound type', type, dataLen);
  return 0;
}

function js_stopSound(type) {
  if (type === MR_SOUND_MIDI) return midi.stop();
  return 0;
}

let shakeTimer = 0;

function js_startShake(ms) {
  playScreen.classList.add('shake');
  clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => js_stopShake(), ms);
  return 0;
}

function js_stopShake() {
  clearTimeout(shakeTimer);
  playScreen.classList.remove('shake');
  return 0;
}

function dialogRelease() {
  dialog.style.visibility = 'hidden';
  dialogOkBtn.style.visibility = 'hidden';
  dialogCancelBtn.style.visibility = 'hidden';
  dialogOkBtn.onclick = null;
  dialogCancelBtn.onclick = null;
  Module._setEventEnable(true);
  vmrpSetModal(false);
}

function dialogCreate(title, text, keyType, editAble, editType, maxSize) {
  vmrpSetModal(true);
  Module._setEventEnable(false);
  dialog.style.visibility = 'visible';
  dialogTitle.innerText = getUnicodeStr(title);
  dialogTextarea.value = getUnicodeStr(text);
  dialogTextarea.scrollTop = 0;
  dialogTextarea.readOnly = !editAble;
  if (dialogTextarea.readOnly) dialogInfo.innerText = '';

  if (keyType === MR_DIALOG_OK_CANCEL || keyType === MR_DIALOG_OK) {
    dialogOkBtn.style.visibility = 'visible';
    dialogOkBtn.onclick = () => {
      if (editAble && getDialogText().length > maxSize) return;
      dialogTextarea.readOnly = true;
      Module._c_event(MR_DIALOG_EVENT, MR_DIALOG_KEY_OK, 0);
    };
  }
  if (keyType === MR_DIALOG_OK_CANCEL || keyType === MR_DIALOG_CANCEL) {
    dialogCancelBtn.style.visibility = 'visible';
    dialogCancelBtn.onclick = () => Module._c_event(MR_DIALOG_EVENT, MR_DIALOG_KEY_CANCEL, 0);
  }
  dialogTextarea.oninput = () => {
    if (editAble) updateDialogInfo(maxSize);
  };
  if (editAble) updateDialogInfo(maxSize);
}

function js_dialogCreate(title, text, type) {
  dialogCreate(title, text, type, false, 0, 0);
  return 1234;
}

function js_dialogRelease() {
  dialogRelease();
  return 0;
}

function js_dialogRefresh(title, text, keyType) {
  dialogTitle.innerText = getUnicodeStr(title);
  dialogTextarea.value = getUnicodeStr(text);
  if (keyType === -1) return 0;
  dialogOkBtn.style.visibility = 'hidden';
  dialogCancelBtn.style.visibility = 'hidden';
  dialogOkBtn.onclick = null;
  dialogCancelBtn.onclick = null;
  if (keyType === MR_DIALOG_OK_CANCEL || keyType === MR_DIALOG_OK) {
    dialogOkBtn.style.visibility = 'visible';
    dialogOkBtn.onclick = () => Module._c_event(MR_DIALOG_EVENT, MR_DIALOG_KEY_OK, 0);
  }
  if (keyType === MR_DIALOG_OK_CANCEL || keyType === MR_DIALOG_CANCEL) {
    dialogCancelBtn.style.visibility = 'visible';
    dialogCancelBtn.onclick = () => Module._c_event(MR_DIALOG_EVENT, MR_DIALOG_KEY_CANCEL, 0);
  }
  return 0;
}

function js_textCreate(title, text, type) {
  dialogCreate(title, text, type, false, 0, 0);
  return 1234;
}

function js_textRelease() {
  dialogRelease();
  return 0;
}

function js_textRefresh(handle, title, text) {
  dialogTitle.innerText = getUnicodeStr(title);
  dialogTextarea.value = getUnicodeStr(text);
  return 0;
}

function getUnicodeStr(pointer) {
  let offset = pointer / 2;
  const chars = [];
  while (Module.HEAPU16[offset]) {
    const value = Module.HEAPU16[offset];
    chars.push(String.fromCharCode((value >> 8 | value << 8) & 0xffff));
    offset++;
  }
  return chars.join('');
}

function getDialogText() {
  return dialogTextarea.value.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
}

function updateDialogInfo(maxSize) {
  const length = getDialogText().length;
  dialogInfo.innerText = length + '/' + maxSize;
  dialogInfo.style.color = length > maxSize ? '#ff7b7b' : 'var(--fg-faint)';
}

/* emscripten module */

var statusElement = document.getElementById('status');
var progressElement = document.getElementById('progress');

function print(text) {
  if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
  console.log(text);
  if (window.vmrpConsoleLog) vmrpConsoleLog(text);
}

var Module = {
  preRun: [],
  postRun: [function () {
    const title = GetQueryString('title');
    if (title) document.title = title + ' — mrpx';
    const name = GetQueryString('name');
    const label = document.getElementById('playTitle');
    if (label && name) label.textContent = name + (title ? ' · ' + title : '');
  }],
  print: print,
  printErr(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    console.error(text);
    if (window.vmrpConsoleLog) vmrpConsoleLog('[stderr] ' + text);
  },
  canvas: (function () {
    const element = document.getElementById('canvas');
    element.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      print('WebGL context lost; reload the page.');
    }, false);
    return element;
  })(),
  setStatus(text) {
    if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
    if (text === Module.setStatus.last.text) return;
    const match = text && text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    const now = Date.now();
    if (match && now - Module.setStatus.last.time < 30) return;
    Module.setStatus.last.time = now;
    Module.setStatus.last.text = text;
    if (match) {
      progressElement.value = parseInt(match[2]) * 100;
      progressElement.max = parseInt(match[4]) * 100;
      progressElement.style.visibility = 'visible';
    } else {
      progressElement.style.visibility = 'hidden';
    }
    statusElement.textContent = text || '资源已就绪';
  },
  totalDependencies: 0,
  monitorRunDependencies(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left
      ? 'Preparing... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')'
      : 'All downloads complete.');
  }
};

Module.setStatus('Downloading...');

window.onerror = function () {
  Module.setStatus('Exception thrown, see console');
  Module.setStatus = function (text) {
    if (text) Module.printErr('[post-exception status] ' + text);
  };
};

/* catalog drawer */

(() => {
  const search = document.getElementById('catalogSearch');
  const grid = document.getElementById('drawerGrid');
  const empty = document.getElementById('drawerEmpty');
  const note = document.getElementById('runtimeNote');
  if (!grid) return;

  const RAW_BASE = 'https://raw.githubusercontent.com/vmrp/vmrp.github.io/master/public/mrps/';
  let items = [];

  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  function render(query) {
    const q = (query || '').trim().toLowerCase();
    const list = items.filter(item => !q ||
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.appid || '').includes(q)).slice(0, 48);
    grid.innerHTML = list.map(item => {
      const file = item.preview.split('/').pop();
      const href = '?name=' + encodeURIComponent(item.filename) +
        '&f=' + encodeURIComponent(RAW_BASE + encodeURIComponent(item.filename)) +
        '&title=' + encodeURIComponent(item.name || item.filename);
      return '<a class="drawer-item" href="' + esc(href) + '" title="' + esc(item.name) + '">' +
        '<span class="shot"><img src="../assets/img/games/' + esc(file) + '" alt="' + esc(item.name) + '" loading="lazy"></span>' +
        '<span class="n">' + esc(item.name) + '</span></a>';
    }).join('');
    empty.hidden = list.length > 0;
  }

  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => render(search.value), 120);
  });

  fetch('../assets/data/catalog.json')
    .then(response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(catalog => {
      items = (catalog.packages || []).filter(item => item.preview);
      render('');
    })
    .catch(error => {
      empty.hidden = false;
      empty.textContent = '应用目录加载失败：' + error.message;
    });

  if (note) {
    note.hidden = false;
    note.textContent = '目录中的“启动”会从原资源仓库拉取 MRP；若跨域或网络受限，请改用“导入 MRP”。';
  }
})();
