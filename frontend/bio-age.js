// ============================================================
// Bio Age Calculation Engine — HabitFlow
// ============================================================

const BIO_COLORS = {
  heart:   '#FF6B35',
  brain:   '#9B59B6',
  fitness: '#00C896',
  real:    '#4a5568',
};

const TIPS = {
  heart: (h) => {
    const n = h.length;
    if (!n) return 'Start logging to get personalized tips!';
    const smoke = h.filter(d => d.smoking).length;
    const ex    = h.filter(d => d.exercise).length;
    const avgSl = h.reduce((s, d) => s + (+d.sleep_hours || 7), 0) / n;
    if (smoke > 0)  return '🚭 Quitting smoking is the single biggest heart-age reducer.';
    if (ex < 3)     return '🏃 30 min cardio 3×/week can subtract up to 2 years from heart age.';
    if (avgSl < 7)  return '😴 7–9 h sleep cuts cardiovascular risk significantly.';
    return '❤️ Great heart habits! Maintain consistency.';
  },
  brain: (h) => {
    const n = h.length;
    if (!n) return 'Start logging to get personalized tips!';
    const screen = h.filter(d => d.screen_before_bed).length;
    const med    = h.filter(d => d.meditation).length;
    const read   = h.filter(d => d.reading).length;
    if (screen >= 3) return '📵 Swap screen time before bed for reading — brain age drops fast.';
    if (med < 3)     return '🧘 10 min meditation daily can lower brain age by ~1 year.';
    if (read < 3)    return '📚 Reading 20 min/day builds new neural connections.';
    return '🧠 Excellent brain habits! Keep learning something new daily.';
  },
  fitness: (h) => {
    const n = h.length;
    if (!n) return 'Start logging to get personalized tips!';
    const ex      = h.filter(d => d.exercise).length;
    const steps   = h.filter(d => d.steps_10k).length;
    const stretch = h.filter(d => d.stretching).length;
    if (ex < 3)      return '💪 Two more workout days per week can drop fitness age by 1.5 years.';
    if (steps < 3)   return '🚶 10k steps daily burns fat and reduces fitness age by ~1 year.';
    if (stretch < 2) return '🤸 Add stretching to prevent injury and recover faster.';
    return '💪 Outstanding! Push for that personal record.';
  },
};

// ── Formulas ──────────────────────────────────────────────

function calcHeartAge(realAge, h) {
  if (!h.length || !realAge) return realAge || 30;
  let age = realAge;
  const n   = h.length;
  const ex  = h.filter(d => d.exercise).length;
  const sl  = h.reduce((s, d) => s + (+d.sleep_hours || 7), 0) / n;
  const smk = h.filter(d => d.smoking).length;
  const alc = h.filter(d => d.alcohol).length;
  const cof = h.reduce((s, d) => s + (+d.coffee_cups || 0), 0) / n;

  if (ex >= 5)      age -= 2;  else if (ex >= 3) age -= 1; else if (ex === 0) age += 1;
  if (sl >= 7 && sl <= 9) age -= 1; else if (sl < 6) age += 2; else if (sl > 10) age += 0.5;
  if (smk >= 5)     age += 5;  else if (smk >= 3) age += 2; else if (smk >= 1) age += 1;
  if (alc >= 5)     age += 2;  else if (alc >= 3) age += 1;
  if (cof > 0 && cof <= 2) age -= 0.5; else if (cof >= 5) age += 1;

  return Math.max(+(age.toFixed(1)), 10);
}

function calcBrainAge(realAge, h) {
  if (!h.length || !realAge) return realAge || 30;
  let age = realAge;
  const n    = h.length;
  const sl   = h.reduce((s, d) => s + (+d.sleep_hours || 7), 0) / n;
  const read = h.filter(d => d.reading).length;
  const med  = h.filter(d => d.meditation).length;
  const lrn  = h.filter(d => d.learning).length;
  const scrn = h.filter(d => d.screen_before_bed).length;

  if (sl >= 7 && sl <= 9) age -= 1; else if (sl < 6) age += 2;
  if (read >= 5)  age -= 1.5; else if (read >= 3) age -= 0.5;
  if (med  >= 5)  age -= 1;   else if (med  >= 3) age -= 0.5;
  if (lrn  >= 3)  age -= 0.5;
  if (scrn >= 5)  age += 2;   else if (scrn >= 3) age += 1;

  return Math.max(+(age.toFixed(1)), 10);
}

