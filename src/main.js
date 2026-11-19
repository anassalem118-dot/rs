(function () {
	'use strict';
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	var $ = function (s, c) { return (c || document).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

	/* ---------- Header, progress bar, parallax (one scroll loop) ---------- */
	var header = $('.rs-header'), bar = $('.rs-progress');
	var par = [], ticking = false;
	function collectParallax() {
		par = $$('[data-parallax]');
		$$('.rs-grid-projects .rs-project__media img').forEach(function (im) {
			im.setAttribute('data-parallax', '0.05');
			par.push(im);
		});
	}
	function update() {
		ticking = false;
		var y = window.scrollY, vh = window.innerHeight;
		if (header) header.classList.toggle('is-scrolled', y > 40);
		if (bar) {
			var max = document.documentElement.scrollHeight - vh;
			bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
		}
		if (reduce) return;
		par.forEach(function (el) {
			var box = el.parentElement.getBoundingClientRect();
			if (box.bottom < -100 || box.top > vh + 100) return;
			var speed = parseFloat(el.getAttribute('data-parallax')) || 0.06;
			var lim = box.height * 0.1;
			var off = ((box.top + box.height / 2) - vh / 2) * -speed;
			off = Math.max(-lim, Math.min(lim, off));
			el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
		});
	}
	function req() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
	collectParallax();
	update();
	window.addEventListener('scroll', req, { passive: true });
	window.addEventListener('resize', req);

	/* ---------- Mobile menu ---------- */
	var tgl = $('.rs-menu-toggle');
	if (tgl) {
		var setMenu = function (open) {
			document.body.classList.toggle('menu-open', open);
			tgl.setAttribute('aria-expanded', open ? 'true' : 'false');
		};
		tgl.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
		$$('.rs-nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
	}

	/* ---------- Services accordion ---------- */
	$$('button.rs-service__btn').forEach(function (b) {
		b.addEventListener('click', function () {
			var li = b.closest('.rs-service');
			var open = li.classList.toggle('is-open');
			b.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
	});

	/* ---------- Headlines split into words, reveal, counters ---------- */
	function split(el) {
		var txt = el.textContent.trim();
		if (!txt) return;
		el.setAttribute('aria-label', txt);
		el.textContent = '';
		var words = txt.split(/\s+/);
		words.forEach(function (w, i) {
			var o = document.createElement('span'), n = document.createElement('span');
			o.className = 'w';
			o.setAttribute('aria-hidden', 'true');
			n.textContent = w;
			n.style.transitionDelay = (i * 70) + 'ms';
			o.appendChild(n);
			el.appendChild(o);
			if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
		});
		if (!el.closest('.rs-reveal')) el.classList.add('rs-reveal');
	}
	window.rsSplit = split;
	$$('.rs-h2').forEach(split);

	function countUp(el) {
		var m = el.textContent.match(/^(\D*)(\d[\d,]*)(.*)$/);
		if (!m || reduce) return;
		var end = parseInt(m[2].replace(/,/g, ''), 10), t0 = null, dur = 1600;
		function step(t) {
			if (!t0) t0 = t;
			var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
			el.textContent = m[1] + Math.round(end * e) + m[3];
			if (p < 1) requestAnimationFrame(step);
		}
		el.textContent = m[1] + '0' + m[3];
		requestAnimationFrame(step);
	}
	if ('IntersectionObserver' in window) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (!e.isIntersecting) return;
				e.target.classList.add('is-in');
				$$('.rs-num', e.target).forEach(countUp);
				io.unobserve(e.target);
			});
		}, { threshold: 0.18 });
		$$('.rs-reveal').forEach(function (el) { io.observe(el); });
	} else {
		$$('.rs-reveal').forEach(function (el) { el.classList.add('is-in'); });
	}

	/* ---------- Magnetic buttons ---------- */
	if (fine && !reduce) {
		$$('[data-magnet]').forEach(function (b) {
			b.addEventListener('pointermove', function (e) {
				var r = b.getBoundingClientRect();
				var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
				var dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
				b.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
			});
			b.addEventListener('pointerleave', function () { b.style.transform = ''; });
		});
	}

	/* ---------- Cursor label on project cards ---------- */
	var cur = $('.rs-cursor');
	if (cur && fine) {
		document.addEventListener('pointermove', function (e) {
			cur.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
		}, { passive: true });
		$$('a.rs-project').forEach(function (a) {
			a.addEventListener('pointerenter', function () { cur.classList.add('on'); });
			a.addEventListener('pointerleave', function () { cur.classList.remove('on'); });
		});
	}

	/* ---------- Hero: response spectrum as a living field (p5.js) ---------- */
	function initSpectrum() {
		var host = $('#rs-spectrum');
		if (!host || !window.p5) return;
		if (host._cleanup) host._cleanup();
		if (host._p5) { host._p5.remove(); host._p5 = null; }
		var rtl = getComputedStyle(document.documentElement).direction === 'rtl';
		var small = window.innerWidth < 700;
		var M = small ? 34 : 52, PTS = small ? 80 : 120;
		var L0 = Math.log10(0.05), L1 = Math.log10(4);
		var sa = function (T, e) {
			var pl = 2.5 * e;
			if (T < 0.15) return 1 + (pl - 1) * T / 0.15;
			if (T <= 0.6) return pl;
			if (T <= 2) return pl * 0.6 / T;
			return pl * 1.2 / (T * T);
		};
		var hero = host.closest('.rs-hero');
		window.p5.disableFriendlyErrors = true;
		host._p5 = new window.p5(function (p) {
			var W = 0, H = 0, tz = 0, mx = -1, mxs = 0, dist = 0, tMark = 0, born = performance.now(), lastT = born;
			var pointer = false, pulses = [];
			var X = function (T) {
				var x = W * 0.02 + (Math.log10(T) - L0) / (L1 - L0) * W * 0.96;
				return rtl ? W - x : x;
			};
			var Y = function (s) { return H * 0.8 - s / 3 * H * 0.52; };
			var TofX = function (x) {
				var xx = rtl ? W - x : x;
				var q = Math.max(0, Math.min(1, (xx - W * 0.02) / (W * 0.96)));
				return Math.pow(10, L0 + q * (L1 - L0));
			};
			var val = function (i, xn, T) {
				var e = 0.8 + i / (M - 1) * 0.42, base = sa(T, e);
				var n = p.noise(xn * 3.2 + i * 0.05, i * 0.07 + tz) - 0.5;
				var n2 = p.noise(xn * 9 + 40 + i * 0.02, tz * 1.6 + i * 0.1) - 0.5;
				var s = base * (1 + n * 1.1 + n2 * 0.4);
				if (dist > 0.01) {
					var d = (X(T) - mxs) / (W * 0.1);
					s += Math.exp(-d * d) * 0.14 * base * dist * Math.sin(tz * 9 + i * 0.35);
				}
				return s;
			};
			var onMove = function (e) {
				var r = host.getBoundingClientRect();
				mx = e.clientX - r.left; pointer = true;
			};
			var onLeave = function () { mx = -1; pointer = false; };
			if (hero && fine && !reduce) {
				hero.addEventListener('pointermove', onMove);
				hero.addEventListener('pointerleave', onLeave);
			}
			var io = null, ro = null;
			host._cleanup = function () {
				if (hero) { hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave); }
				if (io) io.disconnect();
				if (ro) ro.disconnect();
			};
			p.setup = function () {
				p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
				W = host.clientWidth || 800; H = host.clientHeight || 600;
				p.createCanvas(W, H).parent(host);
				p.noiseSeed(11); p.randomSeed(11); p.noiseDetail(2, 0.5);
				mxs = W / 2;
				for (var k = 0; k < 9; k++) pulses.push({ i: Math.floor(p.random(6, M - 6)), ph: p.random(), sp: p.random(0.05, 0.11) });
				if (reduce) p.noLoop();
				if ('ResizeObserver' in window) {
					ro = new ResizeObserver(function () {
						if (!host.clientWidth) return;
						p.resizeCanvas(host.clientWidth, host.clientHeight);
						if (reduce) p.redraw();
					});
					ro.observe(host);
				}
				if ('IntersectionObserver' in window && !reduce) {
					io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) p.loop(); else p.noLoop(); });
					io.observe(host);
				}
			};
			p.draw = function () {
				if (!host.isConnected) { p.remove(); return; }
				W = p.width; H = p.height;
				var ctx = p.drawingContext, now = performance.now(), dt = Math.min(0.05, (now - lastT) / 1000), i, k, u, T, xn;
				lastT = now;
				var rv = reduce ? 1 : Math.min(1, (now - born) / 2800), r = 1 - Math.pow(1 - rv, 3);
				if (!reduce) tz += 0.0032;
				dist += ((mx >= 0 ? 1 : 0) - dist) * 0.08;
				if (mx >= 0) mxs += (mx - mxs) * 0.15;
				var target = pointer ? TofX(mxs) : (rv < 1 ? TofX(rtl ? W - r * W : r * W) : 0.45);
				tMark = tMark ? tMark + (target - tMark) * (reduce ? 1 : 0.12) : target;
				p.clear();

				ctx.save();
				ctx.beginPath();
				ctx.rect(rtl ? W - r * W : 0, 0, r * W + 1, H);
				ctx.clip();

				/* guides and period axis */
				var base = Y(0);
				p.strokeWeight(1);
				p.stroke(255, 255, 255, 14);
				for (k = 1; k <= 3; k++) p.line(W * 0.02, Y(k), W * 0.98, Y(k));
				p.stroke(255, 255, 255, 80);
				p.line(W * 0.02, base, W * 0.98, base);
				p.noStroke();
				p.fill(255, 255, 255, 120);
				p.textSize(12); p.textAlign(p.CENTER); p.textFont('Jura, Tajawal, sans-serif');
				[0.1, 0.2, 0.5, 1, 2, 3].forEach(function (t) {
					p.stroke(255, 255, 255, 80); p.line(X(t), base, X(t), base + 6); p.noStroke();
					p.text(t + (t === 3 ? ' s' : ''), X(t), base + 24);
				});

				/* the fan of spectra */
				p.noFill();
				for (i = 0; i < M; i++) {
					u = i / (M - 1);
					p.stroke(255, 255, 255, 10 + 44 * Math.pow(1 - Math.abs(u - 0.5) * 2, 1.4));
					p.beginShape();
					for (k = 0; k <= PTS; k++) {
						xn = k / PTS; T = Math.pow(10, L0 + xn * (L1 - L0));
						p.vertex(X(T), Y(val(i, xn, T)) - (u - 0.5) * 16);
					}
					p.endShape();
				}

				/* design spectrum: filled, glowing, gold */
				var gx = [], gy = [];
				for (k = 0; k <= PTS; k++) {
					T = Math.pow(10, L0 + k / PTS * (L1 - L0));
					gx.push(X(T)); gy.push(Y(sa(T, 1)));
				}
				var grad = ctx.createLinearGradient(0, Y(2.6), 0, base);
				grad.addColorStop(0, 'rgba(242,181,43,0.22)'); grad.addColorStop(1, 'rgba(242,181,43,0)');
				ctx.fillStyle = grad;
				ctx.beginPath(); ctx.moveTo(gx[0], base);
				for (k = 0; k <= PTS; k++) ctx.lineTo(gx[k], gy[k]);
				ctx.lineTo(gx[PTS], base); ctx.closePath(); ctx.fill();
				ctx.shadowColor = 'rgba(242,181,43,0.9)'; ctx.shadowBlur = 20;
				ctx.strokeStyle = 'rgba(242,181,43,0.95)'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
				ctx.beginPath();
				for (k = 0; k <= PTS; k++) { if (k) ctx.lineTo(gx[k], gy[k]); else ctx.moveTo(gx[k], gy[k]); }
				ctx.stroke();
				ctx.shadowBlur = 0;

				/* energy travelling along the fan */
				p.noStroke();
				pulses.forEach(function (pl) {
					pl.ph += pl.sp * dt;
					if (pl.ph > 1) { pl.ph = 0; pl.i = Math.floor(p.random(6, M - 6)); }
					var tt = Math.pow(10, L0 + pl.ph * (L1 - L0)), a = Math.sin(Math.PI * pl.ph);
					var px = X(tt), py = Y(val(pl.i, pl.ph, tt)) - (pl.i / (M - 1) - 0.5) * 16;
					p.fill(242, 181, 43, 38 * a); p.circle(px, py, 11);
					p.fill(255, 226, 150, 230 * a); p.circle(px, py, 3.2);
				});

				/* marker that follows the pointer */
				var ms = sa(tMark, 1), mxp = X(tMark), myp = Y(ms);
				ctx.setLineDash([3, 6]);
				p.stroke(242, 181, 43, 150); p.line(mxp, myp, mxp, base);
				ctx.setLineDash([]);
				p.noStroke(); p.fill(242, 181, 43, 60); p.circle(mxp, myp, 24);
				p.fill(242, 181, 43); p.circle(mxp, myp, 9);
				p.fill(255, 255, 255, 215); p.textSize(13);
				p.textAlign(rtl ? p.RIGHT : p.LEFT);
				p.text('T ' + tMark.toFixed(2) + ' s    Sa ' + ms.toFixed(2) + ' g', mxp + (rtl ? -16 : 16), myp - 16);
				ctx.restore();
			};
		}, host);
	}

	/* ---------- Seismic test: 3D five-storey building (three.js) ---------- */
	function initFrame3D() {
		var cv = $('#rs-3d');
		if (!cv) return;
		var nogl = $('.rs-nogl');
		var fail = function () { if (nogl) nogl.hidden = false; cv.style.display = 'none'; };
		if (!window.THREE) { fail(); return; }
		var renderer;
		try {
			renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
		} catch (err) { fail(); return; }
		var N = 5, HS = 3.5, TT = 12, DT = 1 / 240, G = 9.81;
		var SH = 1.7, BX = 2.2, EX = 8, SC = SH / HS * EX;
		var gx = [-3.3, -1.1, 1.1, 3.3], gz = [-2.2, 0, 2.2];

		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(32, 1.2, 0.1, 100);
		var elev = 8.5, camR = 24;
		scene.add(new THREE.AmbientLight(0xffffff, 0.62));
		var sun = new THREE.DirectionalLight(0xffffff, 0.9);
		sun.position.set(6, 13, 9);
		sun.castShadow = true;
		sun.shadow.mapSize.set(1024, 1024);
		sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -9;
		sun.shadow.camera.updateProjectionMatrix();
		sun.shadow.bias = -0.0006;
		scene.add(sun);

		var root = new THREE.Group(), ground = new THREE.Group();
		root.rotation.y = -0.65;
		root.add(ground);
		scene.add(root);

		/* ground: platform, grid, wave rings */
		var plat = new THREE.Mesh(new THREE.CylinderGeometry(7, 7.3, 0.5, 72), new THREE.MeshStandardMaterial({ color: 0x3b3a3b, roughness: 0.95 }));
		plat.position.y = -0.25; plat.receiveShadow = true;
		ground.add(plat);
		var grid = new THREE.GridHelper(13, 13, 0x7a787a, 0x575556);
		grid.position.y = 0.012; grid.material.transparent = true; grid.material.opacity = 0.55;
		ground.add(grid);
		var rim = new THREE.Mesh(new THREE.RingGeometry(6.9, 7.0, 96), new THREE.MeshBasicMaterial({ color: 0xf2b52b, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
		rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02;
		ground.add(rim);
		var rings = [];
		for (var r0 = 0; r0 < 3; r0++) {
			var rg = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color: 0xf2b52b, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
			rg.rotation.x = -Math.PI / 2; rg.position.y = 0.03;
			ground.add(rg); rings.push(rg);
		}

		/* building */
		var bld = new THREE.Group();
		ground.add(bld);
		var colMats = [], colMeshes = [], i, j, s;
		var colGeo = new THREE.BoxGeometry(0.2, 1, 0.2);
		var braceGeo = new THREE.BoxGeometry(0.06, 1, 0.06);
		var braceMat = new THREE.MeshStandardMaterial({ color: 0xf2b52b, roughness: 0.5, metalness: 0.2 });
		var beamMat = new THREE.MeshStandardMaterial({ color: 0xe9e9e8, roughness: 0.7 });
		var slabMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, transparent: true, opacity: 0.8 });
		for (s = 1; s <= N; s++) {
			colMats[s] = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
			colMeshes[s] = [];
			for (i = 0; i < gx.length; i++) for (j = 0; j < gz.length; j++) {
				var cm = new THREE.Mesh(colGeo, colMats[s]);
				cm.castShadow = true; cm.userData = { a: i, b: j };
				bld.add(cm); colMeshes[s].push(cm);
			}
		}
		var footGeo = new THREE.BoxGeometry(0.62, 0.18, 0.62);
		for (i = 0; i < gx.length; i++) for (j = 0; j < gz.length; j++) {
			var ft = new THREE.Mesh(footGeo, beamMat);
			ft.position.set(gx[i], 0.09, gz[j]); ft.castShadow = true; ft.receiveShadow = true;
			bld.add(ft);
		}
		var floors = [];
		var W3 = gx[3] - gx[0], D3 = gz[2] - gz[0];
		for (s = 1; s <= N; s++) {
			var fg = new THREE.Group();
			var slab = new THREE.Mesh(new THREE.BoxGeometry(W3 + 0.5, 0.1, D3 + 0.5), slabMat);
			slab.position.y = 0.02; slab.castShadow = true; slab.receiveShadow = true;
			fg.add(slab);
			for (j = 0; j < gz.length; j++) for (i = 0; i < gx.length - 1; i++) {
				var bm = new THREE.Mesh(new THREE.BoxGeometry(BX, 0.14, 0.12), beamMat);
				bm.position.set((gx[i] + gx[i + 1]) / 2, -0.09, gz[j]); fg.add(bm);
			}
			for (i = 0; i < gx.length; i++) for (j = 0; j < gz.length - 1; j++) {
				var bz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, BX), beamMat);
				bz.position.set(gx[i], -0.09, (gz[j] + gz[j + 1]) / 2); fg.add(bz);
			}
			bld.add(fg); floors[s] = fg;
		}
		/* X-braces on four outer bays */
		var bays = [
			{ a: [1, 2], b: [2, 2] }, { a: [1, 0], b: [2, 0] },
			{ a: [3, 0], b: [3, 1] }, { a: [0, 1], b: [0, 2] }
		];
		var braceGroup = new THREE.Group(), braces = [];
		bld.add(braceGroup);
		for (s = 1; s <= N; s++) bays.forEach(function (bay) {
			for (var d = 0; d < 2; d++) {
				var bs = new THREE.Mesh(braceGeo, braceMat);
				braceGroup.add(bs);
				braces.push({ m: bs, s: s, from: d ? bay.b : bay.a, to: d ? bay.a : bay.b });
			}
		});

		/* motion state */
		var ux = [], uz = [], v3a = new THREE.Vector3(), v3b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
		var node = function (lv, a, b, out) { out.set(gx[a] + ux[lv], lv * SH, gz[b] + uz[lv]); return out; };
		var place = function (mesh, p, q) {
			var dir = v3b.copy(q).sub(p), len = dir.length();
			mesh.position.copy(p).add(q).multiplyScalar(0.5);
			mesh.scale.set(1, len, 1);
			mesh.quaternion.setFromUnitVectors(up, dir.normalize());
		};
		var tint = function (r) {
			var t = Math.min(1, r / 0.01), a, b, u;
			if (t < 0.5) { a = [255, 255, 255]; b = [242, 181, 43]; u = t / 0.5; } else { a = [242, 181, 43]; b = [255, 106, 61]; u = (t - 0.5) / 0.5; }
			return 'rgb(' + [0, 1, 2].map(function (n) { return Math.round(a[n] + (b[n] - a[n]) * u); }).join(',') + ')';
		};
		var xs = [], vx = [], zs = [], vz = [];
		for (i = 0; i < N; i++) { xs[i] = 0; vx[i] = 0; zs[i] = 0; vz[i] = 0; }
		var pose = function (gdx, gdz) {
			var lv, m, bsd, p = new THREE.Vector3(), q = new THREE.Vector3();
			ux[0] = 0; uz[0] = 0;
			for (lv = 1; lv <= N; lv++) {
				ux[lv] = Math.max(-2.3, Math.min(2.3, xs[lv - 1] * SC));
				uz[lv] = Math.max(-2.3, Math.min(2.3, zs[lv - 1] * SC));
				floors[lv].position.set(ux[lv], lv * SH, uz[lv]);
				var dr = Math.sqrt(Math.pow(xs[lv - 1] - (lv > 1 ? xs[lv - 2] : 0), 2) + Math.pow(zs[lv - 1] - (lv > 1 ? zs[lv - 2] : 0), 2)) / HS;
				colMats[lv].color.set(tint(dr));
				for (m = 0; m < colMeshes[lv].length; m++) {
					var cm = colMeshes[lv][m];
					place(cm, node(lv - 1, cm.userData.a, cm.userData.b, p), node(lv, cm.userData.a, cm.userData.b, q));
				}
			}
			for (bsd = 0; bsd < braces.length; bsd++) {
				var br = braces[bsd];
				place(br.m, node(br.s - 1, br.from[0], br.from[1], p), node(br.s, br.to[0], br.to[1], q));
			}
			ground.position.set(gdx, 0, gdz);
		};
		pose(0, 0);

		/* trace strip (SVG) */
		var tr = $('#rs-trace');
		if (tr) tr.innerHTML = '<rect class="band" x="0" y="0" width="640" height="52" rx="4"/><rect class="band" x="0" y="58" width="640" height="52" rx="4"/><path class="tr tr--a" id="rs-ta"/><path class="tr tr--d" id="rs-td"/>';
		var ta = $('#rs-ta'), td = $('#rs-td'), outDrift = $('#rs-drift');
		var amp = $('#rs-amp'), btn = $('#rs-shake'), bOn = $('#rs-br-on'), bOff = $('#rs-br-off');

		var braced = true;
		var prm = function () {
			var T1 = braced ? 0.55 : 1.1, w1 = 2 * Math.PI / T1, z = braced ? 0.05 : 0.04;
			var k = Math.pow(w1 / (2 * Math.sin(Math.PI / (2 * (2 * N + 1)))), 2);
			return { k: k, c: 2 * z * k / w1 };
		};
		var makeGround = function (pga) {
			var n = Math.round(TT / DT) + 1, a = new Float32Array(n), K = 40, f = [], ph = [], w = [], k, t, sum, mx = 0, q;
			for (k = 0; k < K; k++) {
				var fr = 0.4 * Math.pow(9 / 0.4, (k + Math.random() * 0.9) / K);
				f.push(fr); ph.push(Math.random() * 6.2832);
				w.push(Math.exp(-Math.pow(Math.log(fr / 1.6), 2) / (2 * 0.64)));
			}
			for (q = 0; q < n; q++) {
				t = q * DT;
				var env = t < 1 ? t * t : (t < 4 ? 1 : Math.exp(-0.55 * (t - 4)));
				sum = 0;
				for (k = 0; k < K; k++) sum += w[k] * Math.sin(6.2832 * f[k] * t + ph[k]);
				a[q] = sum * env;
				mx = Math.max(mx, Math.abs(a[q]));
			}
			for (q = 0; q < n; q++) a[q] = a[q] / mx * pga;
			return a;
		};
		var stepDir = function (x, v, ag, P) {
			var sf = [], a, k;
			for (k = 0; k < N; k++) sf[k] = P.k * (x[k] - (k ? x[k - 1] : 0)) + P.c * (v[k] - (k ? v[k - 1] : 0));
			for (k = 0; k < N; k++) {
				a = -ag - sf[k] + (k < N - 1 ? sf[k + 1] : 0);
				v[k] += a * DT;
			}
			for (k = 0; k < N; k++) x[k] += v[k] * DT;
		};

		var S = null, running = false, last = 0;
		var drawTraces = function () {
			if (!S || !ta) return;
			var da = '', dd = '', q, p, px, ya, yd;
			for (q = 0; q < S.h.length; q++) {
				p = S.h[q];
				px = (p[0] / TT * 640).toFixed(1);
				ya = 26 - Math.max(-1, Math.min(1, p[1] / (0.8 * G))) * 20;
				yd = 84 - Math.max(-1, Math.min(1, p[2] / 0.3)) * 20;
				da += (q ? 'L' : 'M') + px + ' ' + ya.toFixed(1);
				dd += (q ? 'L' : 'M') + px + ' ' + yd.toFixed(1);
			}
			ta.setAttribute('d', da); td.setAttribute('d', dd);
		};
		function frameSim(now) {
			var dt = Math.min(0.05, (now - last) / 1000), P = prm(), ag = 0;
			last = now;
			S.acc += dt;
			while (S.acc >= DT && S.k < S.gx.length - 1) {
				stepDir(xs, vx, S.gx[S.k], P);
				stepDir(zs, vz, S.gz[S.k], P);
				S.k++; S.acc -= DT;
				S.peak = Math.max(S.peak, Math.sqrt(xs[N - 1] * xs[N - 1] + zs[N - 1] * zs[N - 1]) / (N * HS));
			}
			ag = S.gx[S.k];
			S.h.push([S.k * DT, ag, xs[N - 1]]);
			S.t = S.k * DT;
			if (S.k >= S.gx.length - 1) { running = false; }
			else requestAnimationFrame(frameSim);
			if (outDrift) outDrift.textContent = (S.peak * 100).toFixed(2) + ' %';
			drawTraces();
		}
		var run = function (keep) {
			var pga = (amp ? parseFloat(amp.value) : 5) * 0.07 * G;
			for (var k = 0; k < N; k++) { xs[k] = 0; vx[k] = 0; zs[k] = 0; vz[k] = 0; }
			S = { gx: (keep === true && S) ? S.gx : makeGround(pga), gz: (keep === true && S) ? S.gz : makeGround(pga * 0.6), k: 0, acc: 0, peak: 0, h: [], t: 0 };
			last = performance.now();
			if (!running) { running = true; requestAnimationFrame(frameSim); }
		};
		var setBraced = function (b) {
			braced = b;
			braceGroup.visible = b;
			if (bOn) bOn.setAttribute('aria-pressed', b ? 'true' : 'false');
			if (bOff) bOff.setAttribute('aria-pressed', b ? 'false' : 'true');
			run(true);
		};
		if (btn) btn.addEventListener('click', function () { run(); });
		if (amp) amp.addEventListener('change', function () { run(); });
		if (bOn) bOn.addEventListener('click', function () { setBraced(true); });
		if (bOff) bOff.addEventListener('click', function () { setBraced(false); });

		/* orbit: drag to rotate */
		var drag = false, px0 = 0, py0 = 0;
		cv.addEventListener('pointerdown', function (e) { drag = true; px0 = e.clientX; py0 = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } cv.style.cursor = 'grabbing'; });
		cv.addEventListener('pointermove', function (e) {
			if (!drag) return;
			root.rotation.y += (e.clientX - px0) * 0.008;
			elev = Math.max(3, Math.min(15, elev + (e.clientY - py0) * 0.03));
			px0 = e.clientX; py0 = e.clientY;
		});
		var endDrag = function () { drag = false; cv.style.cursor = 'grab'; };
		cv.addEventListener('pointerup', endDrag);
		cv.addEventListener('pointercancel', endDrag);

		/* size and render loop */
		var view = cv.parentElement, visible = true;
		var resize = function () {
			var w = view.clientWidth, h = view.clientHeight;
			if (!w || !h) return;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		};
		resize();
		if ('ResizeObserver' in window) new ResizeObserver(resize).observe(view); else window.addEventListener('resize', resize);
		var t0 = performance.now();
		function render(now) {
			if (!cv.isConnected) return;
			requestAnimationFrame(render);
			if (!visible) return;
			var tt = (now - t0) / 1000, env = 0, A;
			if (running && S) {
				var te = S.t;
				env = te < 1 ? te * te : (te < 4 ? 1 : Math.exp(-0.55 * (te - 4)));
				A = S.gx[Math.min(S.k, S.gx.length - 1)];
				pose(Math.max(-0.16, Math.min(0.16, -A * 0.012)), Math.max(-0.16, Math.min(0.16, -S.gz[Math.min(S.k, S.gz.length - 1)] * 0.012)));
			} else { pose(0, 0); }
			rings.forEach(function (rg, q) {
				var p = ((tt * 0.55) + q / 3) % 1, sc = 1 + p * 6.2;
				rg.scale.set(sc, sc, sc);
				rg.material.opacity = running ? (1 - p) * 0.5 * env : 0;
			});
			if (!drag && !reduce) root.rotation.y += 0.0016;
			camera.position.set(0, elev, camR);
			camera.lookAt(0, 3.7, 0);
			renderer.render(scene, camera);
		}
		requestAnimationFrame(render);
		if ('IntersectionObserver' in window) {
			var so = new IntersectionObserver(function (es) {
				visible = es[0].isIntersecting;
				if (visible && !S && !reduce) run();
			}, { threshold: 0.4 });
			so.observe(view);
		}
	}

	window.rsInitSpectrum = initSpectrum;
	initSpectrum();
	initFrame3D();
})();
