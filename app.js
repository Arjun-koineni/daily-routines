/**
 * Life Routine Dashboard - Performance & Consistency Engine
 * Dynamic Calculations, Chart.js Integrations, AI Coach & Adherence Matrix
 */

(function () {
  'use strict';

  // --- STATE DEFINITION ---
  const state = {
    studyHours: 6.0,
    gymHours: 1.5,
    dietHours: 1.5,
    sleepHours: 7.5,
    gymDays: 5,
    goal: 'muscle', // 'muscle' | 'fatloss' | 'exam' | 'balanced'
    streak: 14,
    // 7-day strip layout: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    weeklyGymSchedule: [true, true, false, true, true, true, false], // 5 gym days, 2 rest
    // 28 days adherence: 'done' | 'missed' | 'pending'
    adherenceLog: [
      'done', 'done', 'done', 'done', 'done', 'done', 'missed',
      'done', 'done', 'done', 'done', 'done', 'done', 'done',
      'done', 'done', 'missed', 'done', 'done', 'done', 'done',
      'done', 'done', 'done', 'done', 'done', 'done', 'done'
    ],
    activeLossTab: 'gym'
  };

  // Color Palette Tokens
  const COLORS = {
    study: '#38bdf8',
    gym: '#a855f7',
    diet: '#f59e0b',
    sleep: '#6366f1',
    buffer: '#10b981',
    bufferWarning: '#f59e0b',
    bufferDanger: '#f43f5e',
    neutralDark: '#1e293b'
  };

  // Chart Instances
  let donutChartInstance = null;
  let barChartInstance = null;
  let radarChartInstance = null;

  // DOM Cache
  const dom = {
    // Inputs & Sliders
    studySlider: document.getElementById('studyHoursSlider'),
    studyInput: document.getElementById('studyHoursInput'),
    gymSlider: document.getElementById('gymHoursSlider'),
    gymInput: document.getElementById('gymHoursInput'),
    dietSlider: document.getElementById('dietHoursSlider'),
    dietInput: document.getElementById('dietHoursInput'),
    sleepSlider: document.getElementById('sleepHoursSlider'),
    sleepInput: document.getElementById('sleepHoursInput'),
    gymDaysSlider: document.getElementById('gymDaysSlider'),
    gymDaysInput: document.getElementById('gymDaysInput'),
    goalButtons: document.querySelectorAll('.goal-pill'),

    // Buffer Card
    bufferCard: document.getElementById('bufferCard'),
    bufferHoursValue: document.getElementById('bufferHoursValue'),
    bufferStatusBadge: document.getElementById('bufferStatusBadge'),
    bufferDesc: document.getElementById('bufferDesc'),
    bufferProgressBar: document.getElementById('bufferProgressBar'),

    // Visualizations
    donutCanvas: document.getElementById('donutChart'),
    barCanvas: document.getElementById('barChart'),
    radarCanvas: document.getElementById('radarChart'),
    centerActiveHours: document.getElementById('centerActiveHours'),
    weeklyStrip: document.getElementById('weeklyStrip'),
    stripSummaryBadge: document.getElementById('stripSummaryBadge'),

    // Readiness & Scoring
    readinessCard: document.getElementById('readinessCard'),
    readinessScoreVal: document.getElementById('readinessScoreVal'),
    scoreCircleBar: document.getElementById('scoreCircleBar'),
    readinessTierText: document.getElementById('readinessTierText'),
    readinessTierDesc: document.getElementById('readinessTierDesc'),
    btnToggleFormula: document.getElementById('btnToggleFormula'),
    formulaDrawer: document.getElementById('formulaDrawer'),
    formulaList: document.getElementById('formulaList'),

    // AI Coach
    coachMessage: document.getElementById('coachMessage'),
    coachMoodBadge: document.getElementById('coachMoodBadge'),
    forecast30Gym: document.getElementById('forecast30Gym'),
    forecast30Detail: document.getElementById('forecast30Detail'),
    forecast90Gym: document.getElementById('forecast90Gym'),
    forecast90Detail: document.getElementById('forecast90Detail'),

    // Accountability Panel
    lossTabs: document.querySelectorAll('.loss-pill'),
    lossContentBox: document.getElementById('lossContentBox'),

    // Adherence Log
    adherenceGrid: document.getElementById('adherenceGrid'),
    adherenceRateVal: document.getElementById('adherenceRateVal'),
    completedDaysCount: document.getElementById('completedDaysCount'),
    missedDaysCount: document.getElementById('missedDaysCount'),
    compoundingGrade: document.getElementById('compoundingGrade'),
    streakCount: document.getElementById('streakCount'),

    // Export Modal & Toast
    exportModal: document.getElementById('exportModal'),
    btnExport: document.getElementById('btnExport'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    exportSummaryText: document.getElementById('exportSummaryText'),
    btnSaveLocal: document.getElementById('btnSaveLocal'),
    btnCopyClipboard: document.getElementById('btnCopyClipboard'),
    btnDownloadJson: document.getElementById('btnDownloadJson'),
    btnReset: document.getElementById('btnReset'),
    toast: document.getElementById('toast')
  };

  // --- INITIALIZATION ---
  function init() {
    loadSavedState();
    setupEventListeners();
    renderWeeklyStrip();
    renderAdherenceGrid();
    initCharts();
    updateAll();
  }

  // --- LOCAL STORAGE PERSISTENCE ---
  function loadSavedState() {
    try {
      const saved = localStorage.getItem('life_routine_dashboard_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        // Sync inputs
        dom.studySlider.value = state.studyHours;
        dom.studyInput.value = state.studyHours;
        dom.gymSlider.value = state.gymHours;
        dom.gymInput.value = state.gymHours;
        dom.dietSlider.value = state.dietHours;
        dom.dietInput.value = state.dietHours;
        dom.sleepSlider.value = state.sleepHours;
        dom.sleepInput.value = state.sleepHours;
        dom.gymDaysSlider.value = state.gymDays;
        dom.gymDaysInput.value = state.gymDays;

        // Set active goal pill
        dom.goalButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.goal === state.goal);
        });
      }
    } catch (e) {
      console.warn('Could not load local storage:', e);
    }
  }

  function saveCurrentState() {
    try {
      localStorage.setItem('life_routine_dashboard_state', JSON.stringify(state));
      showToast('Routine & progress saved to browser cache!');
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2800);
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Two-way bindings for Sliders and Number Inputs
    bindInputPair(dom.studySlider, dom.studyInput, 'studyHours', 0, 16);
    bindInputPair(dom.gymSlider, dom.gymInput, 'gymHours', 0, 3.5);
    bindInputPair(dom.dietSlider, dom.dietInput, 'dietHours', 0.5, 4);
    bindInputPair(dom.sleepSlider, dom.sleepInput, 'sleepHours', 6.0, 8.0);
    bindInputPair(dom.gymDaysSlider, dom.gymDaysInput, 'gymDays', 0, 7, (val) => {
      syncGymDaysToSchedule(val);
    });

    // Goal Preset buttons
    dom.goalButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.goalButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.goal = btn.dataset.goal;
        updateAll();
      });
    });

    // Formula Drawer Toggle
    dom.btnToggleFormula.addEventListener('click', () => {
      dom.formulaDrawer.classList.toggle('open');
      dom.btnToggleFormula.innerHTML = dom.formulaDrawer.classList.contains('open')
        ? '<span class="fx-icon">✕</span> Hide Formula'
        : '<span class="fx-icon">ƒ(x)</span> View Scoring Formula';
    });

    // Accountability Loss Tabs
    dom.lossTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        dom.lossTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeLossTab = tab.dataset.type;
        renderAccountabilityLoss();
      });
    });

    // Export Modal
    dom.btnExport.addEventListener('click', openExportModal);
    dom.btnCloseModal.addEventListener('click', closeExportModal);
    dom.exportModal.addEventListener('click', (e) => {
      if (e.target === dom.exportModal) closeExportModal();
    });

    dom.btnSaveLocal.addEventListener('click', saveCurrentState);
    dom.btnCopyClipboard.addEventListener('click', copyRoutineSummary);
    dom.btnDownloadJson.addEventListener('click', downloadRoutineJson);

    // Reset Defaults
    dom.btnReset.addEventListener('click', resetToDefaults);
  }

  function bindInputPair(slider, input, stateKey, min, max, extraCallback) {
    slider.addEventListener('input', () => {
      let val = parseFloat(slider.value);
      val = Math.max(min, Math.min(max, val));
      input.value = val;
      state[stateKey] = val;
      if (extraCallback) extraCallback(val);
      updateAll();
    });

    input.addEventListener('change', () => {
      let val = parseFloat(input.value);
      if (isNaN(val)) val = min;
      val = Math.max(min, Math.min(max, val));
      input.value = val;
      slider.value = val;
      state[stateKey] = val;
      if (extraCallback) extraCallback(val);
      updateAll();
    });
  }

  function resetToDefaults() {
    state.studyHours = 6.0;
    state.gymHours = 1.5;
    state.dietHours = 1.5;
    state.sleepHours = 7.5;
    state.gymDays = 5;
    state.goal = 'muscle';
    state.weeklyGymSchedule = [true, true, false, true, true, true, false];

    dom.studySlider.value = 6.0;
    dom.studyInput.value = 6.0;
    dom.gymSlider.value = 1.5;
    dom.gymInput.value = 1.5;
    dom.dietSlider.value = 1.5;
    dom.dietInput.value = 1.5;
    dom.sleepSlider.value = 7.5;
    dom.sleepInput.value = 7.5;
    dom.gymDaysSlider.value = 5;
    dom.gymDaysInput.value = 5;

    dom.goalButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.goal === 'muscle');
    });

    renderWeeklyStrip();
    updateAll();
    showToast('Reset to default routine baseline.');
  }

  // --- SYNCHRONIZE 7-DAY SCHEDULE & GYM DAYS ---
  function syncGymDaysToSchedule(targetDays) {
    // Default smart templates based on day count
    const templates = {
      0: [false, false, false, false, false, false, false],
      1: [false, false, true, false, false, false, false],
      2: [true, false, false, true, false, false, false],
      3: [true, false, true, false, true, false, false],
      4: [true, true, false, true, true, false, false],
      5: [true, true, false, true, true, true, false], // Mon, Tue, Thu, Fri, Sat
      6: [true, true, true, true, true, true, false],
      7: [true, true, true, true, true, true, true]
    };

    state.weeklyGymSchedule = [...templates[targetDays]];
    renderWeeklyStrip();
  }

  function toggleDayGym(dayIdx) {
    state.weeklyGymSchedule[dayIdx] = !state.weeklyGymSchedule[dayIdx];
    const newCount = state.weeklyGymSchedule.filter(Boolean).length;
    state.gymDays = newCount;
    dom.gymDaysSlider.value = newCount;
    dom.gymDaysInput.value = newCount;
    renderWeeklyStrip();
    updateAll();
  }

  // --- RENDER WEEKLY STRIP ---
  function renderWeeklyStrip() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const splits5Day = ['PPL - Push', 'PPL - Pull', 'Active Rest', 'PPL - Legs', 'Upper Power', 'Lower Power', 'Full Rest'];
    
    dom.weeklyStrip.innerHTML = '';
    let gymCount = 0;

    days.forEach((day, idx) => {
      const isGym = state.weeklyGymSchedule[idx];
      if (isGym) gymCount++;

      const col = document.createElement('div');
      col.className = `strip-day-col ${isGym ? 'gym-active' : ''}`;
      col.setAttribute('title', `Click to toggle ${day} between Gym and Rest`);
      col.addEventListener('click', () => toggleDayGym(idx));

      col.innerHTML = `
        <span class="strip-day-name">${day}</span>
        <span class="strip-status-badge ${isGym ? 'badge-gym' : 'badge-rest'}">${isGym ? '🏋️ GYM' : '💤 REST'}</span>
        <span class="strip-routine-note">${splits5Day[idx]}</span>
      `;

      dom.weeklyStrip.appendChild(col);
    });

    dom.stripSummaryBadge.textContent = `${gymCount} Gym Days • ${7 - gymCount} Rest Days`;
  }

  // --- RENDER 4-WEEK ADHERENCE GRID ---
  function renderAdherenceGrid() {
    dom.adherenceGrid.innerHTML = '';
    state.adherenceLog.forEach((status, idx) => {
      const btn = document.createElement('button');
      btn.className = `adh-day-btn ${status === 'done' ? 'state-done' : 'state-missed'}`;
      btn.textContent = status === 'done' ? '✅' : '❌';
      btn.title = `Day ${idx + 1}: Click to toggle`;
      btn.addEventListener('click', () => {
        state.adherenceLog[idx] = state.adherenceLog[idx] === 'done' ? 'missed' : 'done';
        renderAdherenceGrid();
        updateAdherenceStats();
      });
      dom.adherenceGrid.appendChild(btn);
    });
    updateAdherenceStats();
  }

  function updateAdherenceStats() {
    const completed = state.adherenceLog.filter(s => s === 'done').length;
    const missed = state.adherenceLog.length - completed;
    const rate = Math.round((completed / state.adherenceLog.length) * 100);

    dom.completedDaysCount.textContent = completed;
    dom.missedDaysCount.textContent = missed;
    dom.adherenceRateVal.textContent = `${rate}%`;

    // Compounding grade
    let grade = 'A+ Elite';
    if (rate < 70) grade = 'C Rebuilding';
    else if (rate < 85) grade = 'B Consistent';
    else if (rate < 95) grade = 'A Master';

    dom.compoundingGrade.textContent = grade;

    // Calculate streak up to today (counting backwards from end)
    let currentStreak = 0;
    for (let i = state.adherenceLog.length - 1; i >= 0; i--) {
      if (state.adherenceLog[i] === 'done') {
        currentStreak++;
      } else {
        break;
      }
    }
    state.streak = currentStreak;
    dom.streakCount.textContent = currentStreak;
  }

  // --- CORE UPDATE PIPELINE ---
  function updateAll() {
    const bufferHours = calculateBuffer();
    updateBufferCard(bufferHours);
    updateCharts(bufferHours);
    const scoreResult = calculateReadinessScore(bufferHours);
    updateReadinessUI(scoreResult);
    updateAICoach(bufferHours, scoreResult);
    renderAccountabilityLoss();
  }

  // --- BUFFER HOURS LOGIC ---
  function calculateBuffer() {
    const active = state.studyHours + state.gymHours + state.dietHours + state.sleepHours;
    const buffer = 24.0 - active;
    return parseFloat(buffer.toFixed(2));
  }

  function updateBufferCard(bufferHours) {
    dom.bufferHoursValue.textContent = bufferHours >= 0 ? bufferHours.toFixed(1) : `-${Math.abs(bufferHours).toFixed(1)}`;
    const pct = Math.max(0, Math.min(100, (bufferHours / 24) * 100));
    dom.bufferProgressBar.style.width = `${pct}%`;

    // Remove state classes
    dom.bufferCard.classList.remove('warning-state', 'danger-state');

    if (bufferHours < 0) {
      dom.bufferCard.classList.add('danger-state');
      dom.bufferStatusBadge.textContent = 'Overbooked (>24h)';
      dom.bufferDesc.textContent = 'Critical error: Total activities exceed 24 hours. Reduce blocks to restore reality.';
    } else if (bufferHours < 1.5) {
      dom.bufferCard.classList.add('danger-state');
      dom.bufferStatusBadge.textContent = 'Critical Burnout Buffer';
      dom.bufferDesc.textContent = 'Severe risk: under 1.5h buffer allows zero friction, commute delays, or mental decompression.';
    } else if (bufferHours < 3.0) {
      dom.bufferCard.classList.add('warning-state');
      dom.bufferStatusBadge.textContent = 'Tight Schedule';
      dom.bufferDesc.textContent = 'Tightly packed routine. Requires high discipline to avoid encroaching into sleep hours.';
    } else if (bufferHours <= 6.5) {
      dom.bufferStatusBadge.textContent = 'Optimal Buffer';
      dom.bufferDesc.textContent = 'Balanced free margin for commute, wind-down rituals, hydration & sustainable recovery.';
    } else {
      dom.bufferStatusBadge.textContent = 'Ample Slack Time';
      dom.bufferDesc.textContent = 'Substantial unallocated hours available. You can safely increase deep work or active training.';
    }
  }

  // --- SCORING ENGINE (READINESS SCORE 0–100) ---
  function calculateReadinessScore(bufferHours) {
    let score = 100;
    const breakdown = [];

    // 1. Sleep Scoring (Strict 6-8h, ideal 7.5h)
    let sleepDelta = 0;
    if (state.sleepHours < 6.0) {
      sleepDelta = -30;
      breakdown.push({ item: 'Sleep < 6.0h (Severe recovery debt & cortisol spike)', pts: sleepDelta, type: 'penalty' });
    } else if (state.sleepHours < 7.0) {
      sleepDelta = -12;
      breakdown.push({ item: 'Sleep 6.0–7.0h (Slight hormonal & CNS deficit)', pts: sleepDelta, type: 'penalty' });
    } else if (state.sleepHours > 8.0) {
      sleepDelta = -15;
      breakdown.push({ item: 'Sleep > 8.0h (Hypersomnia lethargy penalty)', pts: sleepDelta, type: 'penalty' });
    } else {
      sleepDelta = +5;
      breakdown.push({ item: 'Sleep 7.0–8.0h (Optimal restorative endocrine state)', pts: sleepDelta, type: 'bonus' });
    }
    score += sleepDelta;

    // 2. Gym Days / Week (Target 5 days)
    let gymDelta = 0;
    if (state.gymDays === 5) {
      gymDelta = +5;
      breakdown.push({ item: 'Gym 5 Days/Week (Gold Standard PPLUL split)', pts: gymDelta, type: 'bonus' });
    } else if (state.gymDays < 5) {
      const missing = 5 - state.gymDays;
      gymDelta = -(missing * 8);
      breakdown.push({ item: `Gym ${state.gymDays}/5 days (${missing} missing sessions)`, pts: gymDelta, type: 'penalty' });
    } else if (state.gymDays > 5) {
      // 6 or 7 days
      gymDelta = -6;
      breakdown.push({ item: `Gym ${state.gymDays} Days (Risk of CNS overtraining without deload)`, pts: gymDelta, type: 'penalty' });
    }
    score += gymDelta;

    // 3. Gym Session Duration
    if (state.gymHours < 0.75 && state.gymDays > 0) {
      score -= 8;
      breakdown.push({ item: 'Gym session < 45m (Insufficient hypertrophy volume)', pts: -8, type: 'penalty' });
    } else if (state.gymHours > 2.25) {
      score -= 10;
      breakdown.push({ item: 'Gym session > 2.25h (Elevated cortisol / junk volume)', pts: -10, type: 'penalty' });
    }

    // 4. Study / Deep Work Hours (Target 4-8h, burnout at >10h)
    let studyDelta = 0;
    if (state.studyHours < 4.0) {
      const def = (4.0 - state.studyHours) * 5;
      studyDelta = -Math.round(def);
      breakdown.push({ item: `Study < 4.0h (${state.studyHours}h deep work is below momentum threshold)`, pts: studyDelta, type: 'penalty' });
    } else if (state.studyHours > 10.0) {
      const excess = (state.studyHours - 10.0) * 8;
      studyDelta = -Math.round(excess);
      breakdown.push({ item: `Study > 10.0h (Burnout penalty: diminishing cognitive returns)`, pts: studyDelta, type: 'penalty' });
    } else {
      studyDelta = +5;
      breakdown.push({ item: `Study 4.0–8.0h (Optimal cognitive deep work block)`, pts: studyDelta, type: 'bonus' });
    }
    score += studyDelta;

    // 5. Buffer Hours Penalty / Bonus
    if (bufferHours < 0) {
      score -= 40;
      breakdown.push({ item: 'Buffer < 0h (Time over-allocation impossible to sustain)', pts: -40, type: 'penalty' });
    } else if (bufferHours < 1.5) {
      score -= 22;
      breakdown.push({ item: 'Buffer < 1.5h (Zero friction buffer leads to routine collapse)', pts: -22, type: 'penalty' });
    } else if (bufferHours >= 2.0 && bufferHours <= 6.0) {
      score += 5;
      breakdown.push({ item: 'Healthy 2–6h Buffer (Guarantees lifestyle decompression)', pts: 5, type: 'bonus' });
    }

    // 6. Goal Profile Multipliers
    if (state.goal === 'muscle') {
      if (state.sleepHours < 7.0) {
        score -= 5;
        breakdown.push({ item: 'Muscle Goal: Strict recovery penalty for sleep < 7h', pts: -5, type: 'penalty' });
      }
    } else if (state.goal === 'exam') {
      if (state.studyHours < 6.0) {
        score -= 6;
        breakdown.push({ item: 'Exam Goal: Deep work below 6.0h target', pts: -6, type: 'penalty' });
      }
    }

    // Clamp score 0 - 100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    return { score: finalScore, breakdown };
  }

  function updateReadinessUI(result) {
    const { score, breakdown } = result;
    dom.readinessScoreVal.textContent = score;

    // SVG Circle offset (circumference = 314)
    const offset = 314 - (314 * score) / 100;
    dom.scoreCircleBar.style.strokeDashoffset = offset;

    // Tier formatting
    let tierColor = COLORS.buffer;
    let title = 'Peak Prime State';
    let desc = 'Hormonal recovery & deep cognitive focus are synchronized.';

    if (score < 65) {
      tierColor = COLORS.bufferDanger;
      title = 'High Burnout / Deficit';
      desc = 'Routine is out of balance. Cortisol risk and recovery deficits detected.';
    } else if (score < 85) {
      tierColor = COLORS.bufferWarning;
      title = 'Moderate Strain';
      desc = 'Functional baseline, but buffer compression or training gaps exist.';
    }

    dom.scoreCircleBar.style.stroke = tierColor;
    dom.readinessTitle = dom.readinessTierText;
    dom.readinessTierText.textContent = title;
    dom.readinessTierText.style.color = tierColor;
    dom.readinessTierDesc.textContent = desc;

    // Populate formula drawer list
    dom.formulaList.innerHTML = '';
    breakdown.forEach(b => {
      const li = document.createElement('li');
      li.className = 'formula-item';
      li.innerHTML = `
        <span>${b.item}</span>
        <strong class="item-pts ${b.type}">${b.pts > 0 ? '+' + b.pts : b.pts} pts</strong>
      `;
      dom.formulaList.appendChild(li);
    });
  }

  // --- VISUALIZATIONS (CHART.JS) ---
  function initCharts() {
    // 1. Donut Chart (24h Allocation)
    const donutCtx = dom.donutCanvas.getContext('2d');
    donutChartInstance = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['Study / Work', 'Gym', 'Diet & Rec', 'Night Sleep', 'Free Buffer'],
        datasets: [{
          data: [6.0, 1.5, 1.5, 7.5, 7.5],
          backgroundColor: [
            COLORS.study,
            COLORS.gym,
            COLORS.diet,
            COLORS.sleep,
            COLORS.buffer
          ],
          borderWidth: 2,
          borderColor: '#0e131f',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} hrs (${Math.round((ctx.raw / 24) * 100)}%)`
            }
          }
        }
      }
    });

    // 2. Horizontal Bar Chart (Sorted Breakdown)
    const barCtx = dom.barCanvas.getContext('2d');
    barChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Sleep', 'Study', 'Buffer', 'Gym', 'Diet'],
        datasets: [{
          data: [7.5, 6.0, 7.5, 1.5, 1.5],
          backgroundColor: [
            COLORS.sleep,
            COLORS.study,
            COLORS.buffer,
            COLORS.gym,
            COLORS.diet
          ],
          borderRadius: 6,
          barThickness: 14
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.raw} Hours`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
            max: 16
          },
          y: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11, weight: 600 } }
          }
        }
      }
    });

    // 3. Balance Radar Chart (Discipline, Recovery, Fitness, Focus)
    const radarCtx = dom.radarCanvas.getContext('2d');
    radarChartInstance = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Discipline', 'Recovery', 'Fitness', 'Focus'],
        datasets: [{
          label: 'Performance Score',
          data: [88, 92, 85, 90],
          backgroundColor: 'rgba(56, 189, 248, 0.18)',
          borderColor: '#38bdf8',
          borderWidth: 2,
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: {
              display: false,
              stepSize: 25
            },
            pointLabels: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 11, weight: 600 }
            }
          }
        }
      }
    });
  }

  function updateCharts(bufferHours) {
    const safeBuffer = Math.max(0, bufferHours);
    const activeHours = state.studyHours + state.gymHours + state.dietHours;

    dom.centerActiveHours.textContent = activeHours.toFixed(1);

    // 1. Update Donut Chart
    if (donutChartInstance) {
      donutChartInstance.data.datasets[0].data = [
        state.studyHours,
        state.gymHours,
        state.dietHours,
        state.sleepHours,
        safeBuffer
      ];
      // Color buffer dynamic
      donutChartInstance.data.datasets[0].backgroundColor[4] =
        bufferHours < 1.5 ? COLORS.bufferDanger : (bufferHours < 3.0 ? COLORS.bufferWarning : COLORS.buffer);
      donutChartInstance.update();
    }

    // 2. Update Horizontal Bar Chart (Sorted descending)
    if (barChartInstance) {
      const categories = [
        { label: 'Study/Work', val: state.studyHours, color: COLORS.study },
        { label: 'Night Sleep', val: state.sleepHours, color: COLORS.sleep },
        { label: 'Gym Session', val: state.gymHours, color: COLORS.gym },
        { label: 'Diet & Meal', val: state.dietHours, color: COLORS.diet },
        { label: 'Buffer Slack', val: safeBuffer, color: bufferHours < 1.5 ? COLORS.bufferDanger : COLORS.buffer }
      ];

      categories.sort((a, b) => b.val - a.val);

      barChartInstance.data.labels = categories.map(c => c.label);
      barChartInstance.data.datasets[0].data = categories.map(c => c.val);
      barChartInstance.data.datasets[0].backgroundColor = categories.map(c => c.color);
      barChartInstance.update();
    }

    // 3. Update Balance Radar (Discipline, Recovery, Fitness, Focus)
    if (radarChartInstance) {
      // Discipline: Gym adherence + healthy buffer + streak
      let discipline = (state.gymDays / 5) * 45 + (bufferHours >= 1.5 ? 35 : bufferHours * 20) + (Math.min(20, state.streak));
      discipline = Math.min(100, Math.round(discipline));

      // Recovery: Sleep optimal at 7.5h + buffer rest
      let recovery = 100 - (Math.abs(7.5 - state.sleepHours) * 30);
      if (bufferHours < 1.5) recovery -= 20;
      recovery = Math.max(20, Math.min(100, Math.round(recovery)));

      // Fitness: Gym days + session length
      let fitness = (state.gymDays / 5) * 60;
      if (state.gymHours >= 1.0 && state.gymHours <= 2.0) fitness += 40;
      else fitness += 20;
      fitness = Math.min(100, Math.round(fitness));

      // Focus: Study hours (4-8h is 100%)
      let focus = 100;
      if (state.studyHours < 4.0) focus = (state.studyHours / 4.0) * 80;
      else if (state.studyHours > 10.0) focus = Math.max(40, 100 - (state.studyHours - 10) * 15);
      focus = Math.min(100, Math.round(focus));

      radarChartInstance.data.datasets[0].data = [discipline, recovery, fitness, focus];
      radarChartInstance.update();
    }
  }

  // --- AI MOTIVATION LAYER ---
  function updateAICoach(bufferHours, scoreResult) {
    const { score } = scoreResult;
    let coachBadge = 'Dialed In';
    let messageHtml = '';

    // Reacting to specific parameters
    if (state.sleepHours < 6.5) {
      coachBadge = 'Recovery Debt Alert';
      messageHtml = `
        <p class="coach-warning">⚠️ Cortisol & Myofibrillar Warning:</p>
        <p>At <strong>${state.sleepHours}h sleep</strong>, you are cutting deeply into REM and slow-wave delta cycles. Your body secretes ~70% of daily human growth hormone (HGH) during deep sleep. Truncating this produces an immediate <strong>+37% afternoon cortisol spike</strong>, blunts muscle repair, and impairs memory consolidation.</p>
        <p>Prioritize 7.5h immediately to keep your cognitive edge and anabolic drive alive.</p>
      `;
    } else if (state.gymDays < 4) {
      coachBadge = 'Intensity Stall';
      messageHtml = `
        <p class="coach-warning">🛑 Progressive Overload Slipping:</p>
        <p>At <strong>${state.gymDays} gym days/week</strong>, muscle protein synthesis (which only lasts 36–48 hours post-workout) is sitting idle 4+ days every week. You cannot out-study a neglected physiology.</p>
        <p>Commit to the 5-day standard. Even a brisk 45-minute push session cements neurological momentum and dopamine regulation.</p>
      `;
    } else if (state.studyHours > 10.0) {
      coachBadge = 'Cognitive Diminishing Returns';
      messageHtml = `
        <p class="coach-warning">🧠 Watch the Burnout Horizon:</p>
        <p>Pushing <strong>${state.studyHours}h deep work</strong> sounds stoic, but neuro-chemistry shows cognitive throughput drops by >40% past hour 8. Adenosine builds up, neural latency increases, and error rates multiply.</p>
        <p>Protect your buffer hours. Elite performers win through density of focus, not exhausted seat time.</p>
      `;
    } else if (bufferHours < 1.2) {
      coachBadge = 'Zero Friction Buffer';
      messageHtml = `
        <p class="coach-warning">⚡ Schedule Fragility Detected:</p>
        <p>You have only <strong>${bufferHours.toFixed(1)}h of buffer</strong> in your 24-hour cycle. Any unexpected delay—traffic, extra meal prep, a work call—will directly rob your 7.5h sleep or gym session.</p>
        <p>Carve out at least 2 hours of buffer slack to make this routine truly resilient.</p>
      `;
    } else {
      coachBadge = 'Savage Synergy 🔥';
      messageHtml = `
        <p class="coach-highlight">🏆 Dialed In & Primed for Compounding:</p>
        <p>Your blueprint is world-class: <strong>${state.studyHours}h deep work</strong>, <strong>5-day gym rhythm</strong>, and <strong>${state.sleepHours}h restorative sleep</strong> backed by <strong>${bufferHours.toFixed(1)}h healthy buffer</strong>.</p>
        <p>This sequence allows full cellular glycogen replenishment, maximum synaptic plasticity, and zero lifestyle friction. Execute relentlessly today.</p>
      `;
    }

    dom.coachMoodBadge.textContent = coachBadge;
    dom.coachMessage.innerHTML = messageHtml;

    // Compounding Projections (30 and 90 Days)
    const monthlyGym = Math.round(state.gymDays * 4.3);
    const monthlyStudy = Math.round(state.studyHours * 30);
    dom.forecast30Gym.textContent = `${monthlyGym} Workouts`;
    dom.forecast30Detail.textContent = `~${monthlyStudy}h deep work banked. Neuromuscular adaptations locked in.`;

    const quarterGym = Math.round(state.gymDays * 12.8);
    const quarterStudy = Math.round(state.studyHours * 90);
    dom.forecast90Gym.textContent = `${quarterGym} Workouts`;
    dom.forecast90Detail.textContent = `~${quarterStudy}h mastery. Significant hypertrophy, fat recomposition & cognitive dominance.`;
  }

  // --- ACCOUNTABILITY: WHAT I LOSE IF I SKIP TODAY ---
  function renderAccountabilityLoss() {
    const tab = state.activeLossTab;
    let html = '';

    if (tab === 'gym') {
      const kcalBurned = Math.round(state.gymHours * 450);
      html = `
        <div class="loss-metric-row">
          <span class="loss-title">Cost of Skipping 1 Gym Session Today:</span>
          <span class="loss-compound-tag">90-Day Compounding Drag</span>
        </div>
        <ul class="loss-impact-list">
          <li><span class="loss-bullet">✕</span> <strong>Immediate:</strong> Lost ~${kcalBurned} kcal metabolic burn + miss the 48h muscle protein synthesis window.</li>
          <li><span class="loss-bullet">✕</span> <strong>Psychological:</strong> Breaks neurological consistency; skipping once increases odds of skipping tomorrow by 61%.</li>
          <li><span class="loss-bullet">✕</span> <strong>90-Day Deficit:</strong> Letting this slip 1x/week loses <strong>13 workouts (~${13 * kcalBurned} kcal)</strong>, setting strength gains back by a full month.</li>
        </ul>
      `;
    } else if (tab === 'sleep') {
      html = `
        <div class="loss-metric-row">
          <span class="loss-title">Cost of 1 Night Poor Sleep (<6h):</span>
          <span class="loss-compound-tag">Endocrine & Neural Crash</span>
        </div>
        <ul class="loss-impact-list">
          <li><span class="loss-bullet">✕</span> <strong>Hormonal:</strong> +37% cortisol spike tomorrow + 15% drop in circulating testosterone / IGF-1.</li>
          <li><span class="loss-bullet">✕</span> <strong>Appetite Dysregulation:</strong> Ghrelin (hunger hormone) increases by ~18%; leptin (satiety) drops by ~15%.</li>
          <li><span class="loss-bullet">✕</span> <strong>90-Day Horizon:</strong> 2 poor sleep nights/week creates 100+ hours of cumulative sleep debt, stalling muscle hypertrophy and inducing chronic brain fog.</li>
        </ul>
      `;
    } else if (tab === 'study') {
      html = `
        <div class="loss-metric-row">
          <span class="loss-title">Cost of Skipping Deep Work Today:</span>
          <span class="loss-compound-tag">Loss of Cognitive Compounding</span>
        </div>
        <ul class="loss-impact-list">
          <li><span class="loss-bullet">✕</span> <strong>Immediate:</strong> Lose ${state.studyHours}h of uninterrupted cognitive flow and knowledge encoding.</li>
          <li><span class="loss-bullet">✕</span> <strong>Attention Residue:</strong> Procrastination induces guilt and cognitive drag that degrades gym performance and sleep latency.</li>
          <li><span class="loss-bullet">✕</span> <strong>90-Day Compounding:</strong> Skipping just 1 session/week forfeits <strong>~78 hours of skill mastery</strong> across the quarter.</li>
        </ul>
      `;
    }

    dom.lossContentBox.innerHTML = html;
  }

  // --- EXPORT & ROUTINE SUMMARY ---
  function openExportModal() {
    const buffer = calculateBuffer();
    const readiness = calculateReadinessScore(buffer);

    const summary = `=====================================================
LIFE ROUTINE BLUEPRINT & CONSISTENCY SPECIFICATION
Generated by Life Routine Dashboard
=====================================================

1. DAILY SEQUENCE & ALLOCATIONS:
- Morning Block:    ${state.studyHours}h Study / Deep Work
- Evening Block:    ${state.gymHours}h Gym Session (${state.gymDays} days/week)
- Post-Gym Block:   ${state.dietHours}h Diet, Nutrition & Recovery
- Night Block:      ${state.sleepHours}h Sleep (Strict 6–8h target)
-----------------------------------------------------
- Total Active:     ${(state.studyHours + state.gymHours + state.dietHours).toFixed(1)} Hours
- Restorative Sleep:${state.sleepHours} Hours
- Free Buffer:      ${buffer.toFixed(1)} Hours (Commute, social & unwind)

2. PERFORMANCE METRICS:
- Readiness Score:  ${readiness.score} / 100
- Goal Archetype:   ${state.goal.toUpperCase()}
- Current Streak:   ${state.streak} Days
- 4-Week Adherence: ${dom.adherenceRateVal.textContent}

3. 90-DAY COMPOUNDING PROJECTION:
- Gym Sessions:     ~${Math.round(state.gymDays * 12.8)} total training sessions
- Deep Work Banked: ~${Math.round(state.studyHours * 90)} focused hours
- Recommended Split: 5-Day Push-Pull-Legs-Upper-Lower (PPLUL)

=====================================================`;

    dom.exportSummaryText.textContent = summary;
    dom.exportModal.classList.add('open');
  }

  function closeExportModal() {
    dom.exportModal.classList.remove('open');
  }

  function copyRoutineSummary() {
    const text = dom.exportSummaryText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied routine summary to clipboard!');
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  }

  function downloadRoutineJson() {
    const buffer = calculateBuffer();
    const exportData = {
      exportDate: new Date().toISOString(),
      routine: {
        studyHours: state.studyHours,
        gymHours: state.gymHours,
        dietHours: state.dietHours,
        sleepHours: state.sleepHours,
        gymDaysPerWeek: state.gymDays,
        bufferHours: buffer,
        goalProfile: state.goal
      },
      schedule: state.weeklyGymSchedule,
      adherence: {
        streak: state.streak,
        log: state.adherenceLog
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-routine-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded routine JSON configuration!');
  }

  // --- BOOTSTRAP ---
  window.addEventListener('DOMContentLoaded', init);

})();
