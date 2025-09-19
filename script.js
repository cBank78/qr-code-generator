// QR Code Generator logic (corrected and complete)
class QRCodeGenerator {
  constructor() {
    this.currentType = 'text';
    this.queue = [];
    this.defaultSettings = { width: 300, height: 300, qrColor: '#000000', bgColor: '#ffffff', marginX: 0, marginY: 0 };
    this.currentSettings = { ...this.defaultSettings };
    this.currentSymbology = (document.getElementById('symbology-select')?.value) || 'qrcode';
    this.currentLineIndex = 0;
    this.init();
  }

  init() {
    this.applySavedTheme();
    this.setupThemeToggle();
    this.setupEvents();
    this.renderForm();
    this.updatePreview();
  }

  applySavedTheme() {
    const pref = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    if (pref === 'light') root.classList.add('light');
    else root.classList.remove('light');
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = pref === 'light';
  }

  setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('change', (e) => {
      const root = document.documentElement;
      const isLight = e.target.checked;
      root.classList.toggle('light', isLight);
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }

  setupEvents() {
    document.querySelectorAll('.type-btn').forEach((button) =>
      button.addEventListener('click', (e) => {
        document.querySelectorAll('.type-btn').forEach((x) => x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentType = e.currentTarget.dataset.type;
        this.renderForm();
        this.updatePreview();
      })
    );

    const symSel = document.getElementById('symbology-select');
    if (symSel) {
      symSel.addEventListener('change', (e) => {
        this.currentSymbology = e.target.value;
        this.updatePreview();
      });
    }

    document.addEventListener('input', (e) => {
      if (e.target.closest('#input-forms')) this.updatePreview();
    });

    const sizeW = document.getElementById('size-width');
    const sizeH = document.getElementById('size-height');
    const mVert = document.getElementById('margin-vertical');
    const mHorz = document.getElementById('margin-horizontal');
    const sizePreset = document.getElementById('size-preset');
    const marginPreset = document.getElementById('margin-preset');

    if (sizePreset) {
      sizePreset.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) { // Default
          sizeW.value = String(this.defaultSettings.width);
          sizeH.value = String(this.defaultSettings.height);
          this.currentSettings.width = this.defaultSettings.width;
          this.currentSettings.height = this.defaultSettings.height;
          this.updatePreview();
          return;
        }
        const [w, h] = val.split('x').map((n) => parseInt(n, 10));
        if (!isNaN(w) && !isNaN(h)) {
          sizeW.value = String(w);
          sizeH.value = String(h);
          this.currentSettings.width = w;
          this.currentSettings.height = h;
          this.updatePreview();
        }
      });
    }

