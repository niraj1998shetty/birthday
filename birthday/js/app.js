/* =========================================================
   Happy Birthday — Aanya
   Screen navigation, balloon pop, candle blow (tap + mic),
   swipe deck for memories, floating hearts, confetti.
   ========================================================= */

(() => {
  'use strict';

  /* ---------- Screen navigation ---------- */
  const screens = Array.from(document.querySelectorAll('.screen'));
  const byName = Object.fromEntries(
    screens.map(s => [s.dataset.screen, s])
  );

  function show(name) {
    screens.forEach(s => s.classList.remove('active'));
    const el = byName[name];
    if (!el) return;
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (name === 'final') startConfetti();
    if (name === 'letter') startLetter();
  }

  /* ---------- Screen 1: welcome ---------- */
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');

  yesBtn.addEventListener('click', () => {
    tryPlayMusic();
    show('balloons');
  });

  // Playful runaway "No" button
  const runAway = () => {
    const pad = 12;
    const rect = noBtn.getBoundingClientRect();
    const maxX = window.innerWidth  - rect.width  - pad;
    const maxY = window.innerHeight - rect.height - pad;
    const x = Math.max(pad, Math.random() * maxX);
    const y = Math.max(pad, Math.random() * maxY);
    noBtn.style.position = 'fixed';
    noBtn.style.left = x + 'px';
    noBtn.style.top  = y + 'px';
    noBtn.style.transition = 'left .25s ease, top .25s ease';
  };
  noBtn.addEventListener('mouseenter', runAway);
  noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); runAway(); }, { passive: false });
  noBtn.addEventListener('click', runAway);

  /* ---------- Screen 2: balloons ---------- */
  const balloons = document.querySelectorAll('.balloon');
  const poppedEl = document.getElementById('popped');
  let popCount = 0;

  balloons.forEach(b => {
    const onPop = () => {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
      popCount++;
      poppedEl.textContent = String(popCount);
      spawnHearts(6, b.getBoundingClientRect());
      if (popCount === balloons.length) {
        setTimeout(() => show('candle'), 900);
      }
    };
    b.addEventListener('click', onPop);
  });

  /* ---------- Screen 3: candle (tap OR blow) ---------- */
  const blowBtn = document.getElementById('blowBtn');
  const flame   = document.getElementById('flame');
  const micHint = document.getElementById('micHint');

  function extinguish() {
    if (!flame) return;
    flame.style.transition = 'opacity .35s ease, transform .35s ease';
    flame.style.opacity = '0';
    flame.style.transform = 'translateX(-50%) scale(.2)';
    setTimeout(() => show('wish'), 700);
  }

  blowBtn.addEventListener('click', extinguish);

  // Try mic-based blow detection (optional; gracefully fails)
  async function tryMicBlow() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      micHint.textContent = 'Mic on — blow into it 💨';

      const loop = () => {
        if (!byName.candle.classList.contains('active')) {
          stream.getTracks().forEach(t => t.stop());
          ctx.close();
          return;
        }
        analyser.getByteTimeDomainData(data);
        // RMS-ish loudness
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (rms > 0.22) {
          stream.getTracks().forEach(t => t.stop());
          ctx.close();
          extinguish();
          return;
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      micHint.textContent = 'Just tap the button to blow the candle 💨';
    }
  }

  // Kick off mic listening only when candle screen becomes active
  const candleObserver = new MutationObserver(() => {
    if (byName.candle.classList.contains('active')) {
      tryMicBlow();
    }
  });
  candleObserver.observe(byName.candle, { attributes: true, attributeFilter: ['class'] });

  /* ---------- Screen 4: wish ---------- */
  document.getElementById('wishDoneBtn').addEventListener('click', () => show('roses'));

  /* ---------- Screen 5: roses ---------- */
  document.getElementById('rosesContinue').addEventListener('click', () => show('memories'));

  /* ---------- Screen 6: memories (swipe deck) ---------- */
  // Add real photos in images/memories/ and update this array.
  // If image fails to load or is missing, we show a heart emoji placeholder.
  const memories = [
    { img: 'images/memories/1.jpeg', caption: 'Celebrating you 🎉' },
    { img: 'images/memories/2.jpg', caption: 'Our little adventures 💫' },
    { img: 'images/memories/3.jpg', caption: 'That perfect evening 🌙' },
    { img: 'images/memories/4.jpg', caption: 'Us, always 💗' },
  ];

  const deck = document.getElementById('deck');
  const memoriesContinue = document.getElementById('memoriesContinue');

  function buildDeck() {
    deck.innerHTML = '';
    // Append from bottom-most memory to top-most so the visually top card is
    // both the last DOM child AND has the highest z-index.
    for (let i = memories.length - 1; i >= 0; i--) {
      const m = memories[i];
      const card = document.createElement('div');
      card.className = 'card';
      card.style.zIndex = String(memories.length - i);
      const scale = 1 - i * 0.04;
      const offsetY = i * 8;
      card.style.transform = `translateY(${offsetY}px) scale(${scale})`;

      card.innerHTML = `
        <div class="save-badge">💗 Save</div>
        <div class="photo" style="background-image:url('${m.img}')">
          <span class="ph">💖</span>
        </div>
        <div class="caption">${m.caption}</div>
      `;

      const test = new Image();
      test.onload = () => {
        const ph = card.querySelector('.ph');
        if (ph) ph.remove();
      };
      test.src = m.img;

      attachSwipe(card);
      deck.appendChild(card);
    }
  }

  function topCard() {
    const cards = deck.querySelectorAll('.card');
    return cards[cards.length - 1];
  }

  function attachSwipe(card) {
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;

    const onDown = (e) => {
      if (card !== topCard()) return;
      dragging = true;
      const p = 'touches' in e ? e.touches[0] : e;
      startX = p.clientX; startY = p.clientY;
      card.style.transition = 'none';
    };
    const onMove = (e) => {
      if (!dragging) return;
      const p = 'touches' in e ? e.touches[0] : e;
      dx = p.clientX - startX;
      dy = p.clientY - startY;
      const rot = dx / 20;
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      if (e.cancelable) e.preventDefault();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      card.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s';
      if (Math.abs(dx) > 120) {
        const dir = dx > 0 ? 1 : -1;
        card.style.transform = `translate(${dir * 600}px, ${dy}px) rotate(${dir * 30}deg)`;
        card.style.opacity = '0';
        setTimeout(() => {
          card.remove();
          restack();
          if (!deck.querySelector('.card')) {
            memoriesContinue.classList.remove('hidden');
          }
        }, 300);
      } else {
        card.style.transform = '';
      }
      dx = 0; dy = 0;
    };

    card.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    card.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
  }

  function restack() {
    const cards = Array.from(deck.querySelectorAll('.card'));
    const n = cards.length;
    cards.forEach((c, i) => {
      const idx = n - 1 - i;
      const scale = 1 - idx * 0.04;
      const offsetY = idx * 8;
      c.style.transform = `translateY(${offsetY}px) scale(${scale})`;
    });
  }

  memoriesContinue.addEventListener('click', () => show('envelope'));

  buildDeck();

  /* ---------- Screen 7: envelope ---------- */
  const envelope = document.getElementById('envelope');
  const envHint  = document.getElementById('envHint');

  envelope.addEventListener('click', () => {
    if (envelope.classList.contains('open')) return;
    envelope.classList.add('open');
    envHint.textContent = 'Reading it out loud in my head 💗';
    spawnHearts(8, envelope.getBoundingClientRect());
    setTimeout(() => show('letter'), 1500);
  });

  /* ---------- Screen 8: handwritten letter ---------- */
  // Edit these lines to change the letter. Order = writing order.
  const letterLines = [
    { text: 'Dear AANYA SHARMA,', cls: 'salutation' },
    { text: 'Happy Birthday to someone truly special! 🎂' },
    { text: 'You are sweet, loyal, my rock, and I’m so grateful to have you in my life.' },
    { text: 'You bring so much warmth and sweetness into my life. Every moment with you is precious.' },
    { text: 'On your special day, I wish you endless love, laughter, and every little thing your heart hopes for.' },
    { text: '— Yours forever 💗', cls: 'sign' },
  ];

  const letterBody     = document.getElementById('letterBody');
  const letterContinue = document.getElementById('letterContinue');
  const skipBtn        = document.getElementById('skipTyping');

  let letterChars   = [];
  let letterPen     = null;
  let letterTimer   = null;
  let letterStarted = false;

  function buildLetter() {
    clearTimeout(letterTimer);
    letterStarted = false;
    letterChars = [];
    letterBody.innerHTML = '';

    letterLines.forEach(line => {
      const p = document.createElement('p');
      p.className = 'l-line' + (line.cls ? ' ' + line.cls : '');
      const words = line.text.split(' ');
      words.forEach((word, i) => {
        const w = document.createElement('span');
        w.className = 'l-word';
        // Array.from keeps emoji (surrogate pairs) in one piece.
        Array.from(word).forEach(ch => {
          const c = document.createElement('span');
          c.className = 'l-char';
          c.textContent = ch;
          w.appendChild(c);
          letterChars.push(c);
        });
        p.appendChild(w);
        if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
      });
      letterBody.appendChild(p);
    });

    letterPen = document.createElement('span');
    letterPen.className = 'l-pen';
    letterBody.appendChild(letterPen);

    letterContinue.classList.add('hidden');
    skipBtn.classList.remove('hidden');
  }

  function movePen(charEl) {
    if (!letterPen) return;
    const r = charEl.getBoundingClientRect();
    const b = letterBody.getBoundingClientRect();
    letterPen.style.opacity = '1';
    letterPen.style.transform = `translate(${r.right - b.left}px, ${r.top - b.top}px)`;
  }

  function finishLetter() {
    clearTimeout(letterTimer);
    letterChars.forEach(c => c.classList.add('ink'));
    if (letterPen) letterPen.style.opacity = '0';
    skipBtn.classList.add('hidden');
    letterContinue.classList.remove('hidden');
  }

  function startLetter() {
    if (letterStarted) return;
    letterStarted = true;

    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { finishLetter(); return; }

    let i = 0;
    const step = () => {
      if (i >= letterChars.length) { finishLetter(); return; }
      const c = letterChars[i++];
      c.classList.add('ink');
      movePen(c);
      const ch = c.textContent;
      // Pause a beat on punctuation, like a real pen lifting.
      const delay = /[.,!?—]/.test(ch) ? 240 : 30 + Math.random() * 24;
      letterTimer = setTimeout(step, delay);
    };
    step();
  }

  skipBtn.addEventListener('click', finishLetter);
  letterContinue.addEventListener('click', () => show('final'));

  buildLetter();

  /* ---------- Screen 9: final ---------- */
  document.getElementById('restartBtn').addEventListener('click', () => {
    popCount = 0;
    poppedEl.textContent = '0';
    balloons.forEach(b => b.classList.remove('popped'));
    if (flame) {
      flame.style.opacity = '';
      flame.style.transform = '';
    }
    memoriesContinue.classList.add('hidden');
    buildDeck();
    envelope.classList.remove('open');
    envHint.textContent = 'Tap the envelope to open 💌';
    buildLetter();
    show('welcome');
  });

  /* ---------- Floating hearts ---------- */
  function spawnHearts(count = 1, originRect = null) {
    for (let i = 0; i < count; i++) {
      const h = document.createElement('div');
      h.className = 'floater';
      h.textContent = ['💗','💖','💕','🌸','✨'][Math.floor(Math.random() * 5)];
      const x = originRect
        ? originRect.left + originRect.width * Math.random()
        : Math.random() * window.innerWidth;
      h.style.left = x + 'px';
      h.style.fontSize = (16 + Math.random() * 20) + 'px';
      h.style.animationDuration = (5 + Math.random() * 4) + 's';
      document.body.appendChild(h);
      setTimeout(() => h.remove(), 9000);
    }
  }
  setInterval(() => spawnHearts(1), 2200);

  /* ---------- Confetti (final screen) ---------- */
  let confettiStarted = false;
  function startConfetti() {
    if (confettiStarted) return;
    confettiStarted = true;
    const container = document.querySelector('#app section[data-screen="final"] .confetti');
    if (!container) return;
    const colors = ['#e63a6b', '#ff8fb1', '#ffcf6b', '#a993e4', '#7fd1a3'];
    for (let i = 0; i < 80; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = colors[Math.floor(Math.random() * colors.length)];
      s.style.animationDuration = (3 + Math.random() * 3) + 's';
      s.style.animationDelay = (Math.random() * 2) + 's';
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(s);
    }
  }

  /* ---------- Optional background music ---------- */
  function tryPlayMusic() {
    const audio = document.getElementById('bgm');
    if (!audio) return;
    audio.volume = 0.35;
    audio.play().catch(() => { /* file missing or blocked — silent */ });
  }

})();
