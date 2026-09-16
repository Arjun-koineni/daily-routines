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
  const CLOUD_CONFIG_KEY = "ninety_cloud_config";

  let supabaseClient = null;
  let currentUser = null;
  let currentProfile = null; // { id, email, role: 'admin'|'member', status: 'pending'|'approved'|'revoked' }

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

  // Helper: Format a Date object to YYYY-MM-DD in local time (prevents UTC timezone shift bug)
  function formatLocalDateToISO(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Helper: calculate default next Monday start date
  function getNextMondayDateString() {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 1 is Monday
    const daysUntilNextMonday = ((8 - day) % 7) || 7;
    const nextMon = new Date(d);
    nextMon.setDate(d.getDate() + daysUntilNextMonday);
    return formatLocalDateToISO(nextMon);
  }

  function getTodayDateString() {
    return formatLocalDateToISO(new Date());
  }

  // =========================================================================
  // 2. STATE & STORAGE CONTROLLER
  // =========================================================================

  let appState = {
    version: 1,
    startDate: getTodayDateString(),     // Defaults to Today so Day 1 starts right away
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
        // If old default set startDate to future Monday, reset to today so user's regimen is active immediately
        if (appState.startDate > getTodayDateString() && (!appState.logs || Object.keys(appState.logs).length === 0)) {
          appState.startDate = getTodayDateString();
        }
      } else {
        appState.startDate = getTodayDateString();
      }
    } catch (e) {
      console.warn("Could not parse saved state, using defaults.", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      if (typeof syncSaveRegimen === "function") {
        syncSaveRegimen(appState);
      }
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
    return formatLocalDateToISO(d);
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
      if (date > today) break; // Future days do not count towards streak yet

      const dayOfWeek = getDayOfWeek(date);
      const workout = (appState.customWorkouts && appState.customWorkouts[dayOfWeek]) || DEFAULT_WORKOUTS[dayOfWeek];
      const isGymDay = workout ? workout.isGymDay : true;
      if (isGymDay && !item.isFrozen) totalGymDaysScheduled++;

      const log = appState.logs[date];
      const isFrozen = item.isFrozen;

      if (isFrozen) {
        // Paused/frozen day preserves streak without breaking
        continue;
      }

      const isToday = (date === today);

      if (log) {
        if (log.sleep !== undefined && log.sleep !== null && !isNaN(log.sleep)) {
          totalSleepLogged += Number(log.sleep);
          sleepLogCount++;
        }
        if (log.water !== undefined && log.water !== null && !isNaN(log.water)) {
          totalWaterLogged += Number(log.water);
          waterLogCount++;
        }

        if (log.workoutDone) {
          gymDaysDone++;
        }

        // Qualifying day for streak:
        // Gym day: workoutDone is true.
        // Rest day: logging workout, sleep, water, or diet qualifies.
        const completedDay = isGymDay 
          ? (log.workoutDone === true) 
          : (log.workoutDone || log.sleep !== undefined || log.water !== undefined || (log.checkedDiet && log.checkedDiet.length > 0));

        if (completedDay) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          // If past day missed -> reset streak
          // If today is in progress -> do NOT reset streak
          if (!isToday) {
            tempStreak = 0;
          }
        }
      } else {
        // Not logged and date is in the past -> reset streak
        if (!isToday) {
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

    // Today Section & Date Navigation
    todayDateTitle: document.getElementById("todayDateTitle"),
    todayDaySubtitle: document.getElementById("todayDaySubtitle"),
    todayGymBadge: document.getElementById("todayGymBadge"),
    btnJumpToToday: document.getElementById("btnJumpToToday"),
    btnPrevDay: document.getElementById("btnPrevDay"),
    btnNextDay: document.getElementById("btnNextDay"),
    dateNavInput: document.getElementById("dateNavInput"),

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
    btnCloseSettings: document.getElementById("btnCloseSettings"),

    // Top Bar Auth & Admin
    btnAdminPanel: document.getElementById("btnAdminPanel"),
    btnAuth: document.getElementById("btnAuth"),
    authBtnLabel: document.getElementById("authBtnLabel"),

    // Auth Modal
    modalAuth: document.getElementById("modalAuth"),
    authModalTitle: document.getElementById("authModalTitle"),
    btnCloseAuthModal: document.getElementById("btnCloseAuthModal"),
    tabSignIn: document.getElementById("tabSignIn"),
    tabSignUp: document.getElementById("tabSignUp"),
    tabAdmin: document.getElementById("tabAdmin"),
    authCapacityNotice: document.getElementById("authCapacityNotice"),
    authErrorMsg: document.getElementById("authErrorMsg"),
    formAuth: document.getElementById("formAuth"),
    authEmail: document.getElementById("authEmail"),
    authPassword: document.getElementById("authPassword"),
    authPasswordHint: document.getElementById("authPasswordHint"),
    btnAuthSubmit: document.getElementById("btnAuthSubmit"),
    btnToggleCloudConfig: document.getElementById("btnToggleCloudConfig"),
    cloudConfigWrap: document.getElementById("cloudConfigWrap"),
    inputSupabaseUrl: document.getElementById("inputSupabaseUrl"),
    inputSupabaseKey: document.getElementById("inputSupabaseKey"),
    btnSaveCloudConfig: document.getElementById("btnSaveCloudConfig"),

    // Gate Views
    gatePendingApproval: document.getElementById("gatePendingApproval"),
    pendingUserEmail: document.getElementById("pendingUserEmail"),
    btnCheckApproval: document.getElementById("btnCheckApproval"),
    btnPendingSignOut: document.getElementById("btnPendingSignOut"),
    gateRevoked: document.getElementById("gateRevoked"),
    btnRevokedSignOut: document.getElementById("btnRevokedSignOut"),

    // User Profile Modal
    modalUserProfile: document.getElementById("modalUserProfile"),
    btnCloseUserProfile: document.getElementById("btnCloseUserProfile"),
    profileAvatar: document.getElementById("profileAvatar"),
    profileEmail: document.getElementById("profileEmail"),
    profileRoleBadge: document.getElementById("profileRoleBadge"),
    btnSignOut: document.getElementById("btnSignOut"),

    // Admin Console
    modalAdminPanel: document.getElementById("modalAdminPanel"),
    btnCloseAdminPanel: document.getElementById("btnCloseAdminPanel"),
    adminCapacityCount: document.getElementById("adminCapacityCount"),
    adminCapacityFill: document.getElementById("adminCapacityFill"),
    pendingCount: document.getElementById("pendingCount"),
    pendingUsersList: document.getElementById("pendingUsersList"),
    activeMembersCount: document.getElementById("activeMembersCount"),
    activeMembersList: document.getElementById("activeMembersList"),
    btnRefreshAdminData: document.getElementById("btnRefreshAdminData")
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
      const workout = (appState.customWorkouts && appState.customWorkouts[dayOfWeek]) || DEFAULT_WORKOUTS[dayOfWeek];
      const isGymDay = workout ? workout.isGymDay : true;
      const log = appState.logs[item.date];

      if (item.isFrozen) {
        dot.classList.add("dot-paused");
        dot.title = `${formatDateFriendly(item.date)}: Holiday / Paused (${appState.frozenDates[item.date]})`;
      } else if (log) {
        if (log.workoutDone) {
          dot.classList.add("dot-completed");
          dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Completed (Gym Done)`;
        } else if (!isGymDay && (log.sleep || log.water || (log.checkedDiet && log.checkedDiet.length > 0))) {
          dot.classList.add("dot-rest");
          dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Rest Day Logged`;
        } else if (item.date < today) {
          dot.classList.add("dot-missed");
          dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - Missed`;
        } else {
          dot.classList.add("dot-upcoming");
          dot.title = `${formatDateFriendly(item.date)}: Day ${item.dayNumber} - In Progress`;
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

      if (item.date === viewingDate) {
        dot.classList.add("dot-selected");
      }

      // Clicking dot views that day
      dot.addEventListener("click", () => {
        viewingDate = item.date;
        renderAll();
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
    const isFrozen = !!(appState.frozenDates && appState.frozenDates[dateStr]);

    // Sync Date Picker Input
    if (elements.dateNavInput) {
      elements.dateNavInput.value = dateStr;
    }

    const found = challengeDays.find(d => d.date === dateStr);
    let dayNum = 1;
    if (found) {
      dayNum = found.dayNumber;
    } else {
      const diff = daysDifference(appState.startDate, dateStr);
      dayNum = diff >= 0 ? diff + 1 : 1;
    }

    // Toggle Jump to Today button
    if (viewingDate !== today) {
      elements.btnJumpToToday.classList.remove("hidden");
    } else {
      elements.btnJumpToToday.classList.add("hidden");
    }

    if (elements.todayDateTitle) {
      elements.todayDateTitle.textContent = formatDateFriendly(dateStr);
    }
    if (elements.todayDaySubtitle) {
      elements.todayDaySubtitle.textContent = isFrozen
        ? `Day ${dayNum} of 90 • Holiday / Frozen`
        : `Day ${dayNum} of 90`;
    }

    // Workout split retrieval (custom or default)
    const workout = (appState.customWorkouts && appState.customWorkouts[dayOfWeek]) || DEFAULT_WORKOUTS[dayOfWeek] || {
      title: "Active Recovery",
      isGymDay: false,
      badge: "Rest day",
      exercises: []
    };

    // Badge styling
    if (elements.todayGymBadge) {
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
    }

    if (elements.workoutTitle) {
      elements.workoutTitle.textContent = workout.title;
    }

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
    if (elements.workoutTableBody) {
      elements.workoutTableBody.innerHTML = "";
      const exercises = workout.exercises || [];
      exercises.forEach((ex, idx) => {
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
          if (typeof syncSaveDailyLog === "function") {
            syncSaveDailyLog(dateStr, appState.logs[dateStr]);
          }
          renderStats();
          renderMatrix();
        });

        elements.workoutTableBody.appendChild(tr);
      });
    }

    // Render Diet (Exact Locked Plan with Checkmarks)
    if (elements.dietChecklist) {
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
          if (typeof syncSaveDailyLog === "function") {
            syncSaveDailyLog(dateStr, appState.logs[dateStr]);
          }
          renderStats();
          renderMatrix();
        });
        elements.dietChecklist.appendChild(div);
      });
    }

    // Render Daily Standards & Non-Negotiables (Authoritative standards cards, NO ticks or completion marks)
    if (elements.dosChecklist) {
      const dosItems = appState.customDos || DEFAULT_DOS || [];
      elements.dosChecklist.innerHTML = "";
      dosItems.forEach((item) => {
        const div = document.createElement("div");
        div.className = "standard-item";
        div.innerHTML = `
          <span class="standard-dot">⚡</span>
          <span class="standard-text">${item}</span>
        `;
        elements.dosChecklist.appendChild(div);
      });
    }

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

  // Live Value Handlers & Real-Time Auto-Save
  function saveCurrentLog() {
    const dateStr = viewingDate;
    const existing = appState.logs[dateStr] || {};

    const updated = {
      ...existing,
      workoutDone: elements.toggleWorkoutDone.checked,
      sleep: parseFloat(elements.sliderSleep.value),
      water: parseFloat(elements.sliderWater.value),
      timestamp: Date.now()
    };
    appState.logs[dateStr] = updated;

    saveState();
    if (typeof syncSaveDailyLog === "function") {
      syncSaveDailyLog(dateStr, updated);
    }
    renderStats();
    renderMatrix();
    renderTrendCharts();
  }

  elements.sliderSleep.addEventListener("input", (e) => {
    elements.sleepValueDisplay.textContent = `${e.target.value} hrs`;
  });

  elements.sliderSleep.addEventListener("change", () => {
    saveCurrentLog();
  });

  elements.sliderWater.addEventListener("input", (e) => {
    elements.waterValueDisplay.textContent = `${Number(e.target.value).toFixed(2)} L`;
  });

  elements.sliderWater.addEventListener("change", () => {
    saveCurrentLog();
  });

  // Real-time workout toggle (immediately updates streaks & dots)
  elements.toggleWorkoutDone.addEventListener("change", () => {
    saveCurrentLog();
    showToast(elements.toggleWorkoutDone.checked ? "Workout marked completed! Streak updated." : "Workout unmarked.");
  });

  // Date Navigator Controls (< Previous Day, Next Day >, and Date Picker)
  if (elements.btnPrevDay) {
    elements.btnPrevDay.addEventListener("click", () => {
      viewingDate = addDays(viewingDate, -1);
      renderAll();
    });
  }

  if (elements.btnNextDay) {
    elements.btnNextDay.addEventListener("click", () => {
      viewingDate = addDays(viewingDate, 1);
      renderAll();
    });
  }

  if (elements.dateNavInput) {
    elements.dateNavInput.addEventListener("change", (e) => {
      if (e.target.value) {
        viewingDate = e.target.value;
        renderAll();
      }
    });
  }

  // Save Today's Log Button
  elements.btnSaveLog.addEventListener("click", () => {
    saveCurrentLog();
    showToast(`Logged successfully for ${formatDateFriendly(viewingDate)}!`);
  });

  // Reset Day Plan Button (Top-Right Action)
  elements.btnResetDay.addEventListener("click", () => {
    if (confirm(`Reset all logs, sets, and checkmarks for ${formatDateFriendly(viewingDate)}?`)) {
      delete appState.logs[viewingDate];
      saveState();
      if (typeof syncDeleteDailyLog === "function") {
        syncDeleteDailyLog(viewingDate);
      }
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
  // 9. SUPABASE CLOUD SYNC, AUTH & ADMIN COMMAND CONTROLLER
  // =========================================================================

  let isSignUpMode = false;

  // Optional: Default Supabase credentials (can also be entered via UI)
  const DEFAULT_SUPABASE_URL = "https://zodfduanspqzijnsmazw.supabase.co";
  const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZGZkdWFuc3BxemlqbnNtYXp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NDQ5MTksImV4cCI6MjEwNTEyMDkxOX0.f1W3GDw4LXD5dQgxPK_Ury0SH0Tl6eZRfWJm2HfVsFw";

  function getCloudConfig() {
    try {
      const saved = localStorage.getItem(CLOUD_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) return parsed;
      }
    } catch (e) {}
    return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY };
  }

  function saveCloudConfig(url, key) {
    const cleanUrl = (url || "").trim();
    const cleanKey = (key || "").trim();
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify({ url: cleanUrl, key: cleanKey }));
    initSupabase();
    checkAuthSession();
  }

  function initSupabase() {
    const config = getCloudConfig();
    if (window.supabase && config.url && config.key) {
      try {
        supabaseClient = window.supabase.createClient(config.url, config.key);
        
        // Listen to session & token lifecycle events
        supabaseClient.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            checkAuthSession();
          } else if (event === "SIGNED_OUT") {
            currentUser = null;
            currentProfile = null;
            if (elements.authBtnLabel) elements.authBtnLabel.textContent = "Sign In";
            if (elements.btnAdminPanel) elements.btnAdminPanel.classList.add("hidden");
          }
        });

        return true;
      } catch (e) {
        console.warn("Could not initialize Supabase client", e);
      }
    }
    supabaseClient = null;
    return false;
  }

  async function updateAuthCapacityNotice() {
    if (!elements.authCapacityNotice) return;
    if (!supabaseClient) {
      elements.authCapacityNotice.innerHTML = `
        <span class="pulse-dot"></span>
        <span>Private Cohort • Max 20 Active Members</span>
      `;
      return;
    }

    try {
      let count = 0;
      const { data, error } = await supabaseClient.rpc("get_approved_member_count");
      if (!error && typeof data === "number") {
        count = data;
      } else {
        const res = await supabaseClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved");
        if (!res.error && res.count !== null) count = res.count;
      }

      elements.authCapacityNotice.innerHTML = `
        <span class="pulse-dot"></span>
        <span>Private Cohort • ${count} / 20 Active Spots Filled</span>
      `;
    } catch (e) {
      // Keep default notice on error
    }
  }

  function withTimeout(promise, ms = 7000, errorMsg = "Request timed out") {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
    ]);
  }

  async function checkAuthSession() {
    if (!supabaseClient) {
      if (elements.btnAuth) {
        elements.btnAuth.classList.remove("hidden");
        elements.authBtnLabel.textContent = "Connect Cloud";
      }
      if (elements.btnAdminPanel) elements.btnAdminPanel.classList.add("hidden");
      return;
    }

    try {
      const getSessionRes = await withTimeout(supabaseClient.auth.getSession(), 4000).catch(() => ({ data: {} }));
      const session = getSessionRes && getSessionRes.data ? getSessionRes.data.session : null;
      
      if (session && session.user) {
        currentUser = session.user;

        // Fetch user profile from public.profiles with safe timeout
        let profile = null;
        try {
          const res = await withTimeout(
            supabaseClient.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
            3000
          ).catch(() => null);
          if (res && res.data) profile = res.data;
        } catch (e) {}

        // Brief retry if trigger is processing
        if (!profile) {
          await new Promise(r => setTimeout(r, 400));
          try {
            const retryRes = await withTimeout(
              supabaseClient.from("profiles").select("*").eq("id", currentUser.id).maybeSingle(),
              2500
            ).catch(() => null);
            if (retryRes && retryRes.data) profile = retryRes.data;
          } catch (e) {}
        }

        const isAdminEmail = (currentUser.email || "").trim().toLowerCase() === "koineniarjun08@gmail.com";

        if (profile) {
          currentProfile = profile;
          if (isAdminEmail) {
            currentProfile.role = "admin";
            currentProfile.status = "approved";
          }
        } else {
          // Fallback if trigger didn't catch or table pending
          const defaultRole = isAdminEmail ? "admin" : "member";
          const defaultStatus = isAdminEmail ? "approved" : "pending";
          try {
            const newProfileRes = await withTimeout(
              supabaseClient
                .from("profiles")
                .insert({ id: currentUser.id, email: currentUser.email, role: defaultRole, status: defaultStatus })
                .select()
                .single(),
              2500
            ).catch(() => null);
            currentProfile = (newProfileRes && newProfileRes.data) ? newProfileRes.data : { id: currentUser.id, email: currentUser.email, role: defaultRole, status: defaultStatus };
          } catch (e) {
            currentProfile = { id: currentUser.id, email: currentUser.email, role: defaultRole, status: defaultStatus };
          }
        }

        // Update Top Navigation Profile Pill
        elements.btnAuth.classList.remove("hidden");
        const displayName = (currentUser.email || "Athlete").split("@")[0];
        elements.authBtnLabel.textContent = displayName;

        // Populate User Profile Modal
        elements.profileAvatar.textContent = displayName.charAt(0).toUpperCase();
        elements.profileEmail.textContent = currentUser.email;
        elements.profileRoleBadge.textContent = currentProfile.role === "admin" ? "Admin" : "Member";
        if (currentProfile.role === "admin") {
          elements.profileRoleBadge.className = "badge-role badge-admin";
          elements.btnAdminPanel.classList.remove("hidden");
        } else {
          elements.profileRoleBadge.className = "badge-role";
          elements.btnAdminPanel.classList.add("hidden");
        }

        // Handle Permissions / Approval Gates
        if (currentProfile.status === "pending") {
          elements.pendingUserEmail.textContent = currentUser.email;
          elements.gatePendingApproval.classList.remove("hidden");
          elements.gateRevoked.classList.add("hidden");
          return;
        } else if (currentProfile.status === "revoked") {
          elements.gateRevoked.classList.remove("hidden");
          elements.gatePendingApproval.classList.add("hidden");
          return;
        } else {
          // Approved! Unlock app
          elements.gatePendingApproval.classList.add("hidden");
          elements.gateRevoked.classList.add("hidden");

          // Sync user's cloud data into local dashboard
          await syncLoadCloudData();
        }
      } else {
        // No active session
        currentUser = null;
        currentProfile = null;
        elements.btnAuth.classList.remove("hidden");
        elements.authBtnLabel.textContent = "Sign In";
        elements.btnAdminPanel.classList.add("hidden");
        elements.gatePendingApproval.classList.add("hidden");
        elements.gateRevoked.classList.add("hidden");
      }
    } catch (err) {
      console.warn("Session check error", err);
    }
  }

  async function handleSignIn(email, password) {
    if (!supabaseClient) {
      showAuthError("Please enter your Supabase connection settings below first.");
      elements.cloudConfigWrap.classList.remove("hidden");
      return;
    }

    elements.btnAuthSubmit.textContent = "Authenticating...";
    elements.btnAuthSubmit.disabled = true;
    hideAuthError();

    try {
      const { data, error } = await withTimeout(
        supabaseClient.auth.signInWithPassword({
          email: email.trim(),
          password
        }),
        8000,
        "Connection to Supabase timed out. Please check your internet connection."
      );

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Email address is not confirmed yet. Please verify your email inbox, or turn off email confirmation in your Supabase Auth settings.");
        } else if (error.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Invalid email or password. Please verify your credentials.");
        }
        throw error;
      }

      elements.modalAuth.classList.add("hidden");
      showToast("Signed in successfully!");
      await checkAuthSession();
    } catch (err) {
      showAuthError(err.message || "Invalid credentials.");
    } finally {
      elements.btnAuthSubmit.textContent = isSignUpMode ? "Create Cohort Account" : "Sign In to Regimen";
      elements.btnAuthSubmit.disabled = false;
    }
  }

  async function handleSignUp(email, password) {
    if (!supabaseClient) {
      showAuthError("Please enter your Supabase connection settings below first.");
      elements.cloudConfigWrap.classList.remove("hidden");
      return;
    }

    if (!password || password.length < 6) {
      showAuthError("Password must be at least 6 characters.");
      return;
    }

    elements.btnAuthSubmit.textContent = "Registering Account...";
    elements.btnAuthSubmit.disabled = true;
    hideAuthError();

    try {
      // Non-blocking capacity check (never freezes signup button)
      try {
        const countRes = await withTimeout(
          supabaseClient.rpc("get_approved_member_count"),
          2000
        ).catch(() => null);

        let approvedCount = 0;
        if (countRes && !countRes.error && typeof countRes.data === "number") {
          approvedCount = countRes.data;
        }

        if (approvedCount >= 20) {
          showAuthError("Cohort capacity full (20/20 active athletes). An admin must revoke a spot before new registrations can be approved.");
          return;
        }
      } catch (capErr) {
        // Proceed with signup even if table/RPC is not yet loaded
      }

      const { data, error } = await withTimeout(
        supabaseClient.auth.signUp({
          email: email.trim(),
          password
        }),
        8000,
        "Connection to Supabase timed out. Please check your internet connection."
      );

      if (error) throw error;

      elements.modalAuth.classList.add("hidden");
      if (data.session) {
        showToast("Account registered! Checking approval status...");
        await checkAuthSession();
      } else if (data.user) {
        showToast("Account created! Awaiting admin approval. (Check email if verification was sent).");
        await checkAuthSession();
      }
    } catch (err) {
      showAuthError(err.message || "Failed to create account.");
    } finally {
      elements.btnAuthSubmit.textContent = isSignUpMode ? "Create Cohort Account" : "Sign In to Regimen";
      elements.btnAuthSubmit.disabled = false;
    }
  }

  async function handleSignOut() {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {}
    }
    currentUser = null;
    currentProfile = null;
    elements.modalUserProfile.classList.add("hidden");
    elements.gatePendingApproval.classList.add("hidden");
    elements.gateRevoked.classList.add("hidden");
    elements.btnAdminPanel.classList.add("hidden");
    elements.authBtnLabel.textContent = "Sign In";
    showToast("Signed out.");
    renderAll();
  }

  function showAuthError(msg) {
    elements.authErrorMsg.textContent = msg;
    elements.authErrorMsg.classList.remove("hidden");
  }

  function hideAuthError() {
    elements.authErrorMsg.classList.add("hidden");
    elements.authErrorMsg.textContent = "";
  }

  // Cloud Sync Functions
  async function syncSaveDailyLog(dateStr, logData) {
    if (!supabaseClient || !currentUser || !currentProfile || currentProfile.status !== "approved") return;
    try {
      await supabaseClient.from("daily_logs").upsert({
        user_id: currentUser.id,
        date: dateStr,
        workout_done: !!logData.workoutDone,
        sleep: logData.sleep !== undefined ? logData.sleep : 7.0,
        water: logData.water !== undefined ? logData.water : 2.75,
        checked_exercises: logData.checkedExercises || [],
        checked_diet: logData.checkedDiet || [],
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,date" });
    } catch (e) {
      console.warn("Cloud log sync error", e);
    }
  }

  async function syncDeleteDailyLog(dateStr) {
    if (!supabaseClient || !currentUser || !currentProfile || currentProfile.status !== "approved") return;
    try {
      await supabaseClient
        .from("daily_logs")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("date", dateStr);
    } catch (e) {
      console.warn("Cloud log delete error", e);
    }
  }

  async function syncSaveRegimen(state) {
    if (!supabaseClient || !currentUser || !currentProfile || currentProfile.status !== "approved") return;
    try {
      await supabaseClient.from("user_regimens").upsert({
        user_id: currentUser.id,
        start_date: state.startDate,
        frozen_dates: state.frozenDates || {},
        custom_workouts: state.customWorkouts || {},
        custom_diets: state.customDiets || {},
        custom_dos: state.customDos || DEFAULT_DOS,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    } catch (e) {
      console.warn("Cloud regimen sync error", e);
    }
  }

  async function syncLoadCloudData() {
    if (!supabaseClient || !currentUser) return;
    try {
      // 1. Load user regimen
      const { data: regimen, error: rErr } = await supabaseClient
        .from("user_regimens")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (regimen) {
        if (regimen.start_date) appState.startDate = regimen.start_date;
        if (regimen.frozen_dates) appState.frozenDates = regimen.frozen_dates;
        if (regimen.custom_workouts) appState.customWorkouts = regimen.custom_workouts;
        if (regimen.custom_diets) appState.customDiets = regimen.custom_diets;
        if (regimen.custom_dos) appState.customDos = regimen.custom_dos;
      } else {
        // If first time syncing, upload local regimen to cloud
        syncSaveRegimen(appState);
      }

      // 2. Load daily logs
      const { data: logs, error: lErr } = await supabaseClient
        .from("daily_logs")
        .select("*")
        .eq("user_id", currentUser.id);

      if (logs && logs.length > 0) {
        logs.forEach(row => {
          appState.logs[row.date] = {
            workoutDone: !!row.workout_done,
            sleep: row.sleep !== null ? Number(row.sleep) : 7.0,
            water: row.water !== null ? Number(row.water) : 2.75,
            checkedExercises: row.checked_exercises || [],
            checkedDiet: row.checked_diet || [],
            timestamp: new Date(row.updated_at).getTime()
          };
        });
      } else if (Object.keys(appState.logs).length > 0) {
        // Migrate existing local logs to cloud
        for (const [dStr, lData] of Object.entries(appState.logs)) {
          syncSaveDailyLog(dStr, lData);
        }
      }

      saveState();
      renderAll();
    } catch (e) {
      console.warn("Failed to load cloud data", e);
    }
  }

  // Admin Console Functions
  async function loadAdminRoster() {
    if (!supabaseClient || !currentUser || !currentProfile || currentProfile.role !== "admin") return;

    try {
      const { data: profiles, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const approved = profiles.filter(p => p.status === "approved");
      const pending = profiles.filter(p => p.status === "pending");

      // Update capacity meter
      const approvedCount = approved.length;
      elements.adminCapacityCount.textContent = `${approvedCount} / 20 Active`;
      const fillPercent = Math.min(100, Math.round((approvedCount / 20) * 100));
      elements.adminCapacityFill.style.width = `${fillPercent}%`;

      // Render Pending Users
      elements.pendingCount.textContent = pending.length;
      elements.pendingUsersList.innerHTML = "";
      if (pending.length === 0) {
        elements.pendingUsersList.innerHTML = `<div class="member-empty">No pending approval requests.</div>`;
      } else {
        pending.forEach(u => {
          const card = document.createElement("div");
          card.className = "member-card";
          card.innerHTML = `
            <div class="member-info">
              <span class="member-email" title="${u.email}">${u.email}</span>
              <div class="member-meta">
                <span class="status-chip chip-pending">Pending</span>
                <span>• Requested ${new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="member-actions">
              <button class="btn-action-approve" data-user-id="${u.id}">Approve</button>
              <button class="btn-action-revoke" data-user-id="${u.id}" title="Reject Request">Reject</button>
            </div>
          `;

          card.querySelector(".btn-action-approve").addEventListener("click", () => {
            if (approvedCount >= 20) {
              alert("Cohort limit reached (20/20 active members). Please revoke an existing member before approving new athletes.");
              return;
            }
            adminApproveUser(u.id);
          });

          card.querySelector(".btn-action-revoke").addEventListener("click", () => {
            if (confirm(`Reject and remove registration request for ${u.email}?`)) {
              adminDeleteUser(u.id);
            }
          });

          elements.pendingUsersList.appendChild(card);
        });
      }

      // Render Active Members Roster
      elements.activeMembersCount.textContent = approved.length;
      elements.activeMembersList.innerHTML = "";
      if (approved.length === 0) {
        elements.activeMembersList.innerHTML = `<div class="member-empty">No active members found.</div>`;
      } else {
        approved.forEach(u => {
          const isSelf = (u.id === currentUser.id);
          const card = document.createElement("div");
          card.className = "member-card";
          card.innerHTML = `
            <div class="member-info">
              <span class="member-email" title="${u.email}">${u.email} ${isSelf ? "(You - Admin)" : ""}</span>
              <div class="member-meta">
                <span class="status-chip chip-approved">${u.role === "admin" ? "Admin" : "Member"}</span>
                <span>• Joined ${new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div class="member-actions">
              ${isSelf ? "" : `<button class="btn-action-revoke" data-user-id="${u.id}">Revoke</button>`}
            </div>
          `;

          if (!isSelf) {
            card.querySelector(".btn-action-revoke").addEventListener("click", () => {
              if (confirm(`Revoke regimen access for ${u.email}?`)) {
                adminRevokeUser(u.id);
              }
            });
          }

          elements.activeMembersList.appendChild(card);
        });
      }

    } catch (e) {
      console.error("Admin roster fetch error", e);
    }
  }

  async function adminApproveUser(userId) {
    try {
      const { data, error } = await supabaseClient.rpc("admin_approve_member", { target_user_id: userId });
      if (error) {
        // Fallback to direct update
        const { error: fErr } = await supabaseClient
          .from("profiles")
          .update({ status: "approved" })
          .eq("id", userId);
        if (fErr) throw fErr;
      }
      showToast("Member approved!");
      loadAdminRoster();
    } catch (e) {
      alert("Error approving user: " + e.message);
    }
  }

  async function adminRevokeUser(userId) {
    try {
      const { data, error } = await supabaseClient.rpc("admin_revoke_member", { target_user_id: userId });
      if (error) {
        const { error: fErr } = await supabaseClient
          .from("profiles")
          .update({ status: "revoked" })
          .eq("id", userId);
        if (fErr) throw fErr;
      }
      showToast("Access revoked for member.");
      loadAdminRoster();
    } catch (e) {
      alert("Error revoking user: " + e.message);
    }
  }

  async function adminDeleteUser(userId) {
    try {
      const { data, error } = await supabaseClient.rpc("admin_delete_member", { target_user_id: userId });
      if (error) {
        const { error: fErr } = await supabaseClient
          .from("profiles")
          .delete()
          .eq("id", userId);
        if (fErr) throw fErr;
      }
      showToast("Request rejected.");
      loadAdminRoster();
    } catch (e) {
      alert("Error deleting user: " + e.message);
    }
  }

  // Event Listeners for Auth & Admin
  elements.tabSignIn.addEventListener("click", () => {
    isSignUpMode = false;
    elements.tabSignIn.classList.add("auth-tab-active");
    elements.tabSignUp.classList.remove("auth-tab-active");
    if (elements.tabAdmin) elements.tabAdmin.classList.remove("auth-tab-active");
    elements.authModalTitle.textContent = "Sign In";
    elements.btnAuthSubmit.textContent = "Sign In to Regimen";
    elements.authPasswordHint.textContent = "Enter your password to sync your regimen.";
    elements.authEmail.value = "";
    elements.authPassword.value = "";
    hideAuthError();
  });

  elements.tabSignUp.addEventListener("click", () => {
    isSignUpMode = true;
    elements.tabSignUp.classList.add("auth-tab-active");
    elements.tabSignIn.classList.remove("auth-tab-active");
    if (elements.tabAdmin) elements.tabAdmin.classList.remove("auth-tab-active");
    elements.authModalTitle.textContent = "Create Account";
    elements.btnAuthSubmit.textContent = "Create Cohort Account";
    elements.authPasswordHint.textContent = "New accounts require admin permission before entry.";
    elements.authEmail.value = "";
    elements.authPassword.value = "";
    hideAuthError();
  });

  if (elements.tabAdmin) {
    elements.tabAdmin.addEventListener("click", () => {
      isSignUpMode = false;
      elements.tabAdmin.classList.add("auth-tab-active");
      elements.tabSignIn.classList.remove("auth-tab-active");
      elements.tabSignUp.classList.remove("auth-tab-active");
      elements.authModalTitle.textContent = "Admin Login";
      elements.btnAuthSubmit.textContent = "Sign In as Admin";
      elements.authPasswordHint.textContent = "Admin credentials required.";
      elements.authEmail.value = "koineniarjun08@gmail.com";
      elements.authPassword.value = "Koineni@08";
      hideAuthError();
    });
  }

  elements.btnAuth.addEventListener("click", () => {
    if (currentUser) {
      elements.modalUserProfile.classList.remove("hidden");
    } else {
      hideAuthError();
      updateAuthCapacityNotice();
      const cfg = getCloudConfig();
      if (elements.inputSupabaseUrl) elements.inputSupabaseUrl.value = cfg.url || "";
      if (elements.inputSupabaseKey) elements.inputSupabaseKey.value = cfg.key || "";
      elements.modalAuth.classList.remove("hidden");
    }
  });

  elements.btnCloseAuthModal.addEventListener("click", () => {
    elements.modalAuth.classList.add("hidden");
  });



  elements.formAuth.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = elements.authEmail.value;
    const password = elements.authPassword.value;
    if (!email || !password) {
      showAuthError("Please provide both email and password.");
      return;
    }
    if (isSignUpMode) {
      handleSignUp(email, password);
    } else {
      handleSignIn(email, password);
    }
  });

  elements.btnCheckApproval.addEventListener("click", async () => {
    elements.btnCheckApproval.textContent = "Checking...";
    await checkAuthSession();
    elements.btnCheckApproval.textContent = "Check Approval Status";
    if (currentProfile && currentProfile.status === "approved") {
      showToast("Access approved! Welcome to Ninety.");
    } else {
      showToast("Status: Still pending admin permission.");
    }
  });

  elements.btnPendingSignOut.addEventListener("click", handleSignOut);
  elements.btnRevokedSignOut.addEventListener("click", handleSignOut);
  elements.btnSignOut.addEventListener("click", handleSignOut);
  elements.btnCloseUserProfile.addEventListener("click", () => {
    elements.modalUserProfile.classList.add("hidden");
  });

  // Admin Console Open & Refresh
  elements.btnAdminPanel.addEventListener("click", () => {
    loadAdminRoster();
    elements.modalAdminPanel.classList.remove("hidden");
  });

  elements.btnCloseAdminPanel.addEventListener("click", () => {
    elements.modalAdminPanel.classList.add("hidden");
  });

  elements.btnRefreshAdminData.addEventListener("click", () => {
    loadAdminRoster();
    showToast("Admin roster refreshed.");
  });

  // =========================================================================
  // 10. INITIALIZATION
  // =========================================================================

  loadState();
  initSupabase();
  checkAuthSession();
  renderAll();

})();