function calcFitnessAge(realAge, h) {
  if (!h.length || !realAge) return realAge || 30;
  let age = realAge;
  const ex  = h.filter(d => d.exercise).length;
  const str = h.filter(d => d.stretching).length;
  const stp = h.filter(d => d.steps_10k).length;
  const out = h.filter(d => d.outdoor).length;

  if (ex >= 5)   age -= 3;   else if (ex >= 3) age -= 1.5; else if (ex === 0) age += 2;
  if (str >= 4)  age -= 1;   else if (str >= 2) age -= 0.5;
  if (stp >= 5)  age -= 1;   else if (stp >= 3) age -= 0.5;
  if (out >= 3)  age -= 0.5;

  return Math.max(+(age.toFixed(1)), 10);
}

// ── Factor Breakdowns ─────────────────────────────────────

function heartFactors(realAge, h) {
  if (!h.length) return [];
  const n   = h.length;
  const ex  = h.filter(d => d.exercise).length;
  const sl  = h.reduce((s, d) => s + (+d.sleep_hours || 7), 0) / n;
  const smk = h.filter(d => d.smoking).length;
  const alc = h.filter(d => d.alcohol).length;
  const cof = h.reduce((s, d) => s + (+d.coffee_cups || 0), 0) / n;
  const f = [];
  if (ex >= 5)       f.push({ text: `Active ${ex}/7 days`, delta: -2, good: true });
  else if (ex >= 3)  f.push({ text: `Active ${ex}/7 days`, delta: -1, good: true });
  else if (ex === 0) f.push({ text: 'No exercise this week', delta: +1, good: false });
  if (sl >= 7 && sl <= 9) f.push({ text: `Good sleep (avg ${sl.toFixed(1)}h)`, delta: -1, good: true });
  else if (sl < 6)        f.push({ text: `Low sleep (avg ${sl.toFixed(1)}h)`, delta: +2, good: false });
  if (smk >= 5) f.push({ text: `Smoking ${smk}/7 days`, delta: +5, good: false });
  else if (smk >= 1) f.push({ text: `Smoking ${smk}/7 days`, delta: +1, good: false });
  if (alc >= 5) f.push({ text: 'Heavy alcohol use', delta: +2, good: false });
  else if (alc >= 3) f.push({ text: 'Moderate alcohol use', delta: +1, good: false });
  if (cof > 0 && cof <= 2) f.push({ text: `Moderate coffee (${cof.toFixed(1)} cups/day)`, delta: -0.5, good: true });
  else if (cof >= 5) f.push({ text: `High coffee (${cof.toFixed(1)} cups/day)`, delta: +1, good: false });
  return f;
}

function brainFactors(realAge, h) {
  if (!h.length) return [];
  const n    = h.length;
  const sl   = h.reduce((s, d) => s + (+d.sleep_hours || 7), 0) / n;
  const read = h.filter(d => d.reading).length;
  const med  = h.filter(d => d.meditation).length;
  const lrn  = h.filter(d => d.learning).length;
  const scrn = h.filter(d => d.screen_before_bed).length;
  const f = [];
  if (sl >= 7 && sl <= 9) f.push({ text: `Optimal sleep (${sl.toFixed(1)}h avg)`, delta: -1, good: true });
  else if (sl < 6)        f.push({ text: `Sleep deprivation (${sl.toFixed(1)}h avg)`, delta: +2, good: false });
  if (read >= 5)  f.push({ text: `Reading ${read}/7 days`, delta: -1.5, good: true });
  else if (read >= 3) f.push({ text: `Reading ${read}/7 days`, delta: -0.5, good: true });
  if (med >= 5)  f.push({ text: `Meditation ${med}/7 days`, delta: -1, good: true });
  else if (med >= 3) f.push({ text: `Meditation ${med}/7 days`, delta: -0.5, good: true });
  if (lrn >= 3) f.push({ text: `Learning ${lrn}/7 days`, delta: -0.5, good: true });
  if (scrn >= 5) f.push({ text: `Screen before bed ${scrn}/7 days`, delta: +2, good: false });
  else if (scrn >= 3) f.push({ text: `Screen before bed ${scrn}/7 days`, delta: +1, good: false });
  return f;
}