    if (marginPreset) {
      marginPreset.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) { // Default
          mVert.value = String(this.defaultSettings.marginY);
          mHorz.value = String(this.defaultSettings.marginX);
          this.currentSettings.marginY = this.defaultSettings.marginY;
          this.currentSettings.marginX = this.defaultSettings.marginX;
          this.updatePreview();
          return;
        }
        const [vy, vx] = val.split('x').map((n) => parseInt(n, 10));
        if (!isNaN(vy) && !isNaN(vx)) {
          mVert.value = String(vy);
          mHorz.value = String(vx);
          this.currentSettings.marginY = vy;
          this.currentSettings.marginX = vx;
          this.updatePreview();
        }
      });
    }

    if (sizeW && sizeH) {
      const onSize = () => {
        const w = Math.max(50, Math.min(2000, parseInt(sizeW.value || '0', 10)));
        const h = Math.max(50, Math.min(2000, parseInt(sizeH.value || '0', 10)));
        this.currentSettings.width = w;
        this.currentSettings.height = h;
        this.updatePreview();
      };
      sizeW.addEventListener('change', onSize);
      sizeH.addEventListener('change', onSize);
      sizeW.addEventListener('input', onSize);
      sizeH.addEventListener('input', onSize);
    }
    if (mVert && mHorz) {
      const onMargin = () => {
        const vy = Math.max(0, Math.min(200, parseInt(mVert.value || '0', 10)));
        const vx = Math.max(0, Math.min(200, parseInt(mHorz.value || '0', 10)));
        this.currentSettings.marginY = vy;
        this.currentSettings.marginX = vx;
        this.updatePreview();
      };
      mVert.addEventListener('change', onMargin);
      mHorz.addEventListener('change', onMargin);
      mVert.addEventListener('input', onMargin);
      mHorz.addEventListener('input', onMargin);
    }

    document.getElementById('qr-color').addEventListener('input', (e) => {
      this.currentSettings.qrColor = e.target.value;
      this.updatePreview();
    });
    document.getElementById('bg-color').addEventListener('input', (e) => {
      this.currentSettings.bgColor = e.target.value;
      this.updatePreview();
    });

    document.getElementById('add-to-queue').addEventListener('click', () => {
      const split = document.getElementById('split-lines')?.checked;
      if (split && (this.currentType === 'text' || this.currentType === 'url')) {
        const area = this.currentType === 'text' ? document.getElementById('text-input') : document.getElementById('url-input');
        const raw = (area?.value) || '';
        const lines = raw.split(/\r?\n/);
        const idx = Math.min(this.currentLineIndex, lines.length - 1);
        const current = (lines[idx] || '').trim();
        const data = current;
        this.queue.push({
          id: Date.now() + Math.random(),
          type: this.currentType,
          data,
          timestamp: new Date().toLocaleString(),
          settings: { ...this.currentSettings, symbology: this.currentSymbology },
        });
        this.updateQueue();
        return;
      }
      const data = this.getQRData();
      if (!data) return;
      this.queue.push({
        id: Date.now(),
        type: this.currentType,
        data,
        timestamp: new Date().toLocaleString(),
        settings: { ...this.currentSettings, symbology: this.currentSymbology },
      });
      this.updateQueue();
    });

    document.getElementById('clear-queue').addEventListener('click', () => {
      this.queue = [];
      this.updateQueue();
    });

    document.getElementById('download-single').addEventListener('click', () => this.downloadCurrent());
    document.getElementById('download-all').addEventListener('click', () => this.downloadAll());
  }

  renderForm() {
    const container = document.getElementById('input-forms');
    const forms = {
      text:
        '<div class="input-group"><label>Text</label><textarea id="text-input" placeholder="Enter text..." rows="6"></textarea></div>' +
        '<div class="input-group"><label><input type="checkbox" id="split-lines"> Split lines into multiple items</label></div>',
      url:
        '<div class="input-group"><label>URL</label><textarea id="url-input" placeholder="https://... (you can paste multiple lines)" rows="6"></textarea></div>' +
        '<div class="input-group"><label><input type="checkbox" id="split-lines"> Split lines into multiple items</label></div>',
      email:
        '<div class="input-group"><label>Email</label><input id="email-input" type="email" placeholder="name@example.com"/></div>' +
        '<div class="input-group"><label>Subject</label><input id="email-subject" type="text"/></div>' +
        '<div class="input-group"><label>Body</label><textarea id="email-body"></textarea></div>',
      phone:
        '<div class="input-group"><label>Phone</label><input id="phone-input" type="tel" placeholder="+123..."/></div>',
      sms:
        '<div class="input-group"><label>Phone</label><input id="sms-phone" type="tel"/></div>' +
        '<div class="input-group"><label>Message</label><textarea id="sms-message"></textarea></div>',
      wifi:
        '<div class="input-group"><label>SSID</label><input id="wifi-ssid"/></div>' +
        '<div class="input-group"><label>Password</label><input id="wifi-password" type="password"/></div>' +
        '<div class="input-group"><label>Security</label><select id="wifi-security"><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">No Password</option></select></div>',
      contact:
        '<div class="input-group"><label>Name</label><input id="contact-name"/></div>' +
        '<div class="input-group"><label>Phone</label><input id="contact-phone"/></div>' +
        '<div class="input-group"><label>Email</label><input id="contact-email"/></div>' +
        '<div class="input-group"><label>Org</label><input id="contact-org"/></div>' +
        '<div class="input-group"><label>URL</label><input id="contact-url"/></div>',
    };
    container.innerHTML = forms[this.currentType] || forms.text;

    // After rendering forms, attach caret/hover tracking if split is used
    const attachLineTracking = (area) => {
      if (!area) return;
      const updateLineFromCaret = () => {
        const pos = area.selectionStart || 0;
        // Determine line index from caret position
        const untilCaret = area.value.slice(0, pos);
        this.currentLineIndex = untilCaret.split(/\r?\n/).length - 1;
        this.updatePreview();
      };
      area.addEventListener('keyup', updateLineFromCaret);
      area.addEventListener('click', updateLineFromCaret);
      area.addEventListener('keydown', (e) => {
        // Arrow keys should update quickly
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End') {
          setTimeout(updateLineFromCaret, 0);
        }
      });
      // Hover tracking (approximate): map mouse Y to line index
      area.addEventListener('mousemove', (e) => {
        const split = document.getElementById('split-lines')?.checked;
        if (!split) return;
        const style = getComputedStyle(area);
        const lineHeight = parseFloat(style.lineHeight) || 18;
        const rect = area.getBoundingClientRect();
        const y = e.clientY - rect.top + area.scrollTop;
        const idx = Math.max(0, Math.floor(y / lineHeight));
        if (idx !== this.currentLineIndex) {
          this.currentLineIndex = idx;
          this.updatePreview();
        }
      });
    };

    if (this.currentType === 'text' || this.currentType === 'url') {
      const area = this.currentType === 'text' ? document.getElementById('text-input') : document.getElementById('url-input');
      attachLineTracking(area);
      const splitChk = document.getElementById('split-lines');
      if (splitChk) {
        splitChk.addEventListener('change', () => {
          // When enabling split, avoid wrapping for accuracy
          if (area) area.style.whiteSpace = splitChk.checked ? 'pre' : '';
          this.updatePreview();
        });
      }
    }
  }

  getQRData() {
    const split = document.getElementById('split-lines')?.checked;
    const fromArea = (id) => document.getElementById(id)?.value || '';
    if (split && (this.currentType === 'text' || this.currentType === 'url')) {
      const areaId = this.currentType === 'text' ? 'text-input' : 'url-input';
      const raw = fromArea(areaId);
      const lines = raw.split(/\r?\n/);
      const idx = Math.min(this.currentLineIndex, lines.length - 1);
      const current = (lines[idx] || '').trim();
      return current;
    }
    const getValue = (id) => document.getElementById(id)?.value?.trim();
    switch (this.currentType) {
      case 'text':
        return getValue('text-input') || '';
      case 'url':
        return getValue('url-input') || '';
      case 'email': {
        const to = getValue('email-input') || '';
        const subject = getValue('email-subject') || '';
        const body = getValue('email-body') || '';
        let s = 'mailto:' + encodeURIComponent(to);
        const params = new URLSearchParams();
        if (subject) params.set('subject', subject);
        if (body) params.set('body', body);
        const qs = params.toString();
        if (qs) s += '?' + qs;
        return s;
      }
      case 'phone': {
        const phone = getValue('phone-input') || '';
        return 'tel:' + phone;
      }
      case 'sms': {
        const phone = getValue('sms-phone') || '';
        const message = getValue('sms-message') || '';
        let s = 'sms:' + phone;
        if (message) s += '?body=' + encodeURIComponent(message);
        return s;
      }
      case 'wifi': {
        const ssid = getValue('wifi-ssid') || '';
        const pwd = getValue('wifi-password') || '';
        const sec = getValue('wifi-security') || 'WPA';
        const escapeWifi = (str) => (str || '').replace(/[\\;:,\"]/g, '\\$&');
        const hidden = 'false';
        return `WIFI:T:${sec};S:${escapeWifi(ssid)};P:${escapeWifi(pwd)};H:${hidden};;`;
      }
      case 'contact': {
        let v = 'BEGIN:VCARD\nVERSION:3.0\n';
        const add = (key, val) => { if (val) v += `${key}:${val}\n`; };
        add('FN', getValue('contact-name'));
        add('TEL', getValue('contact-phone'));
        add('EMAIL', getValue('contact-email'));
        add('ORG', getValue('contact-org'));
        add('URL', getValue('contact-url'));
        v += 'END:VCARD';
        return v;
      }
      default:
        return '';
    }
  }

  async updatePreview() {
    const data = this.getQRData();
    const cont = document.getElementById('qr-preview');
    const btn = document.getElementById('download-single');
    if (!data) {
      cont.innerHTML = "<div class='preview-placeholder'><i class='fas fa-qrcode'></i><p>Your QR code will appear here</p></div>";
      btn.disabled = true;
      return;
    }
    try {
      const canvas = await this.makeCode(data, { ...this.currentSettings, symbology: this.currentSymbology });
      cont.innerHTML = '';
      cont.appendChild(canvas);
      btn.disabled = false;
    } catch (e) {
      console.error(e);
      cont.innerHTML = "<div class='preview-placeholder'><p>Preview error. Try QR Code or check console.</p></div>";
      btn.disabled = true;
    }
  }

  // Wrapper that switches generator based on symbology
  makeCode(data, settings) {
    const sym = (settings.symbology || 'qrcode').toLowerCase();
    if (sym === 'qrcode') {
      return this.makeQR(data, settings).catch(() => this.makeBwip('qrcode', data, settings));
    }
    return this.makeBwip(sym, data, settings);
  }

  // QR (qrcode library)
  makeQR(data, settings) {
    return new Promise((resolve, reject) => {
      if (!window.QRCode || !QRCode.toCanvas) {
        reject(new Error('QRCode library not available'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = settings.width;
      canvas.height = settings.height;
      const size = Math.min(settings.width, settings.height);
      const opts = {
        width: size,
        margin: Math.max(settings.marginX, settings.marginY),
        color: { dark: settings.qrColor, light: settings.bgColor },
        errorCorrectionLevel: 'M',
      };
      QRCode.toCanvas(canvas, data, opts, (err) => {
        if (err) reject(err);
        else resolve(canvas);
      });
    });
  }

  // Data Matrix / Aztec / PDF417 (and QR fallback) using bwip-js
  makeBwip(symbology, data, settings) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const bwip = window.bwipjs; // CDN exposes `bwipjs`
      if (!bwip || !bwip.toCanvas) {
        reject(new Error('bwip-js toCanvas not available'));
        return;
      }
      const scale = Math.max(1, Math.round(Math.min(settings.width, settings.height) / 80));
      const barHex = String(settings.qrColor || '#000000').replace('#','');
      const bgHex = String(settings.bgColor || '#ffffff').replace('#','');
      try {
        bwip.toCanvas(canvas, {
          bcid: symbology, // 'qrcode' | 'datamatrix' | 'azteccode' | 'pdf417'
          text: data,
          scale: scale,
          backgroundcolor: bgHex,
          barcolor: barHex,
          paddingwidth: settings.marginX,
          paddingheight: settings.marginY,
        });
        if (canvas.width !== settings.width || canvas.height !== settings.height) {
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = settings.width;
          finalCanvas.height = settings.height;
          const ctx = finalCanvas.getContext('2d');
          ctx.fillStyle = settings.bgColor;
          ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          const scaleFit = Math.min(finalCanvas.width / canvas.width, finalCanvas.height / canvas.height);
          const drawW = Math.round(canvas.width * scaleFit);
          const drawH = Math.round(canvas.height * scaleFit);
          const dx = Math.round((finalCanvas.width - drawW) / 2);
          const dy = Math.round((finalCanvas.height - drawH) / 2);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, drawW, drawH);
          resolve(finalCanvas);
          return;
        }
        resolve(canvas);
      } catch (e) {
        reject(e);
      }
    });
  }

  updateQueue() {
    const q = document.getElementById('queue-container');
    const count = document.getElementById('queue-count');
    const allBtn = document.getElementById('download-all');
    count.textContent = this.queue.length;
    allBtn.disabled = this.queue.length === 0;
    if (this.queue.length === 0) {
      q.innerHTML = "<div class='queue-empty'><i class='fas fa-inbox'></i><p>No QR codes in queue</p></div>";
      return;
    }
    q.innerHTML = this.queue
      .map(
        (it) =>
          `<div class='queue-item' data-id='${it.id}'>` +
          `<div class='queue-item-info'>` +
          `<div class='queue-item-title'>${(it.settings?.symbology || 'qrcode').toUpperCase()}</div>` +
          `<div class='queue-item-details'>${it.timestamp}</div>` +
          `</div>` +
          `<div class='queue-item-actions'><button class='btn' onclick='qrGenerator.downloadItem(${it.id})'>Download</button></div>` +
          `</div>`
      )
      .join('');
  }

  async downloadCurrent() {
    const data = this.getQRData();
    if (!data) return;
    const canvas = await this.makeCode(data, { ...this.currentSettings, symbology: this.currentSymbology });
    const name = this.makeFileName(this.currentSymbology);
    this.saveCanvas(canvas, name);
  }

  async downloadItem(id) {
    const it = this.queue.find((x) => x.id === id);
    if (!it) return;
    const canvas = await this.makeCode(it.data, it.settings);
    const name = this.makeFileName(it.settings?.symbology || 'qrcode', id);
    this.saveCanvas(canvas, name);
  }

  async downloadAll() {
    if (this.queue.length === 0) return;
    const zip = new JSZip();
    for (let i = 0; i < this.queue.length; i++) {
      const it = this.queue[i];
      const canvas = await this.makeCode(it.data, it.settings);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const name = this.makeFileName(it.settings?.symbology || 'qrcode', it.id);
      zip.file(name, blob);
    }
    const out = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.download = `qr-batch-${Date.now()}.zip`;
    a.href = URL.createObjectURL(out);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  makeFileName(type, id) {
    const safe = (s) => String(s || '').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    return `qr-${safe(type)}-${id || Date.now()}.png`;
  }

  saveCanvas(canvas, name) {
    const a = document.createElement('a');
    a.download = name;
    a.href = canvas.toDataURL();
    a.click();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.qrGenerator = new QRCodeGenerator();
});
