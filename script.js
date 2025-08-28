(function () {
	'use strict';

	const envelopeBtn = document.getElementById('openEnvelope');
	const messageEl = document.getElementById('message');
	const heartsLayer = document.getElementById('hearts');
	const confettiCanvas = document.getElementById('confetti');
	const bgm = document.getElementById('bgm');

	let confettiAnimationId = null;
	let heartSpawnerId = null;
	let audioContext = null;
	let audioSource = null;
	let audioGain = null;
	let fallbackAudio = null;

	function ensureAudioGraph() {
		if (!bgm) return;
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) return; // Fallback silently if WebAudio not supported
		if (!audioContext) audioContext = new Ctx();
		if (audioContext.state === 'suspended') {
			audioContext.resume().catch(() => {});
		}
		if (!audioSource) {
			audioSource = audioContext.createMediaElementSource(bgm);
			audioGain = audioContext.createGain();
			audioGain.gain.value = 1.15; // gentle boost
			audioSource.connect(audioGain).connect(audioContext.destination);
		}
	}

	function reveal() {
		// Show message with effects and play music
		document.body.classList.add('revealed');
		messageEl.classList.remove('hidden');
		startConfetti(14000);
		startHearts(14000);
		// Hide envelope after opening to avoid overlapping the headline
		envelopeBtn.classList.add('envelope-gone');
		setTimeout(() => { try { envelopeBtn.remove(); } catch (_) {} }, 700);
		if (bgm) {
			bgm.muted = false;
			bgm.loop = true;
			bgm.playbackRate = 1.0;
			bgm.currentTime = 0;
			bgm.volume = 1.0;
			ensureAudioGraph();
			const tryPlayNow = () => bgm.play().catch(() => {});
			if (bgm.readyState < 3) {
				bgm.addEventListener('canplaythrough', tryPlayNow, { once: true });
			} else {
				tryPlayNow();
			}
			// Retry shortly in case the first attempt races with decoding
			setTimeout(() => {
				if (bgm.paused || bgm.currentTime === 0) {
					ensureAudioGraph();
					bgm.play().catch(() => {});
				}
			}, 400);
			// Final fallback: if still silent after 1s, spawn a fresh Audio()
			setTimeout(() => {
				if (bgm.paused || bgm.currentTime < 0.1) {
					try {
						if (fallbackAudio) { try { fallbackAudio.pause(); } catch (_) {} }
						fallbackAudio = new Audio('IkawLamang.mp3');
						fallbackAudio.loop = true;
						fallbackAudio.volume = 1.0;
						fallbackAudio.play().catch(() => {});
					} catch (_) {}
				}
			}, 1000);
			bgm.play().catch(() => {
				// If autoplay is blocked, attach a one-time fallback to next user interaction
				const tryPlay = () => {
					ensureAudioGraph();
					bgm.play().catch(() => {}).finally(() => {
						document.removeEventListener('click', tryPlay, true);
						document.removeEventListener('keydown', tryPlay, true);
						document.removeEventListener('touchstart', tryPlay, true);
					});
				};
				document.addEventListener('click', tryPlay, true);
				document.addEventListener('keydown', tryPlay, true);
				document.addEventListener('touchstart', tryPlay, true);
			});
		}
	}

	function startHearts(durationMs) {
		const startTime = performance.now();
		function spawnOneHeart() {
			const now = performance.now();
			if (now - startTime > durationMs) return;
			const heart = document.createElement('div');
			heart.className = 'heart';
			const left = Math.random() * 100; // vw
			const size = 8 + Math.random() * 20; // px
			const delay = Math.random() * 0.3; // s
			heart.style.left = left + 'vw';
			heart.style.bottom = '-24px';
			heart.style.width = size + 'px';
			heart.style.height = size + 'px';
			heart.style.animationDuration = (4 + Math.random() * 4) + 's';
			heart.style.animationDelay = delay + 's';
			heartsLayer.appendChild(heart);
			heart.addEventListener('animationend', () => {
				heart.remove();
			});
		}
		heartSpawnerId = setInterval(spawnOneHeart, 220);
		// Also spawn a burst immediately
		for (let i = 0; i < 12; i++) spawnOneHeart();
		// Stop spawner after duration
		setTimeout(() => clearInterval(heartSpawnerId), durationMs);
	}

	function startConfetti(durationMs) {
		const ctx = confettiCanvas.getContext('2d');
		const dpr = Math.max(1, window.devicePixelRatio || 1);
		function resize() {
			confettiCanvas.width = Math.floor(window.innerWidth * dpr);
			confettiCanvas.height = Math.floor(window.innerHeight * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		resize();
		window.addEventListener('resize', resize);

		const colors = ['#ff6aa2', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#ffffff'];
		const gravity = 0.25;
		const drag = 0.0025;
		const pieces = [];
		const total = 220;
		for (let i = 0; i < total; i++) {
			pieces.push(createPiece());
		}

		function createPiece() {
			const x = Math.random() * window.innerWidth;
			const y = -20 + Math.random() * -window.innerHeight * 0.25;
			const size = 6 + Math.random() * 10;
			const color = colors[(Math.random() * colors.length) | 0];
			const tilt = Math.random() * Math.PI;
			const tiltSpeed = (Math.random() - 0.5) * 0.2;
			const vx = (Math.random() - 0.5) * 6;
			const vy = 1 + Math.random() * 3;
			return { x, y, size, color, tilt, tiltSpeed, vx, vy };
		}

		const startTime = performance.now();
		function frame() {
			const t = performance.now();
			ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
			for (const p of pieces) {
				p.vy += gravity;
				p.vx *= (1 - drag);
				p.x += p.vx;
				p.y += p.vy;
				p.tilt += p.tiltSpeed;
				// recycle
				if (p.y > window.innerHeight + 40) {
					p.x = Math.random() * window.innerWidth;
					p.y = -20;
					p.vx = (Math.random() - 0.5) * 6;
					p.vy = 1 + Math.random() * 3;
				}
				// draw
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.tilt);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
				ctx.restore();
			}
			if (t - startTime < durationMs) {
				confettiAnimationId = requestAnimationFrame(frame);
			} else {
				cancelAnimationFrame(confettiAnimationId);
				ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
			}
		}
		confettiAnimationId = requestAnimationFrame(frame);
	}

	envelopeBtn.addEventListener('click', reveal);
})();