function fitnessFactors(realAge, h) {
  if (!h.length) return [];
  const ex  = h.filter(d => d.exercise).length;
  const str = h.filter(d => d.stretching).length;
  const stp = h.filter(d => d.steps_10k).length;
  const out = h.filter(d => d.outdoor).length;
  const f = [];
  if (ex >= 5)       f.push({ text: `Exercise ${ex}/7 days`, delta: -3, good: true });
  else if (ex >= 3)  f.push({ text: `Exercise ${ex}/7 days`, delta: -1.5, good: true });
  else if (ex === 0) f.push({ text: 'No exercise this week', delta: +2, good: false });
  if (str >= 4)      f.push({ text: `Stretching ${str}/7 days`, delta: -1, good: true });
  else if (str >= 2) f.push({ text: `Stretching ${str}/7 days`, delta: -0.5, good: true });
  if (stp >= 5)      f.push({ text: `10k steps ${stp}/7 days`, delta: -1, good: true });
  else if (stp >= 3) f.push({ text: `10k steps ${stp}/7 days`, delta: -0.5, good: true });
  if (out >= 3)      f.push({ text: `Outdoors ${out}/7 days`, delta: -0.5, good: true });
  return f;
}

// ── Trend ─────────────────────────────────────────────────

function getTrend(snaps, key) {
  if (snaps.length < 7) return 'insufficient';
  const recent = snaps.slice(-7).map(s => s[key]).filter(v => v != null);
  const older  = snaps.slice(-14, -7).map(s => s[key]).filter(v => v != null);
  if (!recent.length || !older.length) return 'insufficient';
  const rAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const oAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const d = rAvg - oAvg;
  if (d < -0.3) return 'improving';
  if (d >  0.3) return 'declining';
  return 'stable';
}

function trendHTML(t) {
  if (t === 'improving')   return '<span class="bio-trend improving">↓ Improving</span>';
  if (t === 'declining')   return '<span class="bio-trend declining">↑ Declining</span>';
  if (t === 'stable')      return '<span class="bio-trend stable">→ Stable</span>';
  return '<span class="bio-trend insufficient">⋯ Need more data</span>';
}

// ── Count-up animation ────────────────────────────────────

function countUp(el, target, ms = 700) {
  const from = parseFloat(el.textContent) || 0;
  const range = target - from;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / ms, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = (from + range * ease).toFixed(1);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(1);
  }
  requestAnimationFrame(step);
}

// ── Confetti ──────────────────────────────────────────────

function fireConfetti() {
  const c = document.getElementById('confetti-canvas');
  if (!c) return;
  c.width = window.innerWidth; c.height = window.innerHeight;
  const ctx = c.getContext('2d');
  const cols = ['#00C896','#FF6B35','#9B59B6','#FFD700','#FF3B5C','#00BFFF'];
  const pts  = Array.from({ length: 130 }, () => ({
    x: Math.random() * c.width, y: -10 - Math.random() * 80,
    vx: (Math.random() - 0.5) * 3, vy: 2.5 + Math.random() * 3.5,
    r: 5 + Math.random() * 5, rot: Math.random() * 360, rv: (Math.random() - 0.5) * 7,
    col: cols[Math.floor(Math.random() * cols.length)],
  }));
  let frame = 0;
  (function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    pts.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rot += p.rv;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    });
    if (++frame < 150) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, c.width, c.height);
  })();
}

// ── Toast ──────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('bio-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden', 'bio-toast-hide');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.add('hidden'), 3500);
}

// ── Input helpers ─────────────────────────────────────────

let _coffeeCount = 0;

function stepCoffee(delta) {
  _coffeeCount = Math.max(0, Math.min(10, _coffeeCount + delta));
  const el = document.getElementById('coffee-val');
  if (el) el.textContent = _coffeeCount;
}

function getInputValues() {
  const bool = id => !!(document.getElementById(id)?.checked);
  return {
    sleep_hours:      parseFloat(document.getElementById('sleep-slider')?.value ?? 7),
    coffee_cups:      _coffeeCount,
    exercise:         bool('t-exercise'),
    steps_10k:        bool('t-steps'),
    outdoor:          bool('t-outdoor'),
    stretching:       bool('t-stretching'),
    reading:          bool('t-reading'),
    meditation:       bool('t-meditation'),
    learning:         bool('t-learning'),
    screen_before_bed: bool('t-screen'),
    alcohol:          bool('t-alcohol'),
    smoking:          bool('t-smoking'),
  };
}

