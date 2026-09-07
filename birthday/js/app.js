/* =========================================================
   Happy Birthday — Aanya
   Screen navigation, balloon pop, candle blow (tap + mic),
   swipe deck for memories, scratch card, spin wheel, puzzle
   reveal, photo booth, floating hearts, confetti.
   ========================================================= */

(() => {
  'use strict';

  /* ---------- Screen navigation ---------- */
  const screens = Array.from(document.querySelectorAll('.screen'));
  const byName = Object.fromEntries(
    screens.map(s => [s.dataset.screen, s])
  );

  const musicToggle     = document.getElementById('musicToggle');
  const musicToggleIcon = musicToggle?.querySelector('.music-toggle-icon');
  const bgm = document.getElementById('bgm');
  let musicMuted = true;
  let musicStarted = false;

  function updateMusicButton() {
    if (!musicToggle) return;
    if (musicToggleIcon) musicToggleIcon.textContent = musicMuted ? '🔇' : '🔊';
    musicToggle.setAttribute('aria-label', musicMuted ? 'Turn music on' : 'Mute music');
    musicToggle.classList.toggle('playing', !musicMuted && musicStarted);
  }

  function pauseMusic() {
    if (!bgm) return;
    bgm.pause();
    bgm.currentTime = 0;
  }

  function setMusicMuted(muted) {
    if (!bgm) return;
    musicMuted = muted;
    bgm.muted = muted;
    if (musicMuted) {
      bgm.pause();
    }
    updateMusicButton();
  }

  function tryPlayMusic() {
    if (!bgm || musicMuted || !bgm.src) return;
    if (musicStarted) {
      bgm.play().catch(() => {});
      updateMusicButton();
      return;
    }
    musicStarted = true;
    bgm.volume = 0.35;
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
    updateMusicButton();
  }

  function revealMusicToggle() {
    musicToggle?.classList.remove('hidden');
  }

  if (musicToggle) {
    updateMusicButton();
    musicToggle.addEventListener('click', () => {
      const nextMuted = !musicMuted;
      setMusicMuted(nextMuted);
      if (!nextMuted) {
        tryPlayMusic();
      }
    });
  }

  function show(name) {
    screens.forEach(s => s.classList.remove('active'));
    const el = byName[name];
    if (!el) return;
    el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (name === 'welcome') { pauseMusic(); resetQuiz(); }
    if (name === 'final') startConfetti();
    if (name === 'letter') startLetter();
    if (name === 'scratch') sizeScratchCanvas();
    syncDevNav();
  }

  /* ---------- Dev screen skipper ----------------------------------------
     Testing aid only: jump straight to any screen without playing through.
     Add ?dev=0 to the URL (or delete this block) before sharing the page.
     Press "d" to hide/show the bar. */
  const DEV_NAV = new URLSearchParams(location.search).get('dev') !== '0';
  let devSelect = null;

  function syncDevNav() {
    if (!devSelect) return;
    const active = screens.find(s => s.classList.contains('active'));
    if (active) devSelect.value = active.dataset.screen;
  }

  function buildDevNav() {
    const bar = document.createElement('div');
    bar.className = 'dev-nav';
    bar.innerHTML = `
      <button type="button" class="dev-btn" data-dev="prev" title="Previous screen">‹</button>
      <select class="dev-select" aria-label="Jump to screen"></select>
      <button type="button" class="dev-btn" data-dev="next" title="Next screen">Skip ›</button>
      <button type="button" class="dev-btn dev-close" data-dev="hide" title="Hide (press d)">✕</button>
    `;

    devSelect = bar.querySelector('.dev-select');
    screens.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = s.dataset.screen;
      opt.textContent = `${i + 1}. ${s.dataset.screen}`;
      devSelect.appendChild(opt);
    });
    devSelect.addEventListener('change', () => show(devSelect.value));

    bar.addEventListener('click', e => {
      const action = e.target.closest('[data-dev]')?.dataset.dev;
      if (!action) return;
      if (action === 'hide') { bar.classList.add('hidden'); return; }
      const i = screens.findIndex(s => s.classList.contains('active'));
      const target = screens[action === 'next' ? i + 1 : i - 1];
      if (target) show(target.dataset.screen);
    });

    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      if (e.key === 'd' && !/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) {
        bar.classList.toggle('hidden');
      }
    });

    document.body.appendChild(bar);
    syncDevNav();
  }

  if (DEV_NAV) buildDevNav();

  // Tries to load a real photo over a CSS gradient placeholder.
  // If the file is missing, the gradient (and any placeholder emoji) stays put.
  function setBgFallback(el, src) {
    if (!el) return;
    const test = new Image();
    test.onload = () => {
      el.style.backgroundImage = `url('${src}')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.classList.add('has-photo');
    };
    test.src = src;
  }

  /* ---------- Screen 1: welcome ---------- */
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');

  yesBtn.addEventListener('click', () => {
    show('songs');
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

  /* ---------- Screen 1.5: pick a song ---------- */
  // Drop matching photos in images/songs/1.jpg .. 5.jpg and audio in audio/song1.mp3 .. song5.mp3.
  // The song name shown is derived from the audio file name (see data-src), so just
  // point data-src at your actual mp3 file and the label updates automatically.
  const songOptions = Array.from(document.querySelectorAll('.song-option'));
  const songsContinue = document.getElementById('songsContinue');

  function filenameToTitle(path) {
    const base = decodeURIComponent(path.split('/').pop() || '');
    const withoutExt = base.replace(/\.[^.]+$/, '');
    const spaced = withoutExt.replace(/[-_]+/g, ' ').trim();
    return spaced.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
  }

  songOptions.forEach(opt => {
    const num = opt.dataset.song;
    setBgFallback(opt.querySelector('.song-photo'), `images/songs/${num}.jpg`);

    const nameEl = opt.querySelector('.song-name');
    if (nameEl && opt.dataset.src) {
      const title = filenameToTitle(opt.dataset.src);
      if (title) nameEl.textContent = title;
    }

    opt.addEventListener('click', () => {
      songOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');

      const src = opt.dataset.src;
      if (bgm && src) {
        bgm.src = src;
        bgm.load();
      }
      revealMusicToggle();
      setMusicMuted(false);
      tryPlayMusic();

      songsContinue.classList.remove('hidden');
    });
  });

  songsContinue.addEventListener('click', () => show('balloons'));

  function resetSongPick() {
    songOptions.forEach(o => o.classList.remove('selected'));
    songsContinue.classList.add('hidden');
  }

  /* ---------- Screen 2: balloons ---------- */
  const balloons = document.querySelectorAll('.balloon');
  const poppedEl = document.getElementById('popped');
  const balloonsContinue = document.getElementById('balloonsContinue');
  const balloonColors = { pink: '#ff8fb1', green: '#7fd1a3', purple: '#a993e4', yellow: '#ffcf6b' };
  let popCount = 0;

  function popBurst(rect, color) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hex = balloonColors[color] || '#ff8fb1';
    const count = 14;
    for (let i = 0; i < count; i++) {
      const shard = document.createElement('span');
      shard.className = 'pop-shard';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 60 + Math.random() * 50;
      shard.style.left = cx + 'px';
      shard.style.top = cy + 'px';
      shard.style.background = hex;
      shard.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      shard.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      document.body.appendChild(shard);
      setTimeout(() => shard.remove(), 650);
    }
  }

  balloons.forEach(b => {
    const onPop = () => {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
      popCount++;
      poppedEl.textContent = String(popCount);
      const rect = b.getBoundingClientRect();
      popBurst(rect, b.dataset.color);
      spawnHearts(4, rect);
      if (popCount === balloons.length) {
        setTimeout(() => balloonsContinue.classList.remove('hidden'), 500);
      }
    };
    b.addEventListener('click', onPop);
  });

  balloonsContinue.addEventListener('click', () => show('candle'));

  function resetBalloons() {
    popCount = 0;
    poppedEl.textContent = '0';
    balloons.forEach(b => b.classList.remove('popped'));
    balloonsContinue.classList.add('hidden');
  }

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
    { img: 'images/memories/2.jpeg', caption: 'Our little adventures 💫' },
    { img: 'images/memories/3.jpeg', caption: 'That perfect evening 🌙' },
    { img: 'images/memories/4.jpeg', caption: 'Us, always 💗' },
    { img: 'images/memories/5.jpeg', caption: 'Us, always 💗' },
    { img: 'images/memories/6.jpeg', caption: 'Beautiful moments 🌺' },
    { img: 'images/memories/7.jpeg', caption: 'Laughing together 😄' },
    { img: 'images/memories/8.jpeg', caption: 'Our story 📖' },
    { img: 'images/memories/9.jpeg', caption: 'Forever memories 💌' },
    { img: 'images/memories/10.jpeg', caption: 'All my love 💕' },
  ];

  const deck = document.getElementById('deck');
  const memoriesContinue = document.getElementById('memoriesContinue');
  const memoriesSubtitle = document.getElementById('memoriesSubtitle');
  const filmstrip = document.getElementById('filmstrip');
  const filmTrack = document.getElementById('filmTrack');

  // Every photo, looping forever as a film reel once the deck is empty.
  function showFilmstrip() {
    filmTrack.innerHTML = '';
    // Two identical passes: the -50% keyframe lands exactly on the second copy.
    for (let pass = 0; pass < 2; pass++) {
      memories.forEach(m => {
        const frame = document.createElement('div');
        frame.className = 'film-frame';
        frame.innerHTML = `<div class="film-photo"><span class="ph">💖</span></div>`;
        const photo = frame.querySelector('.film-photo');
        const test = new Image();
        test.onload = () => {
          photo.style.backgroundImage = `url('${m.img}')`;
          photo.querySelector('.ph')?.remove();
        };
        test.src = m.img;
        filmTrack.appendChild(frame);
      });
    }
    // One steady speed regardless of how many photos are in the array.
    filmTrack.style.animationDuration = `${memories.length * 3}s`;

    deck.classList.add('hidden');
    filmstrip.classList.remove('hidden');
    memoriesSubtitle.textContent = 'All of them, on repeat 🎞️';
  }

  function hideFilmstrip() {
    filmstrip.classList.add('hidden');
    filmTrack.innerHTML = '';
    deck.classList.remove('hidden');
    memoriesSubtitle.textContent = '(Swipe / drag the cards)';
  }

  function buildDeck() {
    hideFilmstrip();
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
            showFilmstrip();
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

  memoriesContinue.addEventListener('click', () => show('scratch'));

  buildDeck();

  /* ---------- Screen 7: scratch card ---------- */
  const scratchCanvas   = document.getElementById('scratchCanvas');
  const scratchCtx      = scratchCanvas.getContext('2d');
  const scratchContinue = document.getElementById('scratchContinue');
  const scratchHint     = document.getElementById('scratchHint');
  let scratchDone = false;
  let scratchDrawing = false;
  let scratchMoveCount = 0;

  function drawFoil() {
    const w = scratchCanvas.width, h = scratchCanvas.height;
    if (!w || !h) return;
    scratchCtx.globalCompositeOperation = 'source-over';
    const grad = scratchCtx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#dfe4ea');
    grad.addColorStop(.5, '#f4f6f9');
    grad.addColorStop(1, '#c7ccd6');
    scratchCtx.fillStyle = grad;
    scratchCtx.fillRect(0, 0, w, h);
    scratchCtx.fillStyle = 'rgba(58,26,36,.75)';
    scratchCtx.font = `600 ${Math.max(14, w * .06)}px 'Poppins', sans-serif`;
    scratchCtx.textAlign = 'center';
    scratchCtx.textBaseline = 'middle';
    scratchCtx.fillText('✨ Scratch here ✨', w / 2, h / 2);
  }

  function sizeScratchCanvas() {
    const rect = scratchCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      requestAnimationFrame(sizeScratchCanvas);
      return;
    }
    scratchCanvas.width = rect.width;
    scratchCanvas.height = rect.height;
    if (!scratchDone) drawFoil();
  }

  function scratchAt(x, y) {
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(x, y, 22, 0, Math.PI * 2);
    scratchCtx.fill();
  }

  function scratchedFraction() {
    const w = scratchCanvas.width, h = scratchCanvas.height;
    if (!w || !h) return 0;
    const step = 10;
    const data = scratchCtx.getImageData(0, 0, w, h).data;
    let cleared = 0, total = 0;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        total++;
        if (data[(y * w + x) * 4 + 3] < 30) cleared++;
      }
    }
    return total ? cleared / total : 0;
  }

  function finishScratch() {
    if (scratchDone) return;
    scratchDone = true;
    scratchCanvas.classList.add('done');
    scratchHint.textContent = 'You found it! 🎉';
    scratchContinue.classList.remove('hidden');
    spawnHearts(8, scratchCanvas.getBoundingClientRect());
  }

  function scratchPointerPos(e) {
    const rect = scratchCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  scratchCanvas.addEventListener('pointerdown', (e) => {
    if (scratchDone) return;
    scratchDrawing = true;
    const p = scratchPointerPos(e);
    scratchAt(p.x, p.y);
  });
  scratchCanvas.addEventListener('pointermove', (e) => {
    if (!scratchDrawing || scratchDone) return;
    const p = scratchPointerPos(e);
    scratchAt(p.x, p.y);
    scratchMoveCount++;
    if (scratchMoveCount % 4 === 0 && scratchedFraction() > 0.55) finishScratch();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt =>
    scratchCanvas.addEventListener(evt, () => { scratchDrawing = false; })
  );
  window.addEventListener('resize', () => {
    if (byName.scratch.classList.contains('active')) sizeScratchCanvas();
  });

  scratchContinue.addEventListener('click', () => show('wheel'));

  function resetScratch() {
    scratchDone = false;
    scratchMoveCount = 0;
    scratchCanvas.classList.remove('done');
    scratchContinue.classList.add('hidden');
    scratchHint.textContent = 'Scratch the card with your finger ✨';
  }

  /* ---------- Screen 8: spin the wheel ---------- */
  const wheelEl        = document.getElementById('wheel');
  const wheelSpinBtn    = document.getElementById('wheelSpinBtn');
  const wheelResult     = document.getElementById('wheelResult');
  const wheelResultText = document.getElementById('wheelResultText');
  const wheelPromises = [
    { emoji: '👜', label: 'Hand Bag',     text: 'Pick any hand bag you like — I am ordering it to your door 👜' },
    { emoji: '📱', label: 'Mobile Cover', text: 'A cute mobile cover, ordered and on its way to you 📱' },
    { emoji: '👠', label: 'Shoes',        text: 'Send me the link — those shoes are getting delivered to you 👠' },
    { emoji: '👗', label: 'Dress',        text: 'Any dress you want, ordered straight to your place 👗' },
    { emoji: '💆', label: 'Spa Day',      text: 'A spa day booked and paid for — you just have to show up 💆' },
    { emoji: '🍦', label: 'Food & Ice Cream', text: 'Your favourite food plus ice cream, delivered to your door 🍦' },
  ];
  let wheelSpun = false;
  let wheelWon = null;   // the promise she landed on — shared in the WhatsApp message

  function buildWheel() {
    wheelEl.innerHTML = '';
    const n = wheelPromises.length;
    const step = 360 / n;
    wheelPromises.forEach((p, i) => {
      const angle = (i * step + step / 2) * Math.PI / 180;
      const label = document.createElement('div');
      label.className = 'wheel-label';
      label.style.left = (50 + 34 * Math.sin(angle)) + '%';
      label.style.top  = (50 - 34 * Math.cos(angle)) + '%';
      label.innerHTML = `<span class="wheel-label-emoji">${p.emoji}</span>${p.label}`;
      wheelEl.appendChild(label);
    });
  }
  buildWheel();

  wheelSpinBtn.addEventListener('click', () => {
    if (wheelSpun) return;
    wheelSpun = true;
    wheelSpinBtn.disabled = true;
    const n = wheelPromises.length;
    const step = 360 / n;
    const index = Math.floor(Math.random() * n);
    const centerAngle = index * step + step / 2;
    const rotation = 5 * 360 + (360 - centerAngle);
    wheelEl.style.transform = `rotate(${rotation}deg)`;
    setTimeout(() => {
      wheelWon = wheelPromises[index];
      wheelResultText.textContent = wheelWon.text;
      wheelResult.classList.remove('hidden');
      spawnHearts(6);
    }, 3050);
  });

  document.getElementById('wheelContinue').addEventListener('click', () => show('quiz'));

  function resetWheel() {
    wheelSpun = false;
    wheelWon = null;
    wheelSpinBtn.disabled = false;
    wheelResult.classList.add('hidden');
    wheelEl.style.transition = 'none';
    wheelEl.style.transform = 'rotate(0deg)';
    requestAnimationFrame(() => { wheelEl.style.transition = ''; });
  }

  /* ---------- Screen 8.5: watch quiz → share on WhatsApp ---------- */
  const MY_WHATSAPP = '919538263599';   // country code + number, digits only

  const quizForm        = document.getElementById('quizForm');
  const quizFields      = Array.from(quizForm.querySelectorAll('.quiz-input'));
  const quizHint        = document.getElementById('quizHint');
  const quizError       = document.getElementById('quizError');
  const quizShareBtn    = document.getElementById('quizShareBtn');
  const quizCopyBack    = document.getElementById('quizCopyFallbackBtn');
  const quizContinue    = document.getElementById('quizContinue');
  const quizModal       = document.getElementById('quizModal');
  const quizModalText   = document.getElementById('quizModalText');
  const quizModalCopy   = document.getElementById('quizModalCopyBtn');
  const quizModalClose  = document.getElementById('quizModalCloseBtn');
  const quizModalStatus = document.getElementById('quizModalStatus');
  const quizTeaseModal  = document.getElementById('quizTeaseModal');
  const quizTeaseOk     = document.getElementById('quizTeaseOkBtn');
  const watchModal      = document.getElementById('watchModal');
  const watchContinue   = document.getElementById('watchModalContinue');
  let quizShared = false;

  function quizMessage() {
    const lines = ['Hi Niraj 💗 Here are my answers — now where is my watch? ⌚', ''];
    quizFields.forEach((field, i) => {
      lines.push(`${i + 1}. ${field.name}: ${field.value.trim()}`);
    });
    if (wheelWon) {
      lines.push('', `🎡 And the wheel gave me: ${wheelWon.label} ${wheelWon.emoji}`);
    }
    lines.push('', 'Thank you for all of this 🥰');
    return lines.join('\n');
  }

  function quizFirstEmpty() {
    return quizFields.find(f => !f.value.trim()) || null;
  }

  function revealQuizContinue() {
    if (!quizShared || !quizContinue.classList.contains('hidden')) return;
    quizContinue.classList.remove('hidden');
    quizHint.textContent = 'Got it — you are the best 💗';
    spawnHearts(6);
  }

  function openQuizModal() {
    quizModalText.value = quizMessage();
    quizModalStatus.textContent = '';
    quizModal.classList.remove('hidden');
  }

  async function copyQuizText() {
    const text = quizModalText.value;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('no clipboard api');
      }
    } catch {
      // Older iOS Safari / non-secure contexts: fall back to selecting the textarea.
      quizModalText.focus();
      quizModalText.setSelectionRange(0, text.length);
      try {
        if (!document.execCommand('copy')) throw new Error('execCommand failed');
      } catch {
        quizModalStatus.textContent = 'Please long-press the text above and copy it 💗';
        return;
      }
    }
    quizModalStatus.textContent = 'Copied! Now paste it to me on WhatsApp 💬';
    quizShared = true;
  }

  quizShareBtn.addEventListener('click', () => {
    const empty = quizFirstEmpty();
    if (empty) {
      quizFields.forEach(f => f.classList.toggle('missing', !f.value.trim()));
      quizError.classList.remove('hidden');
      empty.focus();
      return;
    }
    quizError.classList.add('hidden');
    quizFields.forEach(f => f.classList.remove('missing'));
    // Confession first; WhatsApp opens from the modal's button so the tap that
    // opens the new tab is still a user gesture (popup blockers allow it).
    quizTeaseModal.classList.remove('hidden');
  });

  quizTeaseOk.addEventListener('click', () => {
    quizTeaseModal.classList.add('hidden');
    shareOnWhatsApp();
  });

  function shareOnWhatsApp() {
    const url = `https://wa.me/${MY_WHATSAPP}?text=${encodeURIComponent(quizMessage())}`;
    const win = window.open(url, '_blank');
    if (!win) {
      // Popup blocked, or no WhatsApp handler — offer copy + paste instead.
      openQuizModal();
      return;
    }
    quizShared = true;
    quizCopyBack.classList.remove('hidden');
    quizHint.textContent = 'Send it to me, then come back here 💗';
    // She is usually gone to WhatsApp now; the visibility listener below shows
    // Continue when she returns. This timer covers desktop, where nothing blurs.
    setTimeout(revealQuizContinue, 4000);
  }

  quizCopyBack.addEventListener('click', openQuizModal);
  quizModalCopy.addEventListener('click', copyQuizText);
  quizModalClose.addEventListener('click', () => {
    quizModal.classList.add('hidden');
    quizShared = true;
    revealQuizContinue();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revealQuizContinue();
  });
  window.addEventListener('focus', revealQuizContinue);

  quizFields.forEach(f => {
    f.addEventListener('input',  () => f.classList.remove('missing'));
    f.addEventListener('change', () => f.classList.remove('missing'));
  });

  // Continue does not leave the screen yet — first the prize reveal.
  quizContinue.addEventListener('click', () => {
    watchModal.classList.remove('hidden');
    burstConfetti(80);
    spawnHearts(8);
  });

  watchContinue.addEventListener('click', () => {
    watchModal.classList.add('hidden');
    show('puzzle');
  });

  function resetQuiz() {
    quizShared = false;
    quizForm.reset();
    quizFields.forEach(f => f.classList.remove('missing'));
    quizError.classList.add('hidden');
    quizModal.classList.add('hidden');
    quizTeaseModal.classList.add('hidden');
    watchModal.classList.add('hidden');
    quizCopyBack.classList.add('hidden');
    quizContinue.classList.add('hidden');
    quizHint.textContent = 'I want to gift you a watch — answer these first 💗';
  }

  /* ---------- Screen 9: rearrange-the-photo jigsaw ---------- */
  const puzzleGrid     = document.getElementById('puzzleGrid');
  const puzzleTitle    = document.getElementById('puzzleTitle');
  const puzzleHint     = document.getElementById('puzzleHint');
  const puzzleMoves    = document.getElementById('puzzleMoves');
  const puzzlePeek     = document.getElementById('puzzlePeek');
  const puzzleReveal   = document.getElementById('puzzleReveal');
  const puzzleContinue = document.getElementById('puzzleContinue');
  const PUZZLE_COLS = 3, PUZZLE_ROWS = 3;
  const PUZZLE_SIZE = PUZZLE_COLS * PUZZLE_ROWS;
  const PUZZLE_PHOTO = 'images/puzzle-photo.jpg';
  const PUZZLE_HINT_START  = 'Tap two pieces to swap · green dot = right spot 🧩';
  const PUZZLE_TITLE_START = 'Piece It Together';

  // order[slot] = which piece of the photo currently sits in that slot.
  let puzzleOrder    = [];
  let puzzleTiles    = [];
  let puzzleSelected = -1;
  let puzzleMoveCount = 0;
  let puzzleSolved   = false;
  let puzzleRevealing = false;
  let puzzlePeekTimer = null;
  let puzzleRevealTimer = null;
  let puzzleZoomTimer = null;
  let puzzleZoomLayer = null;
  // puzzleLookAlike[piece] = id shared by every piece that renders identically.
  // This photo has blank white corners, so two of them are indistinguishable —
  // without this, the picture can look finished while the order is still "wrong".
  let puzzleLookAlike = null;

  // A piece is home if it is the right one, or one no eye could tell apart from it.
  function pieceIsHome(piece, slot) {
    if (piece === slot) return true;
    return !!puzzleLookAlike && puzzleLookAlike[piece] === puzzleLookAlike[slot];
  }

  function puzzleIsComplete() {
    return puzzleOrder.every(pieceIsHome);
  }

  // Samples the photo on a canvas and groups cells whose pixels are ~identical.
  // Falls back to strict position matching if the canvas is unreadable (file://).
  function findLookAlikePieces() {
    const img = new Image();
    img.onload = () => {
      const S = 8;   // each piece reduced to an SxS thumbnail before comparing
      try {
        const cv = document.createElement('canvas');
        cv.width  = PUZZLE_COLS * S;
        cv.height = PUZZLE_ROWS * S;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        const data = ctx.getImageData(0, 0, cv.width, cv.height).data;

        const sigs = [];
        for (let p = 0; p < PUZZLE_SIZE; p++) {
          const ox = (p % PUZZLE_COLS) * S;
          const oy = Math.floor(p / PUZZLE_COLS) * S;
          const sig = [];
          for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
              const i = ((oy + y) * cv.width + ox + x) * 4;
              sig.push(data[i], data[i + 1], data[i + 2]);
            }
          }
          sigs.push(sig);
        }

        const groups = sigs.map((_, i) => i);
        for (let a = 0; a < PUZZLE_SIZE; a++) {
          for (let b = a + 1; b < PUZZLE_SIZE; b++) {
            if (groups[b] !== b) continue;          // already folded into a group
            let diff = 0;
            for (let k = 0; k < sigs[a].length; k++) diff += Math.abs(sigs[a][k] - sigs[b][k]);
            if (diff / sigs[a].length <= 6) groups[b] = groups[a];
          }
        }
        puzzleLookAlike = groups;
      } catch {
        puzzleLookAlike = null;
      }
      if (!puzzleSolved) {
        renderPuzzle();
        if (puzzleIsComplete()) onPuzzleSolved();   // she may have finished already
      }
    };
    img.src = PUZZLE_PHOTO;
  }
  findLookAlikePieces();

  // Each piece is the same photo, zoomed COLSx / ROWSx and offset to its own cell.
  function paintPiece(tile, piece) {
    const c = piece % PUZZLE_COLS;
    const r = Math.floor(piece / PUZZLE_COLS);
    tile.style.backgroundImage = `url('${PUZZLE_PHOTO}'), linear-gradient(135deg, #ffd1dc, #f4a6b8)`;
    tile.style.backgroundSize = `${PUZZLE_COLS * 100}% ${PUZZLE_ROWS * 100}%, cover`;
    tile.style.backgroundPosition =
      `${(c / (PUZZLE_COLS - 1)) * 100}% ${(r / (PUZZLE_ROWS - 1)) * 100}%, center`;
  }

  function renderPuzzle() {
    puzzleOrder.forEach((piece, slot) => {
      const tile = puzzleTiles[slot];
      paintPiece(tile, piece);
      tile.classList.toggle('correct', pieceIsHome(piece, slot));
      tile.classList.toggle('selected', slot === puzzleSelected);
      tile.setAttribute('aria-label', `Piece ${piece + 1} in position ${slot + 1}`);
    });
    puzzleMoves.textContent = puzzleMoveCount === 1 ? '1 move' : `${puzzleMoveCount} moves`;
  }

  function shufflePuzzleOrder() {
    let attempts = 0;
    do {
      for (let i = puzzleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [puzzleOrder[i], puzzleOrder[j]] = [puzzleOrder[j], puzzleOrder[i]];
      }
    } while (puzzleIsComplete() && ++attempts < 20);
  }

  // Flies the finished photo out of the grid to fill the screen, holds, flies back.
  function zoomSolvedPhoto() {
    const start = puzzleGrid.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.className = 'puzzle-zoom-layer';
    layer.innerHTML = `
      <div class="puzzle-zoom-photo"></div>
      <p class="puzzle-zoom-caption">Our memory, back in one piece 💖<small>tap to close</small></p>
    `;
    const photo = layer.querySelector('.puzzle-zoom-photo');
    photo.style.backgroundImage = `url('${PUZZLE_PHOTO}'), linear-gradient(135deg, #ffd1dc, #f4a6b8)`;
    setRect(photo, start);
    document.body.appendChild(layer);
    puzzleZoomLayer = layer;
    void photo.offsetWidth;   // settle the start rect so the flight animates

    const side = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.64);
    requestAnimationFrame(() => {
      layer.classList.add('open');
      setRect(photo, {
        left: (window.innerWidth - side) / 2,
        top: (window.innerHeight - side) / 2 - window.innerHeight * 0.05,
        width: side,
        height: side,
      });
    });

    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      clearTimeout(puzzleZoomTimer);
      layer.classList.remove('open');
      setRect(photo, puzzleGrid.getBoundingClientRect());  // re-measure in case of scroll/resize
      setTimeout(() => {
        layer.remove();
        if (puzzleZoomLayer === layer) puzzleZoomLayer = null;
        if (puzzleSolved) puzzleContinue.classList.remove('hidden');
      }, 680);
    };

    layer.addEventListener('click', close);
    puzzleZoomTimer = setTimeout(close, 3400);
  }

  function setRect(el, r) {
    el.style.left   = r.left + 'px';
    el.style.top    = r.top + 'px';
    el.style.width  = r.width + 'px';
    el.style.height = r.height + 'px';
  }

  function onPuzzleSolved(revealed = false) {
    puzzleSolved = true;
    puzzleSelected = -1;
    puzzleGrid.classList.remove('peeking');
    puzzleGrid.classList.add('solved');
    puzzleTitle.textContent = revealed ? 'Here It Is 💗' : 'You Did It! 🎉';
    puzzleHint.textContent = revealed
      ? 'Our memory, back in one piece'
      : `Pieced together in ${puzzleMoveCount} moves 💖`;
    puzzlePeek.classList.add('hidden');
    puzzleReveal.classList.add('hidden');

    burstConfetti(75);
    spawnHearts(14, puzzleGrid.getBoundingClientRect());

    // Wait for the gaps to collapse into one photo before flying it out.
    puzzleZoomTimer = setTimeout(zoomSolvedPhoto, 560);
  }

  // "I give up": walk the pieces home one swap at a time so she still sees it
  // come together, then run the same celebration.
  function revealPuzzle() {
    if (puzzleSolved || puzzleRevealing) return;
    puzzleRevealing = true;
    puzzleSelected = -1;
    puzzlePeek.classList.add('hidden');
    puzzleReveal.classList.add('hidden');
    puzzleHint.textContent = 'Letting the pieces find their way home 💗';
    renderPuzzle();

    let slot = 0;
    const stepHome = () => {
      while (slot < PUZZLE_SIZE && puzzleOrder[slot] === slot) slot++;
      if (slot >= PUZZLE_SIZE) {
        puzzleRevealing = false;
        onPuzzleSolved(true);
        return;
      }
      const from = puzzleOrder.indexOf(slot);   // always ahead: earlier slots are settled
      [puzzleOrder[from], puzzleOrder[slot]] = [puzzleOrder[slot], puzzleOrder[from]];
      renderPuzzle();
      popTiles(from, slot);
      puzzleRevealTimer = setTimeout(stepHome, 260);
    };
    puzzleRevealTimer = setTimeout(stepHome, 320);
  }

  function popTiles(...slots) {
    slots.forEach(i => {
      const tile = puzzleTiles[i];
      tile.classList.remove('swapping');
      void tile.offsetWidth;         // restart the pop animation
      tile.classList.add('swapping');
    });
  }

  function tapPuzzleSlot(slot) {
    if (puzzleSolved || puzzleRevealing) return;

    if (puzzleSelected === -1) {
      puzzleSelected = slot;
      renderPuzzle();
      return;
    }
    if (puzzleSelected === slot) {   // tap the same piece again to deselect
      puzzleSelected = -1;
      renderPuzzle();
      return;
    }

    const from = puzzleSelected;
    [puzzleOrder[from], puzzleOrder[slot]] = [puzzleOrder[slot], puzzleOrder[from]];
    puzzleSelected = -1;
    puzzleMoveCount++;
    renderPuzzle();

    popTiles(from, slot);

    if (puzzleIsComplete()) onPuzzleSolved();
  }

  function buildPuzzle() {
    clearTimeout(puzzlePeekTimer);
    clearTimeout(puzzleRevealTimer);
    clearTimeout(puzzleZoomTimer);
    puzzleZoomLayer?.remove();
    puzzleZoomLayer = null;
    puzzleGrid.innerHTML = '';
    puzzleGrid.classList.remove('solved', 'peeking');
    puzzleTiles = [];
    puzzleSelected = -1;
    puzzleMoveCount = 0;
    puzzleSolved = false;
    puzzleRevealing = false;
    puzzleTitle.textContent = PUZZLE_TITLE_START;
    puzzleHint.textContent = PUZZLE_HINT_START;
    puzzlePeek.classList.remove('hidden');
    puzzleReveal.classList.remove('hidden');
    puzzleContinue.classList.add('hidden');

    puzzleOrder = Array.from({ length: PUZZLE_SIZE }, (_, i) => i);
    shufflePuzzleOrder();

    for (let slot = 0; slot < PUZZLE_SIZE; slot++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'puzzle-tile';
      tile.addEventListener('click', () => tapPuzzleSlot(slot));
      puzzleTiles.push(tile);
      puzzleGrid.appendChild(tile);
    }

    const peek = document.createElement('div');
    peek.className = 'puzzle-peek';
    peek.setAttribute('aria-hidden', 'true');
    peek.style.backgroundImage = `url('${PUZZLE_PHOTO}'), linear-gradient(135deg, #ffd1dc, #f4a6b8)`;
    puzzleGrid.appendChild(peek);

    renderPuzzle();
  }
  buildPuzzle();

  puzzleReveal.addEventListener('click', revealPuzzle);

  puzzlePeek.addEventListener('click', () => {
    if (puzzleSolved) return;
    clearTimeout(puzzlePeekTimer);
    puzzleGrid.classList.add('peeking');
    puzzlePeekTimer = setTimeout(() => puzzleGrid.classList.remove('peeking'), 1200);
  });

  puzzleContinue.addEventListener('click', () => show('polaroid'));

  /* ---------- Screen 10: photo booth ---------- */
  const shutterBtn       = document.getElementById('shutterBtn');
  const flashEl          = document.getElementById('flash');
  const polaroidEl       = document.getElementById('polaroid');
  const polaroidHint     = document.getElementById('polaroidHint');
  const polaroidContinue = document.getElementById('polaroidContinue');

  setBgFallback(polaroidEl.querySelector('.polaroid-photo'), 'images/polaroid-1.jpg');

  shutterBtn.addEventListener('click', () => {
    if (shutterBtn.disabled) return;
    shutterBtn.disabled = true;
    flashEl.classList.add('active');
    spawnHearts(4, shutterBtn.getBoundingClientRect());
    setTimeout(() => flashEl.classList.remove('active'), 500);
    setTimeout(() => {
      polaroidEl.classList.add('developed');
      polaroidHint.textContent = 'Developing your image 💗';
    }, 250);
    setTimeout(() => polaroidContinue.classList.remove('hidden'), 1400);
  });

  polaroidContinue.addEventListener('click', () => show('envelope'));

  function resetPolaroid() {
    shutterBtn.disabled = false;
    polaroidEl.classList.remove('developed');
    polaroidHint.textContent = 'Tap the shutter 📸';
    polaroidContinue.classList.add('hidden');
  }

  /* ---------- Screen 11: envelope ---------- */
  const envelope = document.getElementById('envelope');
  const envHint  = document.getElementById('envHint');

  envelope.addEventListener('click', () => {
    if (envelope.classList.contains('open')) return;
    envelope.classList.add('open');
    envHint.textContent = 'Reading it out loud in my head 💗';
    spawnHearts(8, envelope.getBoundingClientRect());
    setTimeout(() => show('letter'), 1500);
  });

  /* ---------- Screen 12: handwritten letter ---------- */
  // Edit these lines to change the letter. Order = writing order.
  const letterLines = [
    { text: 'Dear Vinmaa,', cls: 'salutation' },
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
  letterContinue.addEventListener('click', () => show('gift'));

  buildLetter();

  /* ---------- Screen 13: gift ---------- */
  const giftBox = document.getElementById('giftBox');

  giftBox.addEventListener('click', () => {
    if (giftBox.classList.contains('opened')) return;
    giftBox.classList.add('opened');
    giftBox.textContent = '🎉';
    spawnHearts(10, giftBox.getBoundingClientRect());
    setTimeout(() => show('final'), 900);
  });

  /* ---------- Screen 14: final ---------- */
  document.getElementById('restartBtn').addEventListener('click', () => {
    musicStarted = false;
    musicMuted = true;
    pauseMusic();
    if (bgm) bgm.removeAttribute('src');
    musicToggle?.classList.add('hidden');
    musicToggle?.classList.remove('playing');
    updateMusicButton();
    resetSongPick();
    resetBalloons();
    if (flame) {
      flame.style.opacity = '';
      flame.style.transform = '';
    }
    memoriesContinue.classList.add('hidden');
    buildDeck();
    resetScratch();
    resetWheel();
    resetQuiz();
    buildPuzzle();
    resetPolaroid();
    envelope.classList.remove('open');
    envHint.textContent = 'Tap the envelope to open 💌';
    buildLetter();
    giftBox.classList.remove('opened');
    giftBox.textContent = '🎁';
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

  /* ---------- Confetti ---------- */
  const CONFETTI_COLORS = ['#e63a6b', '#ff8fb1', '#ffcf6b', '#a993e4', '#7fd1a3'];

  // One-shot burst on its own fixed layer, cleaned up once the last piece lands.
  function burstConfetti(count = 70) {
    const layer = document.createElement('div');
    layer.className = 'burst-layer';
    layer.setAttribute('aria-hidden', 'true');
    let longest = 0;
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      const dur = 2.4 + Math.random() * 1.8;
      const delay = Math.random() * 0.8;
      s.style.left = Math.random() * 100 + '%';
      s.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      s.style.animationDuration = dur + 's';
      s.style.animationDelay = delay + 's';
      longest = Math.max(longest, dur + delay);
      layer.appendChild(s);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), (longest + 0.4) * 1000);
  }

  /* ---------- Confetti (final screen) ---------- */
  let confettiStarted = false;
  function startConfetti() {
    if (confettiStarted) return;
    confettiStarted = true;
    const container = document.querySelector('#app section[data-screen="final"] .confetti');
    if (!container) return;
    for (let i = 0; i < 80; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      s.style.animationDuration = (3 + Math.random() * 3) + 's';
      s.style.animationDelay = (Math.random() * 2) + 's';
      s.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(s);
    }
  }

  /* Nothing here is saved — no localStorage, no cookies. But browsers refill
     text inputs themselves after a refresh or a back/forward (bfcache) restore,
     so wipe the quiz on every page show to start her off with a blank card. */
  window.addEventListener('pageshow', resetQuiz);
  resetQuiz();

})();
