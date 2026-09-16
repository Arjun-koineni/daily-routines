/**
 * NINETY — 90-Day Athletic & Recovery Regimen
 * Production Engine: Mobile-First, Offline-First, Zero AI bloat
 */

(function () {
  "use strict";

  // =========================================================================
  // 1. CONSTANTS & DEFAULT REGIMEN DATA
  // =========================================================================

  const STORAGE_KEY = "ninety_regimen_v1";

  // Exact 5-day workout splits provided by user
  const DEFAULT_WORKOUTS = {
    1: { // Monday
      title: "Workout — Chest & Triceps",
      isGymDay: true,
      badge: "Gym day",
      exercises: [
        { name: "Barbell Bench Press", reps: "4 x 8-10", notes: "Straight sets, 90-120s rest" },
        { name: "Incline Dumbbell Press", reps: "3 x 10-12", notes: "75-90s rest" },
        { name: "Dips", reps: "3 x 8-10", notes: "75-90s rest" },
        { name: "Superset: Cable Fly", reps: "3 x 12-15", notes: "Superset with next, rest 60s after pair" },
        { name: "Superset: Rope Pushdown", reps: "3 x 12-15", notes: "Lock out elbows, peak tricep contraction" }
      ]
    },
    2: { // Tuesday
      title: "Workout — Back & Biceps",
      isGymDay: true,
      badge: "Gym day",
      exercises: [
        { name: "Deadlift", reps: "4 x 6-8", notes: "Straight sets, 2 min rest" },
        { name: "Pull-Ups / Lat Pulldown", reps: "3 x 8-10", notes: "90s rest" },
        { name: "Barbell/DB Row", reps: "3 x 10-12", notes: "75-90s rest" },
        { name: "Superset: Barbell Curl", reps: "3 x 10-12", notes: "Superset with next" },
        { name: "Superset: Hammer Curl", reps: "3 x 12-15", notes: "Controlled eccentric" }
      ]
    },
    3: { // Wednesday
      title: "Workout — Legs",
      isGymDay: true,
      badge: "Gym day",
      exercises: [
        { name: "Squats", reps: "4 x 8-10", notes: "Straight sets, 2 min rest" },
        { name: "Leg Press", reps: "3 x 12-15", notes: "90s rest" },
        { name: "Romanian Deadlift", reps: "3 x 10-12", notes: "90s rest" },
        { name: "Superset: Walking Lunges", reps: "3 x 12/leg", notes: "Superset with next" },
        { name: "Superset: Standing Calf Raise", reps: "4 x 15-20", notes: "Deep stretch at bottom" }
      ]
    },
    4: { // Thursday - Rest
      title: "Active Recovery & Mobility",
      isGymDay: false,
      badge: "Rest day",
      exercises: [
        { name: "Thoracic & Hip Mobility Flow", reps: "15 min", notes: "Dynamic stretching & hip openers" },
        { name: "Foam Rolling / Tissue Work", reps: "10 min", notes: "Quads, lats, upper back" },
        { name: "Zone 1 Recovery Walk", reps: "30-40 min", notes: "Promote systemic lymphatic bloodflow" }
      ]
    },
    5: { // Friday
      title: "Workout — Shoulders & Abs",
      isGymDay: true,
      badge: "Gym day",
      exercises: [
        { name: "Overhead Press", reps: "4 x 8-10", notes: "Straight sets, 90-120s rest" },
        { name: "Lateral Raises", reps: "3 x 12-15", notes: "60-75s rest" },
        { name: "Barbell Shrugs", reps: "3 x 12-15", notes: "75s rest" },
        { name: "Superset: Rear Delt Fly", reps: "3 x 12-15", notes: "Superset with next" },
        { name: "Superset: Hanging Leg Raise / Plank", reps: "3 x 15 / 45s", notes: "Brace core tight" }
      ]
    },
    6: { // Saturday - Cardio
      title: "Cardio & Cycling (~60 min)",
      isGymDay: true,
      badge: "Gym day",
      exercises: [
        { name: "Warm-up walk", reps: "5 min", notes: "Incline walk activation" },
        { name: "Cycling (steady pace)", reps: "20 min", notes: "Zone 2 aerobic threshold" },
        { name: "Treadmill intervals (1 min sprint / 2 min walk x 5)", reps: "15 min", notes: "High heart rate conditioning" },
        { name: "Core finisher (plank, bicycle crunch, mountain climbers x 3)", reps: "10 min", notes: "Continuous circuit" },
        { name: "Cool-down / stretch", reps: "5-10 min", notes: "Hamstrings, calves, lower back" }
      ]
    },
    0: { // Sunday - Rest
      title: "Rest, Nutrition & CNS Recovery",
      isGymDay: false,
      badge: "Rest day",
      exercises: [
        { name: "Full Systemic Rest", reps: "All Day", notes: "Allow muscular supercompensation" },
        { name: "Meal & Protein Preparation", reps: "30 min", notes: "Boil eggs, prep clean staples for week" },
        { name: "Early Sleep Protocol", reps: "7.5 hrs", notes: "Wind down early for Monday heavy bench" }
      ]
    }
  };

  // Exact locked diet specifications provided by user
  const DEFAULT_DIETS = {
    1: ["2 eggs (morning)", "3 bananas", "3 eggs (evening)"],
    2: ["2 eggs (morning)", "3 bananas", "1 egg (evening)"],
    3: ["2 eggs (morning)", "3 bananas"],
    4: ["Clean recovery meals", "High protein staples (chicken/fish/paneer)", "Complex carbs & hydration"],
    5: ["2 eggs (morning)", "3 bananas", "1 egg (evening)"],
    6: ["Pre-cardio energy snack (banana/oats)", "Post-cardio lean protein", "Hydration replenishment"],
    0: ["2 eggs (morning)", "3 bananas"]
  };

  // Daily Standards & Do's
  const DEFAULT_DOS = [
    "💧 Hydration: Drink 3.0 Liters of water minimum",
    "😴 Sleep: Secure 7 to 7.5 hours of uninterrupted sleep",
    "🥩 Protein timing: Consume clean protein within 60-90m post-workout",
    "🧘 Mobility: Complete 5-10 min post-lift stretching"
  ];

  // Helper: calculate default next Monday start date
  function getNextMondayDateString() {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 1 is Monday
    const daysUntilNextMonday = ((8 - day) % 7) || 7;
    const nextMon = new Date(d);
    nextMon.setDate(d.getDate() + daysUntilNextMonday);
    return nextMon.toISOString().split("T")[0];
  }

  function getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  // =========================================================================
  // 2. STATE & STORAGE CONTROLLER
  // =========================================================================

  let appState = {
    version: 1,
    startDate: getNextMondayDateString(), // Defaults to Next Week
    customWorkouts: {},                  // Overrides by dayOfWeek (0-6)
    customDiets: {},                     // Overrides by dayOfWeek (0-6)
    customDos: [...DEFAULT_DOS],         // Daily Do's
    frozenDates: {},                     // Dates marked as holiday/paused: { "YYYY-MM-DD": "Reason" }
    logs: {},                            // Keyed by date: { workoutDone: bool, sleep: num, water: num, checkedExercises: [], checkedDiet: [], checkedDos: [], timestamp: num }
    currentStreak: 0,
    bestStreak: 0
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        appState = Object.assign({}, appState, parsed);
      }
    } catch (e) {
      console.warn("Could not parse saved state, using defaults.", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }

  // =========================================================================
  // 3. DATE & TIMELINE LOGIC
  // =========================================================================

  let viewingDate = getTodayDateString(); // Defaults to viewing today

  function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function formatDateFriendly(dateStr) {
    const d = parseLocalDate(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  function getDayOfWeek(dateStr) {
    return parseLocalDate(dateStr).getDay();
  }

  function addDays(dateStr, n) {
    const d = parseLocalDate(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  }

  function daysDifference(dateStrA, dateStrB) {
    const msA = parseLocalDate(dateStrA).getTime();
    const msB = parseLocalDate(dateStrB).getTime();
    return Math.round((msB - msA) / (1000 * 60 * 60 * 24));
  }

  // Returns array of 90 challenge dates taking frozen/paused days into account
  function getChallengeDaysList() {
    const days = [];
    let curDate = appState.startDate;
    let validCount = 0;

    // Build days until we have 90 active challenge days
    while (validCount < 90) {
      const isFrozen = !!appState.frozenDates[curDate];
      days.push({
        date: curDate,
        dayNumber: isFrozen ? validCount : validCount + 1,
        isFrozen: isFrozen
      });

      if (!isFrozen) {
        validCount++;
      }
      curDate = addDays(curDate, 1);
    }
    return days;
  }

  function getCurrentDayNumber() {
    const today = getTodayDateString();
    const challengeDays = getChallengeDaysList();
    const foundIndex = challengeDays.findIndex(d => d.date === today);
    if (foundIndex === -1) {
      if (today < appState.startDate) return 0; // Upcoming
      return 90; // Passed
    }
    return challengeDays[foundIndex].dayNumber;
  }

  // =========================================================================
  // 4. METRICS & STREAK CALCULATOR
  // =========================================================================

  function calculateMetrics() {
    const challengeDays = getChallengeDaysList();
    const today = getTodayDateString();

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let gymDaysDone = 0;
    let totalGymDaysScheduled = 0;

    let totalSleepLogged = 0;
    let sleepLogCount = 0;
    let totalWaterLogged = 0;
    let waterLogCount = 0;

    for (let i = 0; i < challengeDays.length; i++) {
      const item = challengeDays[i];
      const date = item.date;
      if (date > today) break; // Future day

      const dayOfWeek = getDayOfWeek(date);
      const isGymDay = (DEFAULT_WORKOUTS[dayOfWeek] && DEFAULT_WORKOUTS[dayOfWeek].isGymDay);
      if (isGymDay && !item.isFrozen) totalGymDaysScheduled++;

      const log = appState.logs[date];
      const isFrozen = item.isFrozen;

      if (isFrozen) {
        // Paused/frozen day preserves streak without breaking or advancing
        continue;
      }

      if (log) {
        if (log.sleep !== undefined) {
          totalSleepLogged += Number(log.sleep);
          sleepLogCount++;
        }
        if (log.water !== undefined) {
          totalWaterLogged += Number(log.water);
          waterLogCount++;
        }

        if (log.workoutDone) {
          gymDaysDone++;
        }

        // Qualifying day for streak:
        // If it's a gym day, workoutDone should be true or logged.
        // If rest day, logging sleep/water/diet keeps streak alive!
        const completedDay = isGymDay ? (log.workoutDone === true) : true;

        if (completedDay) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      } else {
        // Not logged and date is in the past
        if (date < today) {
          tempStreak = 0;
        }
      }
    }

    currentStreak = tempStreak;
    appState.currentStreak = currentStreak;
    appState.bestStreak = Math.max(appState.bestStreak || 0, bestStreak);

    // Calculate dynamic recovery / readiness score
    const todayLog = appState.logs[today] || {};
    const recentSleep = todayLog.sleep !== undefined ? Number(todayLog.sleep) : 7.0;
    const recentWater = todayLog.water !== undefined ? Number(todayLog.water) : 2.75;
    const sleepScore = Math.min(100, (recentSleep / 7.5) * 50);
    const waterScore = Math.min(100, (recentWater / 3.0) * 50);
    const readinessScore = Math.round(sleepScore + waterScore);

    return {
      currentStreak,
      bestStreak: appState.bestStreak,
      gymDaysDone,
      totalGymDaysScheduled: Math.max(totalGymDaysScheduled, 65),
      readinessScore: Math.min(100, Math.max(50, readinessScore)),
      avgSleep: sleepLogCount ? (totalSleepLogged / sleepLogCount).toFixed(1) : "--",
      avgWater: waterLogCount ? (totalWaterLogged / waterLogCount).toFixed(2) : "--",
      gymPercentage: totalGymDaysScheduled ? Math.round((gymDaysDone / totalGymDaysScheduled) * 100) : 0
    };
  }

  // =========================================================================
  // 5. UI RENDERERS
  // =========================================================================

  const elements = {
    // Top & Banner
    btnResetDay: document.getElementById("btnResetDay"),
    btnPauseGym: document.getElementById("btnPauseGym"),
    btnSettings: document.getElementById("btnSettings"),
    statusBanner: document.getElementById("statusBanner"),
    bannerTitle: document.getElementById("bannerTitle"),
    bannerSub: document.getElementById("bannerSub"),
    btnBannerAction: document.getElementById("btnBannerAction"),

    // Stats
    currentStreakDisplay: document.getElementById("currentStreakDisplay"),
    statCurrentStreak: document.getElementById("statCurrentStreak"),
    statBestStreak: document.getElementById("statBestStreak"),
    statGymRatio: document.getElementById("statGymRatio"),
    statReadiness: document.getElementById("statReadiness"),

    // Dots Matrix
    dotsGrid: document.getElementById("dotsGrid"),
    progressTimelineText: document.getElementById("progressTimelineText"),

    // Today Section
    todayDateTitle: document.getElementById("todayDateTitle"),
    todayDaySubtitle: document.getElementById("todayDaySubtitle"),
    todayGymBadge: document.getElementById("todayGymBadge"),
    btnJumpToToday: document.getElementById("btnJumpToToday"),

    // Workout
    workoutTitle: document.getElementById("workoutTitle"),
    workoutTableBody: document.getElementById("workoutTableBody"),
    btnRestTimer: document.getElementById("btnRestTimer"),
    timerLabel: document.getElementById("timerLabel"),
    restTimerBar: document.getElementById("restTimerBar"),
    timerCountdown: document.getElementById("timerCountdown"),
    timerProgress: document.getElementById("timerProgress"),
    btnCancelTimer: document.getElementById("btnCancelTimer"),
    btnEditWorkout: document.getElementById("btnEditWorkout"),

    // Diet
    dietChecklist: document.getElementById("dietChecklist"),
    btnEditDiet: document.getElementById("btnEditDiet"),

    // Do's
    dosChecklist: document.getElementById("dosChecklist"),
    btnEditDos: document.getElementById("btnEditDos"),

    // Log Controls
    toggleWorkoutDone: document.getElementById("toggleWorkoutDone"),
    sliderSleep: document.getElementById("sliderSleep"),
    sleepValueDisplay: document.getElementById("sleepValueDisplay"),
    sliderWater: document.getElementById("sliderWater"),
    waterValueDisplay: document.getElementById("waterValueDisplay"),
    btnSaveLog: document.getElementById("btnSaveLog"),

    // Trends & Discipline
    avgSleepDisplay: document.getElementById("avgSleepDisplay"),
    avgWaterDisplay: document.getElementById("avgWaterDisplay"),
    sleepChartSvg: document.getElementById("sleepChartSvg"),
    waterChartSvg: document.getElementById("waterChartSvg"),
    sleepEmptyMsg: document.getElementById("sleepEmptyMsg"),
    waterEmptyMsg: document.getElementById("waterEmptyMsg"),
    discGymPercent: document.getElementById("discGymPercent"),
    discDietPercent: document.getElementById("discDietPercent"),
    discHydrationPercent: document.getElementById("discHydrationPercent"),

    // Footer & Backup
    btnExportData: document.getElementById("btnExportData"),
    importFileInput: document.getElementById("importFileInput"),
    btnRestartChallenge: document.getElementById("btnRestartChallenge"),
    toast: document.getElementById("toast"),

    // Modals
    modalPause: document.getElementById("modalPause"),
    btnClosePauseModal: document.getElementById("btnClosePauseModal"),
    pauseReason: document.getElementById("pauseReason"),
    freezeCurrentState: document.getElementById("freezeCurrentState"),
    btnToggleFreeze: document.getElementById("btnToggleFreeze"),

    modalEditWorkout: document.getElementById("modalEditWorkout"),
    modalEditWorkoutTitle: document.getElementById("modalEditWorkoutTitle"),
    inputWorkoutName: document.getElementById("inputWorkoutName"),
    textareaExercises: document.getElementById("textareaExercises"),
    btnResetDefaultWorkout: document.getElementById("btnResetDefaultWorkout"),
    btnSaveWorkoutChanges: document.getElementById("btnSaveWorkoutChanges"),
    btnCloseEditWorkout: document.getElementById("btnCloseEditWorkout"),

    modalEditDiet: document.getElementById("modalEditDiet"),
    modalEditDietTitle: document.getElementById("modalEditDietTitle"),
    textareaDietItems: document.getElementById("textareaDietItems"),
    btnResetDefaultDiet: document.getElementById("btnResetDefaultDiet"),
    btnSaveDietChanges: document.getElementById("btnSaveDietChanges"),
    btnCloseEditDiet: document.getElementById("btnCloseEditDiet"),

    modalEditDos: document.getElementById("modalEditDos"),
    textareaDosItems: document.getElementById("textareaDosItems"),
    btnResetDefaultDos: document.getElementById("btnResetDefaultDos"),
    btnSaveDosChanges: document.getElementById("btnSaveDosChanges"),
    btnCloseEditDos: document.getElementById("btnCloseEditDos"),

    modalSettings: document.getElementById("modalSettings"),
    inputStartDate: document.getElementById("inputStartDate"),
    btnSaveSettings: document.getElementById("btnSaveSettings"),
    btnCloseSettings: document.getElementById("btnCloseSettings")
  };

  function showToast(msg) {
    elements.toast.textContent = msg;
    elements.toast.classList.add("show");
    setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 2800);
  }

  // --- Render Top Ribbon Banner ---
  function renderStatusBanner() {
    const today = getTodayDateString();
    const diff = daysDifference(today, appState.startDate);

    if (diff > 0) {
      elements.statusBanner.classList.remove("hidden");
      elements.bannerTitle.textContent = "Regimen Starts Next Week";
      elements.bannerSub.textContent = `Starts in ${diff} day${diff === 1 ? "" : "s"} (${formatDateFriendly(appState.startDate)}). Preview mode active.`;
      elements.btnBannerAction.textContent = "Start Today Instead";
      elements.btnBannerAction.onclick = () => {
        appState.startDate = today;
        saveState();
        renderAll();
        showToast("Challenge officially started today!");
      };
    } else {
      // If currently paused today
      if (appState.frozenDates[today]) {
        elements.statusBanner.classList.remove("hidden");
        elements.bannerTitle.textContent = "Gym Freeze Active (Holiday)";
        elements.bannerSub.textContent = `Today is paused (${appState.frozenDates[today]}). Streak is preserved.`;
        elements.btnBannerAction.textContent = "Resume Regimen";
        elements.btnBannerAction.onclick = () => {
          delete appState.frozenDates[today];
          saveState();
          renderAll();
          showToast("Regimen resumed!");
        };
      } else {
        elements.statusBanner.classList.add("hidden");
      }
    }
  }

  // --- Render Stats Ribbon ---
  function renderStats() {
    const m = calculateMetrics();
    elements.currentStreakDisplay.textContent = m.currentStreak;
    elements.statCurrentStreak.textContent = m.currentStreak;
    elements.statBestStreak.textContent = m.bestStreak;
    elements.statGymRatio.textContent = `${m.gymDaysDone}/${m.totalGymDaysScheduled}`;
    elements.statReadiness.textContent = `${m.readinessScore}%`;

    elements.avgSleepDisplay.textContent = `${m.avgSleep} hrs avg`;
    elements.avgWaterDisplay.textContent = `${m.avgWater} L avg`;
    elements.discGymPercent.textContent = `${m.gymPercentage}%`;
  }

  // --- Render 90-Day Contribution Grid (GitHub-Style) ---
  function renderMatrix() {
    const challengeDays = getChallengeDaysList();
    const today = getTodayDateString();
    const dayNum = getCurrentDayNumber();

    elements.progressTimelineText.textContent = `day ${Math.max(1, Math.min(90, dayNum))} of 90 • started ${formatDateFriendly(appState.startDate)}`;
    elements.dotsGrid.innerHTML = "";

    challengeDays.forEach(item => {
      const dot = document.createElement("div");
      dot.className = "matrix-dot";
      dot.setAttribute("data-date", item.date);

      const dayOfWeek = getDayOfWeek(item.date);
      const isGymDay = DEFAULT_WORKOUTS[dayOfWeek] && DEFAULT_WORKOUTS[dayOfWeek].isGymDay;
      const log = appState.logs[item.date];

      if (item.isFrozen) {
        dot.classList.add("dot-paused");
        dot.title = `${formatDateFriendly(item.date)}: Holiday / Paused (${appState.frozenDates[item.date]})`;
      } else if (log) {
        if (log.workoutDone) {
          dot.classList.add("dot-completed");
          dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Completed (Gym Done)`;
        } else {
          dot.classList.add("dot-rest");
          dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Logged (${isGymDay ? "Gym Skipped" : "Rest Day"})`;
        }
      } else if (item.date < today) {
        dot.classList.add("dot-missed");
        dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Missed`;
      } else {
        dot.classList.add("dot-upcoming");
        dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Upcoming`;
      }

      if (item.date === today) {
        dot.classList.add("dot-today");
      }

      // Clicking dot views that day
      dot.addEventListener("click", () => {
        viewingDate = item.date;
        renderTodaySection();
        showToast(`Viewing ${formatDateFriendly(item.date)}`);
      });

      elements.dotsGrid.appendChild(dot);
    });
  }

  // --- Render Today / Active View Section ---
  function renderTodaySection() {
    const today = getTodayDateString();
    const dateStr = viewingDate;
    const dayOfWeek = getDayOfWeek(dateStr);
    const challengeDays = getChallengeDaysList();
    const found = challengeDays.find(d => d.date === dateStr);
    const dayNum = found ? found.dayNumber : 1;
    const isFrozen = !!appState.frozenDates[dateStr];

    // Toggle Jump to Today button
    if (viewingDate !== today) {
      elements.btnJumpToToday.classList.remove("hidden");
    } else {
      elements.btnJumpToToday.classList.add("hidden");
    }

    elements.todayDateText = document.getElementById("todayDateTitle");
    elements.todayDateText.textContent = formatDateFriendly(dateStr);
    elements.todayDaySubtitle.textContent = isFrozen
      ? `Day ${dayNum} of 90 • Holiday / Frozen`
      : `Day ${dayNum} of 90`;

    // Workout split retrieval (custom or default)
    const workout = (appState.customWorkouts && appState.customWorkouts[dayOfWeek]) || DEFAULT_WORKOUTS[dayOfWeek];

    // Badge styling
    if (isFrozen) {
      elements.todayGymBadge.textContent = "Holiday Frozen";
      elements.todayGymBadge.className = "gym-badge badge-paused";
    } else if (workout.isGymDay) {
      elements.todayGymBadge.textContent = "Gym day";
      elements.todayGymBadge.className = "gym-badge";
    } else {
      elements.todayGymBadge.textContent = "Rest day";
      elements.todayGymBadge.className = "gym-badge badge-rest";
    }

    elements.workoutTitle.textContent = workout.title;

    // Existing log for date
    const log = appState.logs[dateStr] || {
      workoutDone: false,
      sleep: 7.0,
      water: 2.75,
      checkedExercises: [],
      checkedDiet: [],
      checkedDos: []
    };

    // Render Workout Table
    elements.workoutTableBody.innerHTML = "";
    workout.exercises.forEach((ex, idx) => {
      const isChecked = (log.checkedExercises || []).includes(idx);
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="td-check">
          <input type="checkbox" class="set-checkbox" data-ex-idx="${idx}" ${isChecked ? "checked" : ""} aria-label="Exercise complete" />
        </td>
        <td class="th-ex">${ex.name}</td>
        <td class="th-reps">${ex.reps}</td>
        <td class="th-notes">${ex.notes || "—"}</td>
      `;

      tr.querySelector(".set-checkbox").addEventListener("change", (e) => {
        if (!appState.logs[dateStr]) appState.logs[dateStr] = { ...log };
        const list = appState.logs[dateStr].checkedExercises || [];
        if (e.target.checked) {
          if (!list.includes(idx)) list.push(idx);
        } else {
          const pos = list.indexOf(idx);
          if (pos > -1) list.splice(pos, 1);
        }
        appState.logs[dateStr].checkedExercises = list;
        saveState();
      });

      elements.workoutTableBody.appendChild(tr);
    });

    // Render Diet (Exact Locked Plan with Checkmarks)
    const dietItems = (appState.customDiets && appState.customDiets[dayOfWeek]) || DEFAULT_DIETS[dayOfWeek] || [];
    elements.dietChecklist.innerHTML = "";
    dietItems.forEach((meal, idx) => {
      const isChecked = (log.checkedDiet || []).includes(idx);
      const div = document.createElement("div");
      div.className = `check-item ${isChecked ? "done" : ""}`;
      div.innerHTML = `
        <span class="check-custom"></span>
        <span class="check-label">${meal}</span>
      `;
      div.addEventListener("click", () => {
        if (!appState.logs[dateStr]) appState.logs[dateStr] = { ...log };
        const list = appState.logs[dateStr].checkedDiet || [];
        const checked = list.includes(idx);
        if (!checked) {
          list.push(idx);
          div.classList.add("done");
        } else {
          list.splice(list.indexOf(idx), 1);
          div.classList.remove("done");
        }
        appState.logs[dateStr].checkedDiet = list;
        saveState();
      });
      elements.dietChecklist.appendChild(div);
    });

    // Render Daily Standards & Do's
    const dosItems = appState.customDos || DEFAULT_DOS;
    elements.dosChecklist.innerHTML = "";
    dosItems.forEach((item, idx) => {
      const isChecked = (log.checkedDos || []).includes(idx);
      const div = document.createElement("div");
      div.className = `check-item ${isChecked ? "done" : ""}`;
      div.innerHTML = `
        <span class="check-custom"></span>
        <span class="check-label">${item}</span>
      `;
      div.addEventListener("click", () => {
        if (!appState.logs[dateStr]) appState.logs[dateStr] = { ...log };
        const list = appState.logs[dateStr].checkedDos || [];
        const checked = list.includes(idx);
        if (!checked) {
          list.push(idx);
          div.classList.add("done");
        } else {
          list.splice(list.indexOf(idx), 1);
          div.classList.remove("done");
        }
        appState.logs[dateStr].checkedDos = list;
        saveState();
      });
      elements.dosChecklist.appendChild(div);
    });

    // Sliders & Toggle Controls
    elements.toggleWorkoutDone.checked = !!log.workoutDone;

    const sleepVal = log.sleep !== undefined ? log.sleep : 7.0;
    elements.sliderSleep.value = sleepVal;
    elements.sleepValueDisplay.textContent = `${sleepVal} hrs`;

    const waterVal = log.water !== undefined ? log.water : 2.75;
    elements.sliderWater.value = waterVal;
    elements.waterValueDisplay.textContent = `${Number(waterVal).toFixed(2)} L`;
  }

  // --- Render Trend Charts (Pure Responsive SVG Sparklines) ---
  function renderTrendCharts() {
    const dates = Object.keys(appState.logs).sort();
    const recentDates = dates.slice(-14); // Last 14 logged days

    if (recentDates.length < 2) {
      elements.sleepChartSvg.innerHTML = "";
      elements.waterChartSvg.innerHTML = "";
      elements.sleepEmptyMsg.classList.remove("hidden");
      elements.waterEmptyMsg.classList.remove("hidden");
      return;
    }

    elements.sleepEmptyMsg.classList.add("hidden");
    elements.waterEmptyMsg.classList.add("hidden");

    // Sleep chart (0 to 7.5 hrs)
    const sleepPoints = recentDates.map((d, i) => {
      const val = Number(appState.logs[d].sleep || 0);
      const x = (i / (recentDates.length - 1)) * 300 + 10;
      const y = 90 - (val / 7.5) * 75;
      return `${x},${y}`;
    });

    elements.sleepChartSvg.innerHTML = `
      <line x1="10" y1="15" x2="310" y2="15" stroke="rgba(192, 132, 252, 0.2)" stroke-dasharray="3,3" />
      <text x="310" y="12" fill="rgba(192, 132, 252, 0.5)" font-size="8" text-anchor="end">7.5h target</text>
      <polyline points="${sleepPoints.join(" ")}" fill="none" stroke="#c084fc" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${recentDates.map((d, i) => {
        const val = Number(appState.logs[d].sleep || 0);
        const x = (i / (recentDates.length - 1)) * 300 + 10;
        const y = 90 - (val / 7.5) * 75;
        return `<circle cx="${x}" cy="${y}" r="3" fill="#c084fc" />`;
      }).join("")}
    `;

    // Water chart (0 to 3.0 L)
    const waterPoints = recentDates.map((d, i) => {
      const val = Number(appState.logs[d].water || 0);
      const x = (i / (recentDates.length - 1)) * 300 + 10;
      const y = 90 - (val / 3.0) * 75;
      return `${x},${y}`;
    });

    elements.waterChartSvg.innerHTML = `
      <line x1="10" y1="15" x2="310" y2="15" stroke="rgba(56, 189, 248, 0.2)" stroke-dasharray="3,3" />
      <text x="310" y="12" fill="rgba(56, 189, 248, 0.5)" font-size="8" text-anchor="end">3.0L goal</text>
      <polyline points="${waterPoints.join(" ")}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      ${recentDates.map((d, i) => {
        const val = Number(appState.logs[d].water || 0);
        const x = (i / (recentDates.length - 1)) * 300 + 10;
        const y = 90 - (val / 3.0) * 75;
        return `<circle cx="${x}" cy="${y}" r="3" fill="#38bdf8" />`;
      }).join("")}
    `;
  }

  function renderAll() {
    renderStatusBanner();
    renderStats();
    renderMatrix();
    renderTodaySection();
    renderTrendCharts();
  }

  // =========================================================================
  // 6. EVENT HANDLERS & INTERACTIONS
  // =========================================================================

  // Slider Live Value Handlers
  elements.sliderSleep.addEventListener("input", (e) => {
    elements.sleepValueDisplay.textContent = `${e.target.value} hrs`;
  });

  elements.sliderWater.addEventListener("input", (e) => {
    elements.waterValueDisplay.textContent = `${Number(e.target.value).toFixed(2)} L`;
  });

  // Save Today's Log Button
  elements.btnSaveLog.addEventListener("click", () => {
    const dateStr = viewingDate;
    const existing = appState.logs[dateStr] || {};

    appState.logs[dateStr] = {
      ...existing,
      workoutDone: elements.toggleWorkoutDone.checked,
      sleep: parseFloat(elements.sliderSleep.value),
      water: parseFloat(elements.sliderWater.value),
      timestamp: Date.now()
    };

    saveState();
    renderStats();
    renderMatrix();
    renderTrendCharts();
    showToast(`Logged successfully for ${formatDateFriendly(dateStr)}!`);
  });

  // Reset Day Plan Button (Top-Right Action)
  elements.btnResetDay.addEventListener("click", () => {
    if (confirm(`Reset all logs, sets, and checkmarks for ${formatDateFriendly(viewingDate)}?`)) {
      delete appState.logs[viewingDate];
      saveState();
      renderAll();
      showToast(`Reset day plan for ${formatDateFriendly(viewingDate)}`);
    }
  });

  // Jump Back to Today Button
  elements.btnJumpToToday.addEventListener("click", () => {
    viewingDate = getTodayDateString();
    renderAll();
  });

  // Rest Timer Controller
  let timerInterval = null;
  let timerRemaining = 90;

  elements.btnRestTimer.addEventListener("click", () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerRemaining = 90;
    elements.restTimerBar.classList.remove("hidden");
    elements.timerCountdown.textContent = "01:30";
    elements.timerProgress.style.width = "100%";

    const total = 90;
    timerInterval = setInterval(() => {
      timerRemaining--;
      const mins = String(Math.floor(timerRemaining / 60)).padStart(2, "0");
      const secs = String(timerRemaining % 60).padStart(2, "0");
      elements.timerCountdown.textContent = `${mins}:${secs}`;
      elements.timerProgress.style.width = `${(timerRemaining / total) * 100}%`;

      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        elements.timerCountdown.textContent = "READY!";
        showToast("Rest interval complete — next set!");
      }
    }, 1000);
  });

  elements.btnCancelTimer.addEventListener("click", () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    elements.restTimerBar.classList.add("hidden");
  });

  // =========================================================================
  // 7. MODALS LOGIC
  // =========================================================================

  // Modal: Holiday Pause / Gym Freeze
  elements.btnPauseGym.addEventListener("click", () => {
    const isFrozen = !!appState.frozenDates[viewingDate];
    elements.freezeCurrentState.textContent = isFrozen
      ? `Current State: Frozen for this date (${appState.frozenDates[viewingDate]})`
      : `Current State: Active Regimen (Not Paused)`;
    elements.btnToggleFreeze.textContent = isFrozen ? "Unpause (Resume Regimen)" : "Freeze This Day";
    elements.modalPause.classList.remove("hidden");
  });

  elements.btnClosePauseModal.addEventListener("click", () => {
    elements.modalPause.classList.add("hidden");
  });

  elements.btnToggleFreeze.addEventListener("click", () => {
    const isFrozen = !!appState.frozenDates[viewingDate];
    if (isFrozen) {
      delete appState.frozenDates[viewingDate];
      showToast("Unpaused! Regimen active.");
    } else {
      const reason = elements.pauseReason.value.trim() || "Holiday / Travel";
      appState.frozenDates[viewingDate] = reason;
      showToast("Day frozen! 90-day streak is preserved.");
    }
    saveState();
    elements.modalPause.classList.add("hidden");
    renderAll();
  });

  // Modal: Edit Workout Split
  elements.btnEditWorkout.addEventListener("click", () => {
    const dayOfWeek = getDayOfWeek(viewingDate);
    const workout = (appState.customWorkouts && appState.customWorkouts[dayOfWeek]) || DEFAULT_WORKOUTS[dayOfWeek];

    elements.modalEditWorkoutTitle.textContent = `Edit Workout (${formatDateFriendly(viewingDate)})`;
    elements.inputWorkoutName.value = workout.title;
    elements.textareaExercises.value = workout.exercises
      .map(e => `${e.name} | ${e.reps} | ${e.notes || ""}`)
      .join("\n");

    elements.modalEditWorkout.classList.remove("hidden");
  });

  elements.btnCloseEditWorkout.addEventListener("click", () => {
    elements.modalEditWorkout.classList.add("hidden");
  });

  elements.btnResetDefaultWorkout.addEventListener("click", () => {
    const dayOfWeek = getDayOfWeek(viewingDate);
    if (appState.customWorkouts) delete appState.customWorkouts[dayOfWeek];
    saveState();
    elements.modalEditWorkout.classList.add("hidden");
    renderTodaySection();
    showToast("Reset to default workout split.");
  });

  elements.btnSaveWorkoutChanges.addEventListener("click", () => {
    const dayOfWeek = getDayOfWeek(viewingDate);
    const title = elements.inputWorkoutName.value.trim() || `Workout Split`;
    const lines = elements.textareaExercises.value.split("\n").filter(l => l.trim().length > 0);

    const exercises = lines.map(line => {
      const parts = line.split("|").map(p => p.trim());
      return {
        name: parts[0] || "Exercise",
        reps: parts[1] || "3 x 10",
        notes: parts[2] || ""
      };
    });

    if (!appState.customWorkouts) appState.customWorkouts = {};
    appState.customWorkouts[dayOfWeek] = {
      title,
      isGymDay: exercises.length > 0,
      badge: exercises.length > 0 ? "Gym day" : "Rest day",
      exercises
    };

    saveState();
    elements.modalEditWorkout.classList.add("hidden");
    renderTodaySection();
    showToast("Custom workout saved!");
  });

  // Modal: Edit Diet
  elements.btnEditDiet.addEventListener("click", () => {
    const dayOfWeek = getDayOfWeek(viewingDate);
    const dietItems = (appState.customDiets && appState.customDiets[dayOfWeek]) || DEFAULT_DIETS[dayOfWeek] || [];

    elements.modalEditDietTitle.textContent = `Edit Diet (${formatDateFriendly(viewingDate)})`;
    elements.textareaDietItems.value = dietItems.join("\n");
    elements.modalEditDiet.classList.remove("hidden");
  });

  elements.btnCloseEditDiet.addEventListener("click", () => {
    elements.modalEditDiet.classList.add("hidden");
  });

  elements.btnResetDefaultDiet.addEventListener("click", () => {
    const dayOfWeek = getDayOfWeek(viewingDate);
    if (appState.customDiets) delete appState.customDiets[dayOfWeek];
    saveState();
    elements.modalEditDiet.classList.add("hidden");
    renderTodaySection();
    showToast("Diet restored to default specifications.");
  });

  elements.btnSaveDietChanges.addEventListener("click", () => {
    const dayOfWeek = getDayOfWeek(viewingDate);
    const items = elements.textareaDietItems.value
      .split("\n")
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (!appState.customDiets) appState.customDiets = {};
    appState.customDiets[dayOfWeek] = items;

    saveState();
    elements.modalEditDiet.classList.add("hidden");
    renderTodaySection();
    showToast("Custom diet saved!");
  });

  // Modal: Edit Do's
  elements.btnEditDos.addEventListener("click", () => {
    const dosItems = appState.customDos || DEFAULT_DOS;
    elements.textareaDosItems.value = dosItems.join("\n");
    elements.modalEditDos.classList.remove("hidden");
  });

  elements.btnCloseEditDos.addEventListener("click", () => {
    elements.modalEditDos.classList.add("hidden");
  });

  elements.btnResetDefaultDos.addEventListener("click", () => {
    appState.customDos = [...DEFAULT_DOS];
    saveState();
    elements.modalEditDos.classList.add("hidden");
    renderTodaySection();
    showToast("Daily Do's restored to defaults.");
  });

  elements.btnSaveDosChanges.addEventListener("click", () => {
    const items = elements.textareaDosItems.value
      .split("\n")
      .map(i => i.trim())
      .filter(i => i.length > 0);

    appState.customDos = items.length > 0 ? items : [...DEFAULT_DOS];
    saveState();
    elements.modalEditDos.classList.add("hidden");
    renderTodaySection();
    showToast("Daily Do's updated!");
  });

  // Modal: Settings & Challenge Start Date
  elements.btnSettings.addEventListener("click", () => {
    elements.inputStartDate.value = appState.startDate;
    elements.modalSettings.classList.remove("hidden");
  });

  elements.btnCloseSettings.addEventListener("click", () => {
    elements.modalSettings.classList.add("hidden");
  });

  elements.btnSaveSettings.addEventListener("click", () => {
    const newDate = elements.inputStartDate.value;
    if (newDate) {
      appState.startDate = newDate;
      saveState();
      elements.modalSettings.classList.add("hidden");
      renderAll();
      showToast(`Challenge start date set to ${formatDateFriendly(newDate)}`);
    }
  });

  // =========================================================================
  // 8. BACKUP & EXPORT / IMPORT CONTROLLER
  // =========================================================================

  // Export JSON file
  elements.btnExportData.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `ninety_backup_${getTodayDateString()}.json`);
    dlAnchor.click();
    showToast("Backup exported successfully!");
  });

  // Import JSON file
  elements.importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && imported.startDate) {
          appState = imported;
          saveState();
          renderAll();
          showToast("Data restored successfully from backup!");
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  });

  // Reset Entire 90 Days
  elements.btnRestartChallenge.addEventListener("click", () => {
    if (confirm("Reset all 90 days of logs and restart the challenge? This cannot be undone unless you exported a backup.")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // Close modals on clicking backdrop
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add("hidden");
      }
    });
  });

  // =========================================================================
  // 9. INITIALIZATION
  // =========================================================================

  loadState();
  renderAll();

})();