function populateInputs(data) {
  if (!data) return;
  const sl = document.getElementById('sleep-slider');
  if (sl) { sl.value = data.sleep_hours ?? 7; updateSleepLabel(sl.value); }
  _coffeeCount = parseInt(data.coffee_cups) || 0;
  const cv = document.getElementById('coffee-val');
  if (cv) cv.textContent = _coffeeCount;
  const pairs = [
    ['t-exercise', 'exercise'], ['t-steps', 'steps_10k'], ['t-outdoor', 'outdoor'],
    ['t-stretching', 'stretching'], ['t-reading', 'reading'], ['t-meditation', 'meditation'],
    ['t-learning', 'learning'], ['t-screen', 'screen_before_bed'],
    ['t-alcohol', 'alcohol'], ['t-smoking', 'smoking'],
  ];
  pairs.forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!data[key];
  });
}

function updateSleepLabel(val) {
  const el = document.getElementById('sleep-val');
  if (el) el.textContent = val + 'h';
}

// ── Render helpers ────────────────────────────────────────

function renderCard(type, ageVal, realAge, factors, tip, trend) {
  const ageEl     = document.getElementById(`${type}-age-val`);
  const diffEl    = document.getElementById(`${type}-diff`);
  const trendEl   = document.getElementById(`${type}-trend`);
  const tipEl     = document.getElementById(`${type}-tip`);
  const factorsEl = document.getElementById(`${type}-factors`);

  if (ageEl) countUp(ageEl, ageVal, 800);

  if (diffEl && realAge) {
    const d = +((ageVal - realAge).toFixed(1));
    const sign = d >= 0 ? '+' : '';
    diffEl.textContent = `${sign}${d} yrs vs real age`;
    diffEl.className = 'bio-card-diff ' + (d < 0 ? 'good' : d > 0 ? 'bad' : 'neutral');
  }

  if (trendEl) trendEl.innerHTML = trendHTML(trend);

  if (tipEl) tipEl.textContent = tip;

  if (factorsEl) {
    if (!factors.length) {
      factorsEl.innerHTML = '<li class="factor-none">Keep logging to see what\'s affecting your score!</li>';
    } else {
      factorsEl.innerHTML = factors.map(f =>
        `<li class="factor-item ${f.good ? 'factor-good' : 'factor-bad'}">
          <span class="factor-icon">${f.good ? '✅' : '⚠️'}</span>
          <span class="factor-text">${f.text}</span>
          <span class="factor-delta">${f.delta > 0 ? '+' : ''}${f.delta} yr</span>
        </li>`
      ).join('');
    }
  }
}

function renderHero(heartAge, brainAge, fitnessAge, realAge) {
  const avg = +((heartAge + brainAge + fitnessAge) / 3).toFixed(1);
  const avgEl  = document.getElementById('avg-bio-age');
  const msgEl  = document.getElementById('hero-message');
  const realEl = document.getElementById('real-age-display');
  const diffEl = document.getElementById('hero-diff');

  if (avgEl) countUp(avgEl, avg, 1000);
  if (realEl && realAge) realEl.textContent = `Real age: ${realAge}`;

  if (diffEl && realAge) {
    const d = +((avg - realAge).toFixed(1));
    const sign = d >= 0 ? '+' : '';
    diffEl.textContent = `${sign}${d} yrs vs real age`;
    diffEl.className = 'hero-meta-item ' + (d < 0 ? 'hero-diff-good' : 'hero-diff-bad');
  }

  if (msgEl && realAge) {
    const d = avg - realAge;
    if (d <= -5)      msgEl.textContent = `Your body is ${Math.abs(d).toFixed(1)} years younger than your age 🔥`;
    else if (d < 0)   msgEl.textContent = `You're ${Math.abs(d).toFixed(1)} years biologically younger — keep going! 💪`;
    else if (d === 0) msgEl.textContent = `Biological age matches real age. Time to level up! 🎯`;
    else if (d <= 3)  msgEl.textContent = `Only ${d.toFixed(1)} years to close. Small habits, big changes 💡`;
    else              msgEl.textContent = `Let's reverse the clock — your habits have a big impact 🌱`;
  }
}

function renderChart(snaps, realAge) {
  const canvas = document.getElementById('bio-chart');
  const noData = document.getElementById('chart-no-data');
  if (!canvas) return;
  if (snaps.length < 2) {
    noData && noData.classList.remove('hidden');
    canvas.style.display = 'none';
    return;
  }
  noData && noData.classList.add('hidden');
  canvas.style.display = '';

  if (_state.chart) { _state.chart.destroy(); _state.chart = null; }

  const labels = snaps.map(s => {
    const d = new Date(s.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  _state.chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '❤️ Heart',   data: snaps.map(s => s.heart_age),   borderColor: BIO_COLORS.heart,   backgroundColor: BIO_COLORS.heart   + '25', tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 7 },
        { label: '🧠 Brain',   data: snaps.map(s => s.brain_age),   borderColor: BIO_COLORS.brain,   backgroundColor: BIO_COLORS.brain   + '25', tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 7 },
        { label: '💪 Fitness', data: snaps.map(s => s.fitness_age), borderColor: BIO_COLORS.fitness, backgroundColor: BIO_COLORS.fitness + '25', tension: 0.4, fill: false, pointRadius: 4, pointHoverRadius: 7 },
        { label: 'Real Age',   data: snaps.map(() => realAge),       borderColor: BIO_COLORS.real, borderDash: [6, 4], pointRadius: 0, tension: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#a0aec0', font: { size: 12 } } },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        x: { ticks: { color: '#718096' }, grid: { color: '#1e2d3d' } },
        y: {
          ticks: { color: '#718096' }, grid: { color: '#1e2d3d' },
          suggestedMin: realAge ? realAge - 10 : 15,
          suggestedMax: realAge ? realAge + 10 : 60,
        },
      },
    },
  });
}

function renderImpact(inputs, realAge) {
  const el = document.getElementById('impact-list');
  if (!el) return;
  if (!inputs || !realAge) {
    el.innerHTML = '<p class="impact-empty">Log today\'s habits above to see your impact!</p>';
    return;
  }
  const sl = +inputs.sleep_hours;
  const items = [
    { icon: '😴', label: 'Sleep',           val: `${sl}h`,                        good: sl >= 7 && sl <= 9 },
    { icon: '☕', label: 'Coffee',           val: `${inputs.coffee_cups} cups`,    good: inputs.coffee_cups <= 2 },
    { icon: '🏃', label: 'Exercise',         val: inputs.exercise ? 'Yes' : 'No',  good: inputs.exercise },
    { icon: '🚶', label: '10k Steps',        val: inputs.steps_10k ? 'Yes' : 'No', good: inputs.steps_10k },
    { icon: '🤸', label: 'Stretching',       val: inputs.stretching ? 'Yes' : 'No',good: inputs.stretching },
    { icon: '🌿', label: 'Outdoor',          val: inputs.outdoor ? 'Yes' : 'No',   good: inputs.outdoor },
    { icon: '📚', label: 'Reading',          val: inputs.reading ? 'Yes' : 'No',   good: inputs.reading },
    { icon: '🧘', label: 'Meditation',       val: inputs.meditation ? 'Yes' : 'No',good: inputs.meditation },
    { icon: '💡', label: 'Learning',         val: inputs.learning ? 'Yes' : 'No',  good: inputs.learning },
    { icon: '📱', label: 'Screen before bed',val: inputs.screen_before_bed ? 'Yes':'No', good: !inputs.screen_before_bed },
    { icon: '🍺', label: 'Alcohol',          val: inputs.alcohol ? 'Yes' : 'No',   good: !inputs.alcohol },
    { icon: '🚬', label: 'Smoking',          val: inputs.smoking ? 'Yes' : 'No',   good: !inputs.smoking },
  ];
  el.innerHTML = items.map(it =>
    `<div class="impact-item ${it.good ? 'impact-good' : 'impact-bad'}">
      <span class="impact-icon">${it.icon}</span>
      <div class="impact-details"><span class="impact-label">${it.label}</span><span class="impact-value">${it.val}</span></div>
      <span class="impact-status">${it.good ? '✅' : '❌'}</span>
    </div>`
  ).join('');
}

// ── Main state & flow ─────────────────────────────────────

const _state = {
  realAge: null, gender: null,
  history7d: [], snapshots30d: [],
  todayInputs: null,
  heartAge: null, brainAge: null, fitnessAge: null,
  chart: null,
};

function renderAll() {
  const { realAge, heartAge, brainAge, fitnessAge, history7d, snapshots30d, todayInputs } = _state;
  const hA = heartAge ?? realAge ?? 30;
  const bA = brainAge ?? realAge ?? 30;
  const fA = fitnessAge ?? realAge ?? 30;

  renderHero(hA, bA, fA, realAge);
  renderCard('heart',   hA, realAge, heartFactors(realAge, history7d),   TIPS.heart(history7d),   getTrend(snapshots30d, 'heart_age'));
  renderCard('brain',   bA, realAge, brainFactors(realAge, history7d),   TIPS.brain(history7d),   getTrend(snapshots30d, 'brain_age'));
  renderCard('fitness', fA, realAge, fitnessFactors(realAge, history7d), TIPS.fitness(history7d), getTrend(snapshots30d, 'fitness_age'));
  renderChart(snapshots30d, realAge);
  renderImpact(todayInputs, realAge);
}

async function saveAndRecalculate() {
  const btn = document.getElementById('save-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  try {
    const inputs = getInputValues();
    const saved  = await apiFetch('/daily-inputs', 'POST', inputs);
    _state.todayInputs = saved;

    const hist = await apiFetch('/daily-inputs/history?days=7', 'GET');
    _state.history7d = hist;

    _state.heartAge   = calcHeartAge(_state.realAge, hist);
    _state.brainAge   = calcBrainAge(_state.realAge, hist);
    _state.fitnessAge = calcFitnessAge(_state.realAge, hist);

    await apiFetch('/bio-age-snapshots', 'POST', {
      heart_age: _state.heartAge, brain_age: _state.brainAge, fitness_age: _state.fitnessAge,
    });

    _state.snapshots30d = await apiFetch('/bio-age-snapshots?days=30', 'GET');

    renderAll();

    const avg = (_state.heartAge + _state.brainAge + _state.fitnessAge) / 3;
    if (_state.realAge && avg < _state.realAge) {
      fireConfetti();
      showToast(`🔥 Avg bio age: ${avg.toFixed(1)} — younger than your real age!`);
    } else {
      showToast('✅ Saved! Scores updated.');
    }
  } catch (err) {
    showToast('Error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⚡ Save & Recalculate'; }
  }
}

async function saveProfile(e) {
  if (e) e.preventDefault();
  const realAge = parseInt(document.getElementById('ob-age')?.value);
  const gender  = document.getElementById('ob-gender')?.value || null;
  if (!realAge || realAge < 10 || realAge > 120) return;
  try {
    await apiFetch('/profile', 'POST', { real_age: realAge, gender });
    _state.realAge = realAge; _state.gender = gender;
    document.getElementById('onboarding-modal')?.classList.add('hidden');
    await loadAll();
  } catch (err) { showToast('Failed to save profile: ' + err.message); }
}

async function loadAll() {
  try {
    const profile = await apiFetch('/profile', 'GET');
    if (!profile.real_age) {
      document.getElementById('onboarding-modal')?.classList.remove('hidden');
      return;
    }
    _state.realAge = profile.real_age;
    _state.gender  = profile.gender;

    const [today, hist, snaps] = await Promise.all([
      apiFetch('/daily-inputs', 'GET'),
      apiFetch('/daily-inputs/history?days=7', 'GET'),
      apiFetch('/bio-age-snapshots?days=30', 'GET'),
    ]);

    _state.todayInputs  = today;
    _state.history7d    = hist;
    _state.snapshots30d = snaps;

    populateInputs(today);

    _state.heartAge   = calcHeartAge(_state.realAge, hist);
    _state.brainAge   = calcBrainAge(_state.realAge, hist);
    _state.fitnessAge = calcFitnessAge(_state.realAge, hist);

    renderAll();

    // Upsert today's snapshot silently
    apiFetch('/bio-age-snapshots', 'POST', {
      heart_age: _state.heartAge, brain_age: _state.brainAge, fitness_age: _state.fitnessAge,
    }).catch(() => {});

  } catch (err) {
    if (err.status === 401) { window.location.href = 'index.html'; return; }
    console.error('loadAll error:', err);
  }
}

// ── Boot ──────────────────────────────────────────────────

(function boot() {
  if (!localStorage.getItem('habit_token')) { window.location.href = 'index.html'; return; }

  const user = JSON.parse(localStorage.getItem('habit_user') || '{}');
  const sidebarUser = document.getElementById('sidebar-user');
  if (sidebarUser) sidebarUser.textContent = user.email || '';

  const dateLabel = document.getElementById('today-date-label');
  if (dateLabel) dateLabel.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  loadAll();
})();
