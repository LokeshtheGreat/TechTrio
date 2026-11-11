/**
 * CardioPredict ML - Full-Stack Client Application Logic
 *
 * Reconstructed Architecture:
 * 1. Web Audio API Heartbeat Synthesizer (physiological S1 'Lub' / S2 'Dub')
 * 2. Interactive Anatomical Hotspots & Dynamic Chamber Tooltips
 * 3. Real-Time Cardiac Cycle HUD Ticker & Hemodynamic Metrics
 * 4. Interactive Rhythm Presets (Normal, Athletic, Exertion, Tachycardia, Arrhythmia)
 * 5. Full BMI Calculator Modal with Dual Unit Support (Metric/Imperial) & Needle Gauge
 * 6. True Dual-Mode Assessment (Major Model: Random Forest / Minor Model: Keras Neural Network)
 * 7. Live Backend Prediction Integration (Zero Mocking, Strict Feature Typing, 11/11 Features)
 * 8. Real-Time SVG Cardiac Radar Biomarker Chart
 * 9. Multi-Theme Switching (Clinical, Neon Dark, Sunset)
 */

(function () {
  'use strict';

  // ==========================================
  // Application State
  // ==========================================
  const state = {
    currentMode: 'minor', // 'major' | 'minor'
    apiBaseUrl: (typeof localStorage !== 'undefined' && localStorage.getItem('cardiopredict_api_url')) || 'http://localhost:8000',
    isSubmitting: false,
    lastResult: null,
    lastPayload: null,
    lastResultMode: null,
    bpm: 75,
    rhythm: 'normal',
    audioActive: false,
    audioCtx: null,
    audioTimer: null,
    hudRafId: null,
    cycleStartTime: Date.now()
  };

  // ==========================================
  // DOM Elements Selection
  // ==========================================

  // Navigation & Modals
  const tabMajor = document.getElementById('tabMajor');
  const tabSimple = document.getElementById('tabSimple');
  const modeBanner = document.getElementById('modeBanner');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerText = document.getElementById('bannerText');

  const glossaryBtn = document.getElementById('glossaryBtn');
  const glossaryModal = document.getElementById('glossaryModal');
  const closeGlossaryBtn = document.getElementById('closeGlossaryBtn');
  const dismissGlossaryBtn = document.getElementById('dismissGlossaryBtn');

  const themeBtn = document.getElementById('themeBtn');
  const themeDropdown = document.getElementById('themeDropdown');
  const themeCurrentIcon = document.getElementById('themeCurrentIcon');
  const themeCurrentLabel = document.getElementById('themeCurrentLabel');
  const themeOptionButtons = document.querySelectorAll('.theme-option-btn');

  // Stethoscope & Pacing Controls
  const audioStethoBtn = document.getElementById('audioStethoBtn');
  const stethoStatusText = document.getElementById('stethoStatusText');
  const heartPulseGroup = document.getElementById('heartPulseGroup');
  const liveBpmValue = document.getElementById('liveBpmValue');
  const rhythmChips = document.querySelectorAll('.rhythm-chip');
  const vascularStatePill = document.getElementById('vascularStatePill');
  const vascularStateDot = document.getElementById('vascularStateDot');
  const vascularStateText = document.getElementById('vascularStateText');

  // Anatomical Pins & Tooltip
  const anatomicalPins = document.getElementById('anatomicalPins');
  const anatomicalTooltip = document.getElementById('anatomicalTooltip');
  const anatTooltipTitle = document.getElementById('anatTooltipTitle');
  const anatTooltipDesc = document.getElementById('anatTooltipDesc');
  const anatPins = document.querySelectorAll('.anat-pin');

  // Cardiac Cycle HUD
  const hudPhaseName = document.getElementById('hudPhaseName');
  const hudProgressBar = document.getElementById('hudProgressBar');
  const stageAtrial = document.getElementById('stageAtrial');
  const stageVentricular = document.getElementById('stageVentricular');
  const stageDiastole = document.getElementById('stageDiastole');
  const hudCardiacOutput = document.getElementById('hudCardiacOutput');
  const hudStrokeVolume = document.getElementById('hudStrokeVolume');
  const hudWorkload = document.getElementById('hudWorkload');

  // BMI Calculator Modal & Inline Banner
  const bmiCalculatorBtn = document.getElementById('bmiCalculatorBtn');
  const bmiOpenInlineBtn = document.getElementById('bmiOpenInlineBtn');
  const bmiModal = document.getElementById('bmiModal');
  const closeBmiBtn = document.getElementById('closeBmiBtn');
  const bmiDismissBtn = document.getElementById('bmiDismissBtn');
  const bmiResetBtn = document.getElementById('bmiResetBtn');

  const bmiUnitMetric = document.getElementById('bmiUnitMetric');
  const bmiUnitImperial = document.getElementById('bmiUnitImperial');
  const bmiMetricGroup = document.getElementById('bmiMetricGroup');
  const bmiImperialGroup = document.getElementById('bmiImperialGroup');

  const bmiInputHeightCm = document.getElementById('bmiInputHeightCm');
  const bmiSliderHeightCm = document.getElementById('bmiSliderHeightCm');
  const bmiInputWeightKg = document.getElementById('bmiInputWeightKg');
  const bmiSliderWeightKg = document.getElementById('bmiSliderWeightKg');

  const bmiInputHeightFt = document.getElementById('bmiInputHeightFt');
  const bmiInputHeightIn = document.getElementById('bmiInputHeightIn');
  const bmiSliderHeightTotalIn = document.getElementById('bmiSliderHeightTotalIn');
  const bmiInputWeightLbs = document.getElementById('bmiInputWeightLbs');
  const bmiSliderWeightLbs = document.getElementById('bmiSliderWeightLbs');

  const bmiNumberDisplay = document.getElementById('bmiNumberDisplay');
  const bmiCategoryBadge = document.getElementById('bmiCategoryBadge');
  const bmiSummaryText = document.getElementById('bmiSummaryText');
  const bmiNeedleIndicator = document.getElementById('bmiNeedleIndicator');
  const bmiCardioDesc = document.getElementById('bmiCardioDesc');
  const bmiIdealRangeText = document.getElementById('bmiIdealRangeText');

  // Form & Fields
  const assessmentForm = document.getElementById('assessmentForm');
  const majorFieldsContainer = document.getElementById('majorFieldsContainer');
  const minorFieldsContainer = document.getElementById('minorFieldsContainer');
  const majorOnlySection = document.getElementById('majorOnlySection');

  // Major Input Elements
  const inputAge = document.getElementById('inputAge');
  const inputSex = document.getElementById('inputSex');
  const inputChestPainType = document.getElementById('inputChestPainType');
  const inputRestingBP = document.getElementById('inputRestingBP');
  const sliderRestingBP = document.getElementById('sliderRestingBP');
  const badgeRestingBP = document.getElementById('badgeRestingBP');
  const inputCholesterol = document.getElementById('inputCholesterol');
  const inputFastingBS = document.getElementById('inputFastingBS');
  const inputRestingECG = document.getElementById('inputRestingECG');
  const inputMaxHR = document.getElementById('inputMaxHR');
  const sliderMaxHR = document.getElementById('sliderMaxHR');
  const badgeMaxHR = document.getElementById('badgeMaxHR');
  const inputExerciseAngina = document.getElementById('inputExerciseAngina');
  const inputOldpeak = document.getElementById('inputOldpeak');
  const inputST_Slope = document.getElementById('inputST_Slope');

  // Minor Input Elements
  const inputMinorAge = document.getElementById('inputMinorAge');
  const inputMinorGender = document.getElementById('inputMinorGender');
  const inputMinorHeight = document.getElementById('inputMinorHeight');
  const inputMinorWeight = document.getElementById('inputMinorWeight');
  const inputMinorApHi = document.getElementById('inputMinorApHi');
  const inputMinorApLo = document.getElementById('inputMinorApLo');
  const inputMinorCholesterol = document.getElementById('inputMinorCholesterol');
  const inputMinorGluc = document.getElementById('inputMinorGluc');
  const inputMinorSmoke = document.getElementById('inputMinorSmoke');
  const inputMinorAlco = document.getElementById('inputMinorAlco');
  const inputMinorActive = document.getElementById('inputMinorActive');

  // Chest Pain Cards & Angina Pills
  const chestPainCardGrid = document.getElementById('chestPainCardGrid');
  const anginaPillGroup = document.getElementById('anginaPillGroup');

  // Buttons & Controls
  const predictBtn = document.getElementById('predictBtn');
  const predictSpinner = document.getElementById('predictSpinner');
  const resetBtn = document.getElementById('resetBtn');
  const loadSampleBtn = document.getElementById('loadSampleBtn');

  // Results Section Elements
  const resultsContainer = document.getElementById('resultsContainer');
  const resultModeBadge = document.getElementById('resultModeBadge');
  const resultTimestamp = document.getElementById('resultTimestamp');
  const closeResultsTopBtn = document.getElementById('closeResultsTopBtn');
  const performAnotherAssessmentBtn = document.getElementById('performAnotherAssessmentBtn');
  const printReportBtn = document.getElementById('printReportBtn');

  const outcomeGrid = document.getElementById('outcomeGrid');
  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const statusHeadline = document.getElementById('statusHeadline');
  const statusSubtext = document.getElementById('statusSubtext');

  // Radar Elements & Health Measurements
  const radarHeadingText = document.getElementById('radarHeadingText');
  const radarSectionInstruction = document.getElementById('radarSectionInstruction');
  const radarCardLayoutMajor = document.getElementById('radarCardLayoutMajor');
  const radarCardLayoutMinor = document.getElementById('radarCardLayoutMinor');

  // Major Radar Elements
  const majorRadarSvg = document.getElementById('majorRadarSvg');
  const majorRadarPolygon = document.getElementById('majorRadarPolygon');
  const majorDotAge = document.getElementById('majorDotAge');
  const majorDotRestingBP = document.getElementById('majorDotRestingBP');
  const majorDotChol = document.getElementById('majorDotChol');
  const majorDotMaxHR = document.getElementById('majorDotMaxHR');
  const majorDotOldpeak = document.getElementById('majorDotOldpeak');
  const majorAxisLineChol = document.getElementById('majorAxisLineChol');
  const majorAxisLabelChol = document.getElementById('majorAxisLabelChol');
  const majorRadarValAge = document.getElementById('majorRadarValAge');
  const majorRadarValRestingBP = document.getElementById('majorRadarValRestingBP');
  const majorRadarValChol = document.getElementById('majorRadarValChol');
  const majorRadarRefChol = document.getElementById('majorRadarRefChol');
  const majorRadarValMaxHR = document.getElementById('majorRadarValMaxHR');
  const majorRadarValOldpeak = document.getElementById('majorRadarValOldpeak');

  // Major Clinical Section & Explanatory Box
  const majorClinicalSection = document.getElementById('majorClinicalSection');
  const majorValSex = document.getElementById('majorValSex');
  const majorValChestPainType = document.getElementById('majorValChestPainType');
  const majorValFastingBS = document.getElementById('majorValFastingBS');
  const majorValRestingECG = document.getElementById('majorValRestingECG');
  const majorValExerciseAngina = document.getElementById('majorValExerciseAngina');
  const majorValSTSlope = document.getElementById('majorValSTSlope');
  const majorChartExplanationBox = document.getElementById('majorChartExplanationBox');

  // Legacy radar aliases (if needed)
  const radarPolygon = majorRadarPolygon;
  const radarValBP = majorRadarValRestingBP;
  const radarValHR = majorRadarValMaxHR;
  const radarValChol = majorRadarValChol;
  const radarValAngina = null;
  const radarValST = majorRadarValOldpeak;

  const minorRadarPolygon = document.getElementById('minorRadarPolygon');
  const minorDotAge = document.getElementById('minorDotAge');
  const minorDotBMI = document.getElementById('minorDotBMI');
  const minorDotSys = document.getElementById('minorDotSys');
  const minorDotDia = document.getElementById('minorDotDia');
  const minorRadarValAge = document.getElementById('minorRadarValAge');
  const minorRadarValBMI = document.getElementById('minorRadarValBMI');
  const minorRadarValSysBP = document.getElementById('minorRadarValSysBP');
  const minorRadarValDiaBP = document.getElementById('minorRadarValDiaBP');

  // Minor Lifestyle & Explanation Box
  const minorLifestyleSection = document.getElementById('minorLifestyleSection');
  const minorValCholesterol = document.getElementById('minorValCholesterol');
  const minorValGlucose = document.getElementById('minorValGlucose');
  const minorValSmoke = document.getElementById('minorValSmoke');
  const minorValAlco = document.getElementById('minorValAlco');
  const minorValActive = document.getElementById('minorValActive');
  const minorChartExplanationBox = document.getElementById('minorChartExplanationBox');

  // Notification Toast
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');

  // ==========================================
  // Initialization
  // ==========================================
  function init() {
    setupThemeSwitcher();
    setupAssessmentMode();
    setupStethoscopeAudio();
    setupRhythmPresets();
    setupAnatomicalPins();
    setupCardiacHudTicker();
    setupBmiCalculator();
    setupFormControls();
    setupFieldTooltips();
    setupModals();
    setupEventListeners();
  }

  // ==========================================
  // Theme Switcher Logic
  // ==========================================
  function setupThemeSwitcher() {
    const savedTheme = localStorage.getItem('cardiopredict_theme') || 'clinical';
    applyTheme(savedTheme);

    if (themeBtn && themeDropdown) {
      themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!themeDropdown.contains(e.target) && e.target !== themeBtn) {
          themeDropdown.classList.add('hidden');
        }
      });
    }

    themeOptionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const selectedTheme = btn.getAttribute('data-theme');
        applyTheme(selectedTheme);
        if (themeDropdown) themeDropdown.classList.add('hidden');
      });
    });
  }

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('cardiopredict_theme', themeName);

    themeOptionButtons.forEach((btn) => {
      if (btn.getAttribute('data-theme') === themeName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (themeCurrentLabel && themeCurrentIcon) {
      if (themeName === 'neon') {
        themeCurrentLabel.textContent = 'Neon Dark';
        themeCurrentIcon.textContent = '⚡';
      } else if (themeName === 'sunset') {
        themeCurrentLabel.textContent = 'Sunset';
        themeCurrentIcon.textContent = '🌅';
      } else {
        themeCurrentLabel.textContent = 'Clinical';
        themeCurrentIcon.textContent = '🩺';
      }
    }
  }

  // ==========================================
  // Dual-Mode Assessment Switching
  // ==========================================
  function setupAssessmentMode() {
    if (tabMajor) {
      tabMajor.addEventListener('click', () => setAssessmentMode('major'));
    }
    if (tabSimple) {
      tabSimple.addEventListener('click', () => setAssessmentMode('minor'));
    }
    setAssessmentMode('minor');
  }

  function setAssessmentMode(mode) {
    if (state.currentMode !== mode) {
      if (resultsContainer) resultsContainer.classList.add('hidden');
      state.lastResult = null;
      state.lastPayload = null;
      state.lastResultMode = null;
    }
    state.currentMode = mode;
    clearValidationErrors();

    if (mode === 'major') {
      if (tabMajor) tabMajor.classList.add('active');
      if (tabSimple) tabSimple.classList.remove('active');
      if (majorFieldsContainer) majorFieldsContainer.classList.remove('hidden');
      if (minorFieldsContainer) minorFieldsContainer.classList.add('hidden');
      if (majorOnlySection) majorOnlySection.classList.remove('hidden');

      if (bannerTitle) bannerTitle.textContent = '';
      if (bannerText) bannerText.textContent = '';
    } else {
      if (tabSimple) tabSimple.classList.add('active');
      if (tabMajor) tabMajor.classList.remove('active');
      if (majorFieldsContainer) majorFieldsContainer.classList.add('hidden');
      if (minorFieldsContainer) minorFieldsContainer.classList.remove('hidden');
      if (majorOnlySection) majorOnlySection.classList.add('hidden');

      if (bannerTitle) bannerTitle.textContent = '';
      if (bannerText) bannerText.textContent = '';
    }
  }

  // ==========================================
  // Web Audio API Stethoscope Heart Sounds
  // ==========================================
  function setupStethoscopeAudio() {
    if (!audioStethoBtn) return;

    audioStethoBtn.addEventListener('click', () => {
      toggleStethoscopeAudio();
    });
  }

  function toggleStethoscopeAudio() {
    if (state.audioActive) {
      stopStethoscopeAudio();
    } else {
      startStethoscopeAudio();
    }
  }

  function startStethoscopeAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        showToast('Web Audio API is not supported in this browser.', 'warning');
        return;
      }
      if (!state.audioCtx) {
        state.audioCtx = new AudioContext();
      }
      if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }

      state.audioActive = true;
      if (audioStethoBtn) audioStethoBtn.classList.add('active');
      if (stethoStatusText) stethoStatusText.textContent = 'Lub-Dub Active';

      scheduleHeartSoundCycle();
      showToast('Stethoscope acoustic simulation enabled.', 'info');
    } catch (err) {
      console.warn('Audio initialization failed:', err);
      showToast('Could not start stethoscope audio.', 'error');
    }
  }

  function stopStethoscopeAudio() {
    state.audioActive = false;
    if (state.audioTimer) {
      clearTimeout(state.audioTimer);
      state.audioTimer = null;
    }
    if (audioStethoBtn) audioStethoBtn.classList.remove('active');
    if (stethoStatusText) stethoStatusText.textContent = 'Sound Off';
  }

  function scheduleHeartSoundCycle() {
    if (!state.audioActive || !state.audioCtx) return;

    const bpm = state.bpm || 75;
    const cycleMs = (60 / bpm) * 1000;

    // S1 'Lub' (Mitral/Tricuspid closure)
    playHeartTone(65, 0.12, 0.35);

    // S2 'Dub' (Aortic/Pulmonic closure) occurs ~35% into the cardiac cycle
    const s2DelayMs = Math.round(cycleMs * 0.35);
    setTimeout(() => {
      if (state.audioActive) {
        playHeartTone(95, 0.08, 0.28);
      }
    }, s2DelayMs);

    state.audioTimer = setTimeout(() => {
      scheduleHeartSoundCycle();
    }, cycleMs);
  }

  function playHeartTone(freq, duration, peakVolume) {
    if (!state.audioCtx) return;
    const ctx = state.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peakVolume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // ==========================================
  // Interactive Rhythm Presets & Pacing
  // ==========================================
  function setupRhythmPresets() {
    rhythmChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const rhythm = chip.getAttribute('data-rhythm');
        const bpm = parseInt(chip.getAttribute('data-bpm'), 10) || 75;
        applyRhythmPreset(rhythm, bpm, chip);
      });
    });
  }

  function applyRhythmPreset(rhythm, bpm, activeChip) {
    state.rhythm = rhythm;
    state.bpm = bpm;

    rhythmChips.forEach((c) => c.classList.remove('active'));
    if (activeChip) activeChip.classList.add('active');

    if (liveBpmValue) liveBpmValue.textContent = bpm;

    const animDuration = (60 / bpm).toFixed(3) + 's';
    if (heartPulseGroup) {
      heartPulseGroup.style.animationDuration = animDuration;
    }

    // Hemodynamics & Workload Calculation
    let strokeVolume = 72;
    let workloadText = 'Sinus Rhythm';
    let toneText = 'Normotensive Tone';
    let dotClass = 'green';

    switch (rhythm) {
      case 'athlete':
        strokeVolume = 92;
        workloadText = 'Sinus Bradycardia';
        toneText = 'Vasodilated (Low Afterload)';
        dotClass = 'blue';
        break;
      case 'exertion':
        strokeVolume = 85;
        workloadText = 'Physiological Tachycardia';
        toneText = 'Hyperdynamic Perfusion';
        dotClass = 'yellow';
        break;
      case 'tachy':
        strokeVolume = 54;
        workloadText = 'Sinus Tachycardia';
        toneText = 'Vasoconstricted / Elevated Tone';
        dotClass = 'red';
        break;
      case 'arrhythmia':
        strokeVolume = 62;
        workloadText = 'Arrhythmic Pacing';
        toneText = 'Irregular Vascular Filling';
        dotClass = 'orange';
        break;
      default:
        strokeVolume = 72;
        workloadText = 'Normal Sinus Rhythm';
        toneText = 'Normotensive Tone';
        dotClass = 'green';
    }

    const cardiacOutput = ((bpm * strokeVolume) / 1000).toFixed(1);
    if (hudStrokeVolume) hudStrokeVolume.textContent = `${strokeVolume} mL/bt`;
    if (hudCardiacOutput) hudCardiacOutput.textContent = `${cardiacOutput} L/min`;
    if (hudWorkload) hudWorkload.textContent = workloadText;

    if (vascularStateText) vascularStateText.textContent = toneText;
    if (vascularStateDot) {
      vascularStateDot.className = `vascular-state-dot ${dotClass}`;
    }

    // Refresh audio schedule if stethoscope is playing
    if (state.audioActive) {
      if (state.audioTimer) clearTimeout(state.audioTimer);
      scheduleHeartSoundCycle();
    }
  }

  // ==========================================
  // Anatomical Hotspots (Pins) & Tooltip
  // ==========================================
  function setupAnatomicalPins() {
    if (!anatomicalPins || !anatomicalTooltip) return;

    anatPins.forEach((pin) => {
      pin.addEventListener('mouseenter', (e) => {
        showAnatTooltip(pin);
      });
      pin.addEventListener('focus', () => {
        showAnatTooltip(pin);
      });
      pin.addEventListener('mouseleave', () => {
        hideAnatTooltip();
      });
      pin.addEventListener('blur', () => {
        hideAnatTooltip();
      });
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        showAnatTooltip(pin);
      });
    });

    document.addEventListener('click', (e) => {
      if (!anatomicalPins.contains(e.target)) {
        hideAnatTooltip();
      }
    });
  }

  function showAnatTooltip(pin) {
    if (!anatomicalTooltip || !anatTooltipTitle || !anatTooltipDesc) return;
    const chamber = pin.getAttribute('data-chamber') || 'Cardiac Chamber';
    const info = pin.getAttribute('data-info') || '';

    anatTooltipTitle.textContent = chamber;
    anatTooltipDesc.textContent = info;

    anatomicalTooltip.classList.remove('hidden');

    const pinRect = pin.getBoundingClientRect();
    const parentRect = anatomicalPins.getBoundingClientRect();

    const top = pinRect.top - parentRect.top - 70;
    const left = pinRect.left - parentRect.left - 20;

    anatomicalTooltip.style.top = `${Math.max(10, top)}px`;
    anatomicalTooltip.style.left = `${Math.max(10, Math.min(parentRect.width - 240, left))}px`;
  }

  function hideAnatTooltip() {
    if (anatomicalTooltip) {
      anatomicalTooltip.classList.add('hidden');
    }
  }

  // ==========================================
  // Cardiac Cycle Real-Time HUD Ticker
  // ==========================================
  function setupCardiacHudTicker() {
    function tick() {
      const bpm = state.bpm || 75;
      const cycleMs = (60 / bpm) * 1000;
      const elapsed = (Date.now() - state.cycleStartTime) % cycleMs;
      const progress = elapsed / cycleMs; // 0.0 to 1.0

      if (hudProgressBar) {
        hudProgressBar.style.width = `${(progress * 100).toFixed(1)}%`;
      }

      // Cardiac Cycle Stages:
      // 0.0 - 0.20: Atrial Kick (P-wave)
      // 0.20 - 0.65: Ventricular Ejection (QRS / Systole)
      // 0.65 - 1.0: Diastolic Fill (T-wave / Diastole)
      if (progress < 0.20) {
        if (hudPhaseName) hudPhaseName.textContent = 'Atrial Systole (P-Wave)';
        if (stageAtrial) stageAtrial.className = 'hud-stage-pill active';
        if (stageVentricular) stageVentricular.className = 'hud-stage-pill';
        if (stageDiastole) stageDiastole.className = 'hud-stage-pill';
      } else if (progress < 0.65) {
        if (hudPhaseName) hudPhaseName.textContent = 'Ventricular Systole (Ejection)';
        if (stageAtrial) stageAtrial.className = 'hud-stage-pill';
        if (stageVentricular) stageVentricular.className = 'hud-stage-pill active';
        if (stageDiastole) stageDiastole.className = 'hud-stage-pill';
      } else {
        if (hudPhaseName) hudPhaseName.textContent = 'Ventricular Diastole (Filling)';
        if (stageAtrial) stageAtrial.className = 'hud-stage-pill';
        if (stageVentricular) stageVentricular.className = 'hud-stage-pill';
        if (stageDiastole) stageDiastole.className = 'hud-stage-pill active';
      }

      state.hudRafId = requestAnimationFrame(tick);
    }

    state.hudRafId = requestAnimationFrame(tick);
  }

  // ==========================================
  // BMI Calculator Engine (Dual-Unit)
  // ==========================================
  function setupBmiCalculator() {
    const openBmi = () => {
      if (bmiModal) bmiModal.classList.remove('hidden');
      updateBmiCalculation();
    };

    const closeBmi = () => {
      if (bmiModal) bmiModal.classList.add('hidden');
    };

    if (bmiCalculatorBtn) bmiCalculatorBtn.addEventListener('click', openBmi);
    if (bmiOpenInlineBtn) bmiOpenInlineBtn.addEventListener('click', openBmi);
    if (closeBmiBtn) closeBmiBtn.addEventListener('click', closeBmi);
    if (bmiDismissBtn) bmiDismissBtn.addEventListener('click', closeBmi);

    if (bmiModal) {
      bmiModal.addEventListener('click', (e) => {
        if (e.target === bmiModal) closeBmi();
      });
    }

    // Unit toggle
    if (bmiUnitMetric && bmiUnitImperial) {
      bmiUnitMetric.addEventListener('click', () => {
        bmiUnitMetric.classList.add('active');
        bmiUnitImperial.classList.remove('active');
        if (bmiMetricGroup) bmiMetricGroup.classList.remove('hidden');
        if (bmiImperialGroup) bmiImperialGroup.classList.add('hidden');
      });

      bmiUnitImperial.addEventListener('click', () => {
        bmiUnitImperial.classList.add('active');
        bmiUnitMetric.classList.remove('active');
        if (bmiImperialGroup) bmiImperialGroup.classList.remove('hidden');
        if (bmiMetricGroup) bmiMetricGroup.classList.add('hidden');
      });
    }

    // Metric input sync
    if (bmiInputHeightCm && bmiSliderHeightCm) {
      bmiInputHeightCm.addEventListener('input', () => {
        bmiSliderHeightCm.value = bmiInputHeightCm.value;
        syncMetricToImperial();
        updateBmiCalculation();
      });
      bmiSliderHeightCm.addEventListener('input', () => {
        bmiInputHeightCm.value = bmiSliderHeightCm.value;
        syncMetricToImperial();
        updateBmiCalculation();
      });
    }

    if (bmiInputWeightKg && bmiSliderWeightKg) {
      bmiInputWeightKg.addEventListener('input', () => {
        bmiSliderWeightKg.value = bmiInputWeightKg.value;
        syncMetricToImperial();
        updateBmiCalculation();
      });
      bmiSliderWeightKg.addEventListener('input', () => {
        bmiInputWeightKg.value = bmiSliderWeightKg.value;
        syncMetricToImperial();
        updateBmiCalculation();
      });
    }

    // Imperial input sync
    const handleImperialInput = () => {
      const ft = parseInt(bmiInputHeightFt.value, 10) || 5;
      const inches = parseInt(bmiInputHeightIn.value, 10) || 0;
      const totalIn = ft * 12 + inches;
      if (bmiSliderHeightTotalIn) bmiSliderHeightTotalIn.value = totalIn;

      syncImperialToMetric();
      updateBmiCalculation();
    };

    if (bmiInputHeightFt) bmiInputHeightFt.addEventListener('input', handleImperialInput);
    if (bmiInputHeightIn) bmiInputHeightIn.addEventListener('input', handleImperialInput);

    if (bmiSliderHeightTotalIn) {
      bmiSliderHeightTotalIn.addEventListener('input', () => {
        const total = parseInt(bmiSliderHeightTotalIn.value, 10);
        const ft = Math.floor(total / 12);
        const inc = total % 12;
        if (bmiInputHeightFt) bmiInputHeightFt.value = ft;
        if (bmiInputHeightIn) bmiInputHeightIn.value = inc;
        syncImperialToMetric();
        updateBmiCalculation();
      });
    }

    if (bmiInputWeightLbs && bmiSliderWeightLbs) {
      bmiInputWeightLbs.addEventListener('input', () => {
        bmiSliderWeightLbs.value = bmiInputWeightLbs.value;
        syncImperialToMetric();
        updateBmiCalculation();
      });
      bmiSliderWeightLbs.addEventListener('input', () => {
        bmiInputWeightLbs.value = bmiSliderWeightLbs.value;
        syncImperialToMetric();
        updateBmiCalculation();
      });
    }

    if (bmiResetBtn) {
      bmiResetBtn.addEventListener('click', () => {
        if (bmiInputHeightCm) bmiInputHeightCm.value = 175;
        if (bmiSliderHeightCm) bmiSliderHeightCm.value = 175;
        if (bmiInputWeightKg) bmiInputWeightKg.value = 72;
        if (bmiSliderWeightKg) bmiSliderWeightKg.value = 72;
        syncMetricToImperial();
        updateBmiCalculation();
      });
    }

    updateBmiCalculation();
  }

  function syncMetricToImperial() {
    const cm = parseFloat(bmiInputHeightCm ? bmiInputHeightCm.value : 175) || 175;
    const kg = parseFloat(bmiInputWeightKg ? bmiInputWeightKg.value : 72) || 72;

    const totalIn = Math.round(cm / 2.54);
    const ft = Math.floor(totalIn / 12);
    const inc = totalIn % 12;
    const lbs = Math.round(kg * 2.20462);

    if (bmiInputHeightFt) bmiInputHeightFt.value = ft;
    if (bmiInputHeightIn) bmiInputHeightIn.value = inc;
    if (bmiSliderHeightTotalIn) bmiSliderHeightTotalIn.value = totalIn;
    if (bmiInputWeightLbs) bmiInputWeightLbs.value = lbs;
    if (bmiSliderWeightLbs) bmiSliderWeightLbs.value = lbs;
  }

  function syncImperialToMetric() {
    const ft = parseInt(bmiInputHeightFt ? bmiInputHeightFt.value : 5, 10) || 5;
    const inc = parseInt(bmiInputHeightIn ? bmiInputHeightIn.value : 9, 10) || 0;
    const lbs = parseFloat(bmiInputWeightLbs ? bmiInputWeightLbs.value : 160) || 160;

    const totalIn = ft * 12 + inc;
    const cm = Math.round(totalIn * 2.54);
    const kg = Math.round(lbs / 2.20462);

    if (bmiInputHeightCm) bmiInputHeightCm.value = cm;
    if (bmiSliderHeightCm) bmiSliderHeightCm.value = cm;
    if (bmiInputWeightKg) bmiInputWeightKg.value = kg;
    if (bmiSliderWeightKg) bmiSliderWeightKg.value = kg;
  }

  function updateBmiCalculation() {
    const heightCm = parseFloat(bmiInputHeightCm ? bmiInputHeightCm.value : 175) || 175;
    const weightKg = parseFloat(bmiInputWeightKg ? bmiInputWeightKg.value : 72) || 72;

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    if (bmiNumberDisplay) {
      bmiNumberDisplay.textContent = bmi.toFixed(1);
    }

    // Needle indicator along 15 - 40 track
    const pct = Math.max(3, Math.min(97, ((bmi - 15) / 25) * 100));
    if (bmiNeedleIndicator) {
      bmiNeedleIndicator.style.left = `${pct}%`;
    }

    // Classification & Clinical Text
    let category = 'Normal Weight (Optimal)';
    let badgeClass = 'badge-normal';
    let summary = 'Optimal body mass index associated with minimal cardiovascular strain and lowest relative risk of hypertension.';
    let impact = 'Normal body mass maintains balanced systemic vascular resistance, low left ventricular wall stress, and optimal myocardial oxygen balance.';

    if (bmi < 18.5) {
      category = 'Underweight (< 18.5)';
      badgeClass = 'badge-under';
      summary = 'Sub-optimal body mass index; may indicate nutritional insufficiency or metabolic deficit.';
      impact = 'Reduced metabolic demand on heart, but potential vulnerability to compromised cardiac output reserve.';
    } else if (bmi < 25.0) {
      category = 'Normal Weight (18.5 – 24.9)';
      badgeClass = 'badge-normal';
      summary = 'Optimal body mass index associated with minimal cardiovascular strain and lowest relative risk of hypertension.';
      impact = 'Normal body mass maintains balanced systemic vascular resistance, low left ventricular wall stress, and optimal myocardial oxygen balance.';
    } else if (bmi < 30.0) {
      category = 'Overweight (25.0 – 29.9)';
      badgeClass = 'badge-over';
      summary = 'Elevated adipose volume creates moderate peripheral vascular resistance and increases left ventricular stroke work.';
      impact = 'Increased vascular resistance elevates resting arterial pressure and myocardial oxygen consumption.';
    } else if (bmi < 35.0) {
      category = 'Obese Class I (30.0 – 34.9)';
      badgeClass = 'badge-obese1';
      summary = 'High hemodynamic burden; strongly linked to systemic hypertension, atherogenesis, and insulin resistance.';
      impact = 'Elevates left ventricular afterload, promoting eccentric/concentric myocardial remodeling and ischemic risk.';
    } else {
      category = 'Obese Class II+ (≥ 35.0)';
      badgeClass = 'badge-obese2';
      summary = 'Severe cardiovascular strain with substantial systemic inflammatory and vascular endothelial burden.';
      impact = 'Markedly increased circulating blood volume and pulmonary resistance; severe elevation in cardiovascular event risk.';
    }

    if (bmiCategoryBadge) {
      bmiCategoryBadge.textContent = category;
      bmiCategoryBadge.className = `bmi-category-badge ${badgeClass}`;
    }
    if (bmiSummaryText) bmiSummaryText.textContent = summary;
    if (bmiCardioDesc) bmiCardioDesc.textContent = impact;

    // Ideal weight calculation for this height (BMI 18.5 - 24.9)
    const minKg = 18.5 * heightM * heightM;
    const maxKg = 24.9 * heightM * heightM;
    const minLbs = minKg * 2.20462;
    const maxLbs = maxKg * 2.20462;

    if (bmiIdealRangeText) {
      bmiIdealRangeText.textContent = `${minKg.toFixed(1)} kg – ${maxKg.toFixed(1)} kg (${minLbs.toFixed(0)} – ${maxLbs.toFixed(0)} lbs)`;
    }

    // Auto-update minor fields if Minor mode is active and inputs exist
    if (state.currentMode === 'minor') {
      if (inputMinorHeight && (!inputMinorHeight.value || inputMinorHeight.dataset.synced === 'true')) {
        inputMinorHeight.value = Math.round(heightCm);
        inputMinorHeight.dataset.synced = 'true';
      }
      if (inputMinorWeight && (!inputMinorWeight.value || inputMinorWeight.dataset.synced === 'true')) {
        inputMinorWeight.value = Math.round(weightKg);
        inputMinorWeight.dataset.synced = 'true';
      }
    }
  }

  // ==========================================
  // Form Controls & Interactive Sliders
  // ==========================================
  function setupFormControls() {
    // Resting BP slider sync
    if (inputRestingBP && sliderRestingBP) {
      inputRestingBP.addEventListener('input', () => {
        sliderRestingBP.value = inputRestingBP.value;
        updateRestingBPBadge(parseFloat(inputRestingBP.value));
      });
      sliderRestingBP.addEventListener('input', () => {
        inputRestingBP.value = sliderRestingBP.value;
        updateRestingBPBadge(parseFloat(sliderRestingBP.value));
      });
    }

    // Max HR slider sync
    if (inputMaxHR && sliderMaxHR) {
      inputMaxHR.addEventListener('input', () => {
        sliderMaxHR.value = inputMaxHR.value;
        updateMaxHRBadge(parseFloat(inputMaxHR.value));
      });
      sliderMaxHR.addEventListener('input', () => {
        inputMaxHR.value = sliderMaxHR.value;
        updateMaxHRBadge(parseFloat(sliderMaxHR.value));
      });
    }

    // Chest Pain Cards
    if (chestPainCardGrid) {
      const cards = Array.from(chestPainCardGrid.querySelectorAll('.chest-card, .chest-pain-card'));
      cards.forEach((card, index) => {
        card.addEventListener('click', () => {
          selectChestPainCard(card);
        });

        card.addEventListener('keydown', (e) => {
          let targetIndex = -1;
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectChestPainCard(card);
            return;
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (index + 1) % cards.length;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (index - 1 + cards.length) % cards.length;
          }

          if (targetIndex !== -1) {
            const targetCard = cards[targetIndex];
            selectChestPainCard(targetCard);
            targetCard.focus();
          }
        });
      });
    }

    if (inputChestPainType && chestPainCardGrid) {
      inputChestPainType.addEventListener('change', () => {
        const val = inputChestPainType.value;
        const matchingCard = chestPainCardGrid.querySelector(`[data-val="${val}"], [data-type="${val}"]`);
        if (matchingCard) {
          const cards = chestPainCardGrid.querySelectorAll('.chest-card, .chest-pain-card');
          cards.forEach((c) => {
            const isSelected = c === matchingCard;
            c.classList.toggle('active', isSelected);
            c.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            c.setAttribute('tabindex', isSelected ? '0' : '-1');
          });
        }
      });
    }

    // Angina Pill Group
    if (anginaPillGroup) {
      const pills = Array.from(anginaPillGroup.querySelectorAll('.segment-btn, .angina-pill'));
      pills.forEach((pill, index) => {
        pill.addEventListener('click', () => {
          selectAnginaPill(pill);
        });

        pill.addEventListener('keydown', (e) => {
          let targetIndex = -1;
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectAnginaPill(pill);
            return;
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (index + 1) % pills.length;
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (index - 1 + pills.length) % pills.length;
          }

          if (targetIndex !== -1) {
            const targetPill = pills[targetIndex];
            selectAnginaPill(targetPill);
            targetPill.focus();
          }
        });
      });
    }

    if (inputExerciseAngina && anginaPillGroup) {
      inputExerciseAngina.addEventListener('change', () => {
        const val = inputExerciseAngina.value;
        const matchingPill = anginaPillGroup.querySelector(`[data-val="${val}"], [data-value="${val}"]`);
        if (matchingPill) {
          const pills = anginaPillGroup.querySelectorAll('.segment-btn, .angina-pill');
          pills.forEach((p) => {
            const isSelected = p === matchingPill;
            p.classList.toggle('active', isSelected);
            p.setAttribute('aria-checked', isSelected ? 'true' : 'false');
            p.setAttribute('tabindex', isSelected ? '0' : '-1');
          });
        }
      });
    }

    // Sample data loader
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', loadSampleData);
    }

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', resetForm);
    }
  }

  // ----------------------------------------
  // Chest Pain Type Selection
  // ----------------------------------------
  function selectChestPainCard(card) {
    if (!chestPainCardGrid || !card) return;
    const cards = Array.from(chestPainCardGrid.querySelectorAll('.chest-card, .chest-pain-card'));
    const val = card.getAttribute('data-val') || card.getAttribute('data-type');
    if (!val) return;

    cards.forEach((c) => {
      const isSelected = c === card;
      c.classList.toggle('active', isSelected);
      c.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      c.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    if (inputChestPainType) {
      inputChestPainType.value = val;
      clearFieldError('ChestPainType');
    }
  }

  // ----------------------------------------
  // Exercise-Induced Angina Selection
  // ----------------------------------------
  function selectAnginaPill(pill) {
    if (!anginaPillGroup || !pill) return;
    const pills = Array.from(anginaPillGroup.querySelectorAll('.segment-btn, .angina-pill'));
    const val = pill.getAttribute('data-val') || pill.getAttribute('data-value');
    if (!val) return;

    pills.forEach((p) => {
      const isSelected = p === pill;
      p.classList.toggle('active', isSelected);
      p.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      p.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    if (inputExerciseAngina) {
      inputExerciseAngina.value = val;
      clearFieldError('ExerciseAngina');
    }
  }

  function updateRestingBPBadge(val) {
    if (!badgeRestingBP || isNaN(val)) return;
    if (val < 120) {
      badgeRestingBP.textContent = 'Normal (< 120)';
      badgeRestingBP.className = 'val-badge badge-normal';
    } else if (val < 130) {
      badgeRestingBP.textContent = 'Elevated (120–129)';
      badgeRestingBP.className = 'val-badge badge-elevated';
    } else if (val < 140) {
      badgeRestingBP.textContent = 'Stage 1 HTN (130–139)';
      badgeRestingBP.className = 'val-badge badge-stage1';
    } else {
      badgeRestingBP.textContent = 'Stage 2 HTN (≥ 140)';
      badgeRestingBP.className = 'val-badge badge-stage2';
    }
  }

  function updateMaxHRBadge(val) {
    if (!badgeMaxHR || isNaN(val)) return;
    if (val < 100) {
      badgeMaxHR.textContent = 'Low (< 100)';
    } else if (val < 150) {
      badgeMaxHR.textContent = 'Moderate (100–149)';
    } else {
      badgeMaxHR.textContent = 'High Demand (≥ 150)';
    }
  }

  function loadSampleData() {
    clearValidationErrors();

    if (state.currentMode === 'major') {
      if (inputAge) inputAge.value = 58;
      if (inputSex) inputSex.value = 'M';
      if (inputRestingBP) inputRestingBP.value = 145;
      if (sliderRestingBP) sliderRestingBP.value = 145;
      updateRestingBPBadge(145);

      if (inputCholesterol) inputCholesterol.value = 260;
      if (inputFastingBS) inputFastingBS.value = '1';
      if (inputRestingECG) inputRestingECG.value = 'ST';
      if (inputMaxHR) inputMaxHR.value = 120;
      if (sliderMaxHR) sliderMaxHR.value = 120;
      updateMaxHRBadge(120);

      if (inputOldpeak) inputOldpeak.value = '1.8';
      if (inputST_Slope) inputST_Slope.value = 'Flat';

      // Chest pain card ASY
      if (chestPainCardGrid) {
        const asyCard = chestPainCardGrid.querySelector('[data-val="ASY"], [data-type="ASY"]');
        if (asyCard) {
          selectChestPainCard(asyCard);
        } else if (inputChestPainType) {
          inputChestPainType.value = 'ASY';
        }
      }

      // Exercise Angina Y
      if (anginaPillGroup) {
        const yPill = anginaPillGroup.querySelector('[data-val="Y"], [data-value="Y"]');
        if (yPill) {
          selectAnginaPill(yPill);
        } else if (inputExerciseAngina) {
          inputExerciseAngina.value = 'Y';
        }
      }

      showToast('Loaded clinical high-risk profile for Major Model.', 'info');
    } else {
      if (inputMinorAge) inputMinorAge.value = 54;
      if (inputMinorGender) inputMinorGender.value = '2'; // Male
      if (inputMinorHeight) inputMinorHeight.value = 172;
      if (inputMinorWeight) inputMinorWeight.value = 84;
      if (inputMinorApHi) inputMinorApHi.value = 140;
      if (inputMinorApLo) inputMinorApLo.value = 90;
      if (inputMinorCholesterol) inputMinorCholesterol.value = '2';
      if (inputMinorGluc) inputMinorGluc.value = '1';
      if (inputMinorSmoke) inputMinorSmoke.value = '0';
      if (inputMinorAlco) inputMinorAlco.value = '0';
      if (inputMinorActive) inputMinorActive.value = '1';

      showToast('Loaded screening sample profile for Minor Model.', 'info');
    }
  }

  function resetForm() {
    clearValidationErrors();
    if (assessmentForm) assessmentForm.reset();

    if (sliderRestingBP) sliderRestingBP.value = 120;
    if (inputRestingBP) inputRestingBP.value = 120;
    updateRestingBPBadge(120);

    if (sliderMaxHR) sliderMaxHR.value = 140;
    if (inputMaxHR) inputMaxHR.value = 140;
    updateMaxHRBadge(140);

    if (chestPainCardGrid) {
      const defaultCard = chestPainCardGrid.querySelector('[data-val="ASY"], [data-type="ASY"]');
      if (defaultCard) {
        selectChestPainCard(defaultCard);
      }
    }
    if (anginaPillGroup) {
      const defaultPill = anginaPillGroup.querySelector('[data-val="N"], [data-value="N"]');
      if (defaultPill) {
        selectAnginaPill(defaultPill);
      }
    }

    if (resultsContainer) resultsContainer.classList.add('hidden');
    showToast('Form inputs reset to default state.', 'info');
  }

  // ==========================================
  // Client-Side Validation (Zero-Fabrication)
  // ==========================================
  function clearValidationErrors() {
    const errorSpans = document.querySelectorAll('.field-error');
    errorSpans.forEach((span) => {
      span.textContent = '';
      span.classList.add('hidden');
    });

    const groups = document.querySelectorAll('.form-group');
    groups.forEach((g) => g.classList.remove('has-error'));
  }

  function clearFieldError(fieldName) {
    const errSpan = document.getElementById(`error-${fieldName}`);
    if (errSpan) {
      errSpan.textContent = '';
      errSpan.classList.add('hidden');
    }
    const group = document.getElementById(`group-${fieldName}`);
    if (group) group.classList.remove('has-error');
  }

  function displayValidationErrors(errors) {
    clearValidationErrors();
    let firstInvalid = null;

    for (const [field, msg] of Object.entries(errors)) {
      const errSpan = document.getElementById(`error-${field}`);
      if (errSpan) {
        errSpan.textContent = msg;
        errSpan.classList.remove('hidden');
      }
      const group = document.getElementById(`group-${field}`);
      if (group) group.classList.add('has-error');

      if (!firstInvalid) {
        firstInvalid = document.getElementById(`input${field}`) || document.getElementById(`inputMinor${field.charAt(0).toUpperCase() + field.slice(1)}`);
      }
    }

    if (firstInvalid && typeof firstInvalid.focus === 'function') {
      firstInvalid.focus();
    }
  }

  function validateMajorInputs() {
    const errors = {};
    const age = parseInt(inputAge.value, 10);
    if (isNaN(age) || age < 18 || age > 120) {
      errors.Age = 'Age must be between 18 and 120 years.';
    }

    const sex = inputSex.value;
    if (sex !== 'M' && sex !== 'F') {
      errors.Sex = 'Please select a biological sex option.';
    }

    const cpt = inputChestPainType.value;
    if (!['TA', 'ATA', 'NAP', 'ASY'].includes(cpt)) {
      errors.ChestPainType = 'Please select a chest pain classification.';
    }

    const rbp = parseFloat(inputRestingBP.value);
    if (isNaN(rbp) || rbp < 50 || rbp > 260) {
      errors.RestingBP = 'Resting Blood Pressure must be between 50 and 260 mm Hg.';
    }

    const cholStr = inputCholesterol.value.trim();
    if (cholStr !== '') {
      const chol = parseFloat(cholStr);
      if (isNaN(chol) || chol < 0 || chol > 800) {
        errors.Cholesterol = 'Cholesterol must be between 0 and 800 mg/dL (or empty for median imputation).';
      }
    }

    const fbs = inputFastingBS.value;
    if (fbs !== '0' && fbs !== '1') {
      errors.FastingBS = 'Please select fasting blood sugar status.';
    }

    const ecg = inputRestingECG.value;
    if (!['Normal', 'ST', 'LVH'].includes(ecg)) {
      errors.RestingECG = 'Please select a resting ECG category.';
    }

    const maxHr = parseFloat(inputMaxHR.value);
    if (isNaN(maxHr) || maxHr < 40 || maxHr > 250) {
      errors.MaxHR = 'Maximum heart rate must be between 40 and 250 bpm.';
    }

    const angina = inputExerciseAngina.value;
    if (angina !== 'Y' && angina !== 'N') {
      errors.ExerciseAngina = 'Please indicate exercise-induced angina status.';
    }

    const oldpeakStr = inputOldpeak.value.trim();
    const oldpeak = parseFloat(oldpeakStr);
    if (isNaN(oldpeak) || oldpeak < -5.0 || oldpeak > 10.0) {
      errors.Oldpeak = 'ST depression (Oldpeak) must be a numeric value between -5.0 and 10.0.';
    }

    const stSlope = inputST_Slope.value;
    if (!['Up', 'Flat', 'Down'].includes(stSlope)) {
      errors.ST_Slope = 'Please select peak exercise ST segment slope.';
    }

    return errors;
  }

  function validateMinorInputs() {
    const errors = {};

    const age = parseFloat(inputMinorAge.value);
    if (isNaN(age) || age < 18 || age > 120) {
      errors.age = 'Age must be between 18 and 120 years.';
    }

    const gender = parseInt(inputMinorGender.value, 10);
    if (gender !== 1 && gender !== 2) {
      errors.gender = 'Gender must be 1 (Female) or 2 (Male).';
    }

    const height = parseFloat(inputMinorHeight.value);
    if (isNaN(height) || height < 100 || height > 250) {
      errors.height = 'Height must be between 100 and 250 cm.';
    }

    const weight = parseFloat(inputMinorWeight.value);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      errors.weight = 'Weight must be between 30 and 300 kg.';
    }

    const apHi = parseFloat(inputMinorApHi.value);
    if (isNaN(apHi) || apHi < 50 || apHi > 260) {
      errors.ap_hi = 'Systolic pressure (ap_hi) must be between 50 and 260 mmHg.';
    }

    const apLo = parseFloat(inputMinorApLo.value);
    if (isNaN(apLo) || apLo < 30 || apLo > 180) {
      errors.ap_lo = 'Diastolic pressure (ap_lo) must be between 30 and 180 mmHg.';
    }

    const chol = parseInt(inputMinorCholesterol.value, 10);
    if (![1, 2, 3].includes(chol)) {
      errors.cholesterol = 'Please select cholesterol tier (1, 2, or 3).';
    }

    const gluc = parseInt(inputMinorGluc.value, 10);
    if (![1, 2, 3].includes(gluc)) {
      errors.gluc = 'Please select glucose tier (1, 2, or 3).';
    }

    const smoke = parseInt(inputMinorSmoke.value, 10);
    if (smoke !== 0 && smoke !== 1) {
      errors.smoke = 'Please select smoking status (0 or 1).';
    }

    const alco = parseInt(inputMinorAlco.value, 10);
    if (alco !== 0 && alco !== 1) {
      errors.alco = 'Please select alcohol consumption status (0 or 1).';
    }

    const active = parseInt(inputMinorActive.value, 10);
    if (active !== 0 && active !== 1) {
      errors.active = 'Please select physical activity level (0 or 1).';
    }

    return errors;
  }

  // ==========================================
  // Backend Form Submission & Prediction Flow
  // ==========================================
  function setupEventListeners() {
    if (assessmentForm) {
      assessmentForm.addEventListener('submit', handleFormSubmit);
    }

    if (closeResultsTopBtn) {
      closeResultsTopBtn.addEventListener('click', () => {
        if (resultsContainer) resultsContainer.classList.add('hidden');
      });
    }

    if (performAnotherAssessmentBtn) {
      performAnotherAssessmentBtn.addEventListener('click', () => {
        if (resultsContainer) resultsContainer.classList.add('hidden');
        window.scrollTo({ top: assessmentForm.offsetTop - 40, behavior: 'smooth' });
      });
    }

    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        if (state.lastResult && state.lastPayload && state.lastResultMode === state.currentMode) {
          updatePrintReport(state.lastResult, state.lastPayload, state.currentMode);
          window.print();
        } else {
          showToast('Please perform an assessment before printing.', 'warning');
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeprint', () => {
        if (state.lastResult && state.lastPayload && state.lastResultMode === state.currentMode) {
          updatePrintReport(state.lastResult, state.lastPayload, state.currentMode);
        }
      });
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (state.isSubmitting) return;

    let errors = {};
    let payload = {};

    if (state.currentMode === 'major') {
      errors = validateMajorInputs();
      if (Object.keys(errors).length > 0) {
        displayValidationErrors(errors);
        showToast('Please correct highlighted validation errors.', 'error');
        return;
      }

      const cholVal = inputCholesterol.value.trim();
      payload = {
        Age: parseInt(inputAge.value, 10),
        Sex: inputSex.value,
        ChestPainType: inputChestPainType.value,
        RestingBP: parseFloat(inputRestingBP.value),
        Cholesterol: (cholVal === '' || parseFloat(cholVal) === 0) ? null : parseFloat(cholVal),
        FastingBS: parseInt(inputFastingBS.value, 10),
        RestingECG: inputRestingECG.value,
        MaxHR: parseFloat(inputMaxHR.value),
        ExerciseAngina: inputExerciseAngina.value,
        Oldpeak: parseFloat(inputOldpeak.value),
        ST_Slope: inputST_Slope.value
      };
    } else {
      errors = validateMinorInputs();
      if (Object.keys(errors).length > 0) {
        displayValidationErrors(errors);
        showToast('Please correct highlighted validation errors.', 'error');
        return;
      }

      payload = {
        age: parseFloat(inputMinorAge.value),
        gender: parseInt(inputMinorGender.value, 10),
        height: parseFloat(inputMinorHeight.value),
        weight: parseFloat(inputMinorWeight.value),
        ap_hi: parseFloat(inputMinorApHi.value),
        ap_lo: parseFloat(inputMinorApLo.value),
        cholesterol: parseInt(inputMinorCholesterol.value, 10),
        gluc: parseInt(inputMinorGluc.value, 10),
        smoke: parseInt(inputMinorSmoke.value, 10),
        alco: parseInt(inputMinorAlco.value, 10),
        active: parseInt(inputMinorActive.value, 10)
      };
    }

    clearValidationErrors();
    setLoadingState(true);

    try {
      const endpoint = `${state.apiBaseUrl}/predict/${state.currentMode}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && errorData.details) {
          displayValidationErrors(errorData.details);
          throw new Error('Backend input validation failed.');
        }
        throw new Error(errorData.error || `Server responded with HTTP ${response.status}`);
      }

      const result = await response.json();
      displayResults(result, payload);
      showToast('Cardiovascular risk estimation completed successfully.', 'success');
    } catch (err) {
      console.error('Prediction request failed:', err);
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    state.isSubmitting = isLoading;
    if (predictBtn) {
      predictBtn.disabled = isLoading;
    }
    if (predictSpinner) {
      predictSpinner.classList.toggle('hidden', !isLoading);
    }
  }

  // ==========================================
  // Deterministic Prediction Resolution
  // ==========================================
  /**
   * Resolves the binary classification prediction deterministically from backend response.
   * Authoritative field: `result.prediction` (0 or 1).
   * Secondary field: `result.predicted_status` ("Positive" or "Negative").
   *
   * Precedence & Contradiction Detection:
   * 1. If result is null/undefined or not an object -> invalid
   * 2. Authoritative field `prediction` must be 0 or 1 (or parseable strictly to 0 or 1).
   * 3. Secondary field `predicted_status` if present must be "Positive" (1) or "Negative" (0).
   * 4. Contradiction: If both are present, they must strictly match. If they disagree, flag contradiction.
   * 5. Precedence:
   *    - If `prediction` is valid (and no contradiction), use `prediction`.
   *    - If `prediction` is omitted/null/undefined and `predicted_status` is valid, use `predicted_status`.
   * 6. If invalid, missing, or contradictory: return { valid: false, error: ... }.
   *
   * @param {Object} result - Backend API response object
   * @returns {{ valid: boolean, isPositive?: boolean, classNum?: number, error?: string }}
   */
  function resolvePrediction(result) {
    if (!result || typeof result !== 'object') {
      return { valid: false, error: 'Response payload is missing or not an object' };
    }

    // Authoritative field: prediction
    let numPred = null;
    if (result.prediction === 0 || result.prediction === 1) {
      numPred = result.prediction;
    } else if (typeof result.prediction === 'string' && (result.prediction.trim() === '0' || result.prediction.trim() === '1')) {
      numPred = parseInt(result.prediction.trim(), 10);
    } else if (result.prediction !== undefined && result.prediction !== null) {
      return { valid: false, error: `Invalid prediction value (${JSON.stringify(result.prediction)})` };
    }

    // Secondary field: predicted_status
    let statusPred = null;
    if (typeof result.predicted_status === 'string') {
      const normalized = result.predicted_status.trim().toLowerCase();
      if (normalized === 'positive') {
        statusPred = 1;
      } else if (normalized === 'negative') {
        statusPred = 0;
      } else {
        return { valid: false, error: `Invalid predicted_status string ("${result.predicted_status}")` };
      }
    } else if (result.predicted_status !== undefined && result.predicted_status !== null) {
      return { valid: false, error: `Invalid predicted_status type (${typeof result.predicted_status})` };
    }

    // Contradiction detection: both fields are present but disagree
    if (numPred !== null && statusPred !== null && numPred !== statusPred) {
      return {
        valid: false,
        error: `Contradictory fields: prediction=${numPred} vs predicted_status="${result.predicted_status}"`
      };
    }

    // Authoritative resolution
    if (numPred !== null) {
      return { valid: true, isPositive: numPred === 1, classNum: numPred };
    }

    // Secondary resolution fallback
    if (statusPred !== null) {
      return { valid: true, isPositive: statusPred === 1, classNum: statusPred };
    }

    // Missing both prediction and predicted_status
    return { valid: false, error: 'Missing authoritative prediction and predicted_status fields' };
  }

  // ==========================================
  // Display Assessment Results
  // ==========================================
  function displayResults(result, payload) {
    state.lastResult = result;
    state.lastPayload = payload;
    state.lastResultMode = state.currentMode;

    const resolved = resolvePrediction(result);

    if (resultModeBadge) {
      resultModeBadge.textContent = state.currentMode === 'major'
        ? 'Extended Clinical Assessment'
        : 'Simple Assessment';
    }

    if (resultTimestamp) {
      const now = new Date();
      resultTimestamp.textContent = `Evaluated: ${now.toLocaleTimeString()} • ${now.toLocaleDateString()}`;
    }

    // Predicted Status Card (Rendered for both Major and Minor)
    if (!resolved.valid) {
      console.error('Deterministic prediction resolution failed:', resolved.error, result);

      if (statusCard) {
        statusCard.className = 'outcome-card status-card status-indeterminate';
      }

      if (statusIcon) {
        statusIcon.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        `;
      }

      if (statusHeadline) {
        statusHeadline.textContent = 'Assessment Status Undetermined';
      }

      if (statusSubtext) {
        statusSubtext.textContent = `Unable to verify model prediction: ${resolved.error}. Please retry.`;
      }
    } else {
      const isPositive = resolved.isPositive;

      if (statusCard) {
        statusCard.className = `outcome-card status-card ${isPositive ? 'status-positive' : 'status-negative'}`;
      }

      if (statusIcon) {
        if (isPositive) {
          statusIcon.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          `;
        } else {
          statusIcon.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          `;
        }
      }

      if (statusHeadline) {
        statusHeadline.textContent = isPositive ? 'Heart Disease Detected' : 'No Heart Disease Detected';
      }

      if (statusSubtext) {
        statusSubtext.textContent = isPositive
          ? 'The statistical classification model predicted a positive status based on the submitted feature inputs.'
          : 'The statistical classification model predicted a negative status based on the submitted feature inputs.';
      }
    }

    // Mode-specific UI section visibility & visualizations
    if (state.currentMode === 'minor') {
      if (radarHeadingText) radarHeadingText.textContent = 'Your Health Measurements';
      if (radarSectionInstruction) {
        radarSectionInstruction.textContent = 'A visual overview of the health measurements provided in your assessment.';
      }

      if (radarCardLayoutMajor) radarCardLayoutMajor.classList.add('hidden');
      if (majorClinicalSection) majorClinicalSection.classList.add('hidden');
      if (majorChartExplanationBox) majorChartExplanationBox.classList.add('hidden');

      if (radarCardLayoutMinor) radarCardLayoutMinor.classList.remove('hidden');
      if (minorLifestyleSection) minorLifestyleSection.classList.remove('hidden');
      if (minorChartExplanationBox) minorChartExplanationBox.classList.remove('hidden');

      renderMinorHealthMeasurements(payload);
    } else {
      // Major Assessment Mode
      if (radarHeadingText) radarHeadingText.textContent = 'Your Health Measurements';
      if (radarSectionInstruction) {
        radarSectionInstruction.textContent = 'A visual overview of the clinical measurements provided in your assessment.';
      }

      if (radarCardLayoutMinor) radarCardLayoutMinor.classList.add('hidden');
      if (minorLifestyleSection) minorLifestyleSection.classList.add('hidden');
      if (minorChartExplanationBox) minorChartExplanationBox.classList.add('hidden');

      if (radarCardLayoutMajor) radarCardLayoutMajor.classList.remove('hidden');
      if (majorClinicalSection) majorClinicalSection.classList.remove('hidden');
      if (majorChartExplanationBox) majorChartExplanationBox.classList.remove('hidden');

      renderMajorHealthMeasurements(payload);
    }

    // Synchronize formal print report document
    updatePrintReport(result, payload, state.currentMode);

    if (resultsContainer) {
      resultsContainer.classList.remove('hidden');
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ==========================================
  // Formal Assessment Print & PDF Report Generation
  // ==========================================
  function updatePrintReport(result, payload, mode) {
    if (typeof document === 'undefined') return;

    const printDoc = document.getElementById('printReportDocument');
    if (!printDoc) return;

    const printDate = document.getElementById('printReportDate');
    const printTime = document.getElementById('printReportTime');
    const printModeText = document.getElementById('printReportModeText');
    const printAssessmentPill = document.getElementById('printAssessmentPill');

    const printResultCard = document.getElementById('printResultCard');
    const printResultIcon = document.getElementById('printResultIcon');
    const printResultHeadline = document.getElementById('printResultHeadline');
    const printResultSubtext = document.getElementById('printResultSubtext');

    const printMeasurementsHeader = document.getElementById('printMeasurementsHeader');
    const printMeasurementsBody = document.getElementById('printMeasurementsBody');
    const printIndicatorsHeader = document.getElementById('printIndicatorsHeader');
    const printIndicatorsBody = document.getElementById('printIndicatorsBody');

    const printVizChartWrap = document.getElementById('printVizChartWrap');
    const printVizLegendWrap = document.getElementById('printVizLegendWrap');
    const printVizNote = document.getElementById('printVizNote');

    // 1. Header Metadata
    const now = new Date();
    if (printDate) printDate.textContent = now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    if (printTime) printTime.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const isMajor = mode === 'major';
    const modeName = isMajor ? 'Extended Clinical Assessment' : 'Simple Assessment';
    if (printModeText) printModeText.textContent = modeName;
    if (printAssessmentPill) printAssessmentPill.textContent = modeName;

    // 2. Resolved Prediction Outcome
    const resolved = resolvePrediction(result);
    if (!resolved.valid) {
      if (printResultCard) printResultCard.className = 'print-result-card status-indeterminate';
      if (printResultHeadline) printResultHeadline.textContent = 'Assessment Status Undetermined';
      if (printResultSubtext) {
        printResultSubtext.textContent = 'The backend model prediction could not be verified deterministically from the response payload.';
      }
      if (printResultIcon) {
        printResultIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        `;
      }
    } else {
      const isPos = resolved.isPositive;
      if (printResultCard) {
        printResultCard.className = `print-result-card ${isPos ? 'status-positive' : 'status-negative'}`;
      }
      if (printResultHeadline) {
        printResultHeadline.textContent = isPos ? 'Heart Disease Detected' : 'No Heart Disease Detected';
      }
      if (printResultSubtext) {
        printResultSubtext.textContent = isPos
          ? 'The statistical classification model predicted a positive cardiovascular risk status based on the submitted feature inputs.'
          : 'The statistical classification model predicted a negative cardiovascular risk status based on the submitted feature inputs.';
      }
      if (printResultIcon) {
        if (isPos) {
          printResultIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          `;
        } else {
          printResultIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
        }
      }
    }

    // 3. Submitted Assessment Tables
    if (isMajor) {
      if (printMeasurementsHeader) printMeasurementsHeader.textContent = 'Clinical Measurements';
      if (printIndicatorsHeader) printIndicatorsHeader.textContent = 'Clinical & Electrocardiographic Indicators';

      // Check cholesterol missingness
      const rawChol = payload ? payload.Cholesterol : null;
      const hasChol = !(rawChol === null || rawChol === undefined || rawChol === '' || parseFloat(rawChol) === 0 || isNaN(parseFloat(rawChol)));
      const cholDisplay = hasChol ? `${payload.Cholesterol} mg/dL` : '<span class="print-val-not-provided">Not provided</span>';

      const ageVal = payload && payload.Age !== undefined ? `${payload.Age} yrs` : 'Not provided';
      const rbpVal = payload && payload.RestingBP !== undefined ? `${payload.RestingBP} mmHg` : 'Not provided';
      const maxHrVal = payload && payload.MaxHR !== undefined ? `${payload.MaxHR} bpm` : 'Not provided';
      const oldpeakVal = payload && payload.Oldpeak !== undefined ? `${payload.Oldpeak} mm` : 'Not provided';

      if (printMeasurementsBody) {
        printMeasurementsBody.innerHTML = `
          <tr>
            <td>Age</td>
            <td>${ageVal}</td>
            <td>Dataset P5–P95: 37.0 – 68.0 yrs</td>
          </tr>
          <tr>
            <td>Resting Blood Pressure</td>
            <td>${rbpVal}</td>
            <td>Dataset P5–P95: 107.6 – 160.0 mmHg</td>
          </tr>
          <tr>
            <td>Serum Cholesterol</td>
            <td>${cholDisplay}</td>
            <td>Dataset P5–P95: 165.2 – 339.8 mg/dL</td>
          </tr>
          <tr>
            <td>Maximum Heart Rate (MaxHR)</td>
            <td>${maxHrVal}</td>
            <td>Dataset P5–P95: 96.0 – 178.0 bpm</td>
          </tr>
          <tr>
            <td>ST Depression (Oldpeak)</td>
            <td>${oldpeakVal}</td>
            <td>Dataset P5–P95: 0.0 – 3.0 mm</td>
          </tr>
        `;
      }

      // Map Major Categorical Indicators
      const sexMap = { 'M': 'Male', 'F': 'Female' };
      const sexVal = payload && sexMap[payload.Sex] ? sexMap[payload.Sex] : (payload && payload.Sex ? payload.Sex : 'Not provided');

      const cptMap = {
        'ASY': 'Asymptomatic (ASY)',
        'NAP': 'Non-Anginal Pain (NAP)',
        'ATA': 'Atypical Angina (ATA)',
        'TA': 'Typical Angina (TA)'
      };
      const cptVal = payload && cptMap[payload.ChestPainType] ? cptMap[payload.ChestPainType] : (payload && payload.ChestPainType ? payload.ChestPainType : 'Not provided');

      const fbsVal = payload && (payload.FastingBS === 1 || payload.FastingBS === '1')
        ? '> 120 mg/dL (Elevated)'
        : '≤ 120 mg/dL (Normal)';

      const ecgMap = {
        'Normal': 'Normal',
        'ST': 'ST-T Wave Abnormality (ST)',
        'LVH': 'Left Ventricular Hypertrophy (LVH)'
      };
      const ecgVal = payload && ecgMap[payload.RestingECG] ? ecgMap[payload.RestingECG] : (payload && payload.RestingECG ? payload.RestingECG : 'Normal');

      const anginaVal = payload && (payload.ExerciseAngina === 'Y' || payload.ExerciseAngina === '1')
        ? 'Yes (Angina Induced)'
        : 'No (No Angina)';

      const slopeMap = {
        'Up': 'Upsloping (Up)',
        'Flat': 'Flat',
        'Down': 'Downsloping (Down)'
      };
      const slopeVal = payload && slopeMap[payload.ST_Slope] ? slopeMap[payload.ST_Slope] : (payload && payload.ST_Slope ? payload.ST_Slope : 'Flat');

      if (printIndicatorsBody) {
        printIndicatorsBody.innerHTML = `
          <tr>
            <td>Biological Sex</td>
            <td>${sexVal}</td>
          </tr>
          <tr>
            <td>Chest Pain Type</td>
            <td>${cptVal}</td>
          </tr>
          <tr>
            <td>Fasting Blood Sugar</td>
            <td>${fbsVal}</td>
          </tr>
          <tr>
            <td>Resting ECG</td>
            <td>${ecgVal}</td>
          </tr>
          <tr>
            <td>Exercise-Induced Angina</td>
            <td>${anginaVal}</td>
          </tr>
          <tr>
            <td>ST Slope</td>
            <td>${slopeVal}</td>
          </tr>
        `;
      }

      // Major Visualization & Legend
      if (printVizChartWrap && majorRadarSvg) {
        printVizChartWrap.innerHTML = majorRadarSvg.outerHTML;
      }

      if (printVizLegendWrap) {
        printVizLegendWrap.innerHTML = `
          <div class="print-legend-grid">
            <div class="print-legend-item">
              <span class="print-legend-title">Age</span>
              <span class="print-legend-val">${ageVal}</span>
              <span class="print-legend-ref">P5: 37.0 – P95: 68.0 yrs</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Resting BP</span>
              <span class="print-legend-val">${rbpVal}</span>
              <span class="print-legend-ref">P5: 107.6 – P95: 160.0 mmHg</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Cholesterol</span>
              <span class="print-legend-val">${hasChol ? `${payload.Cholesterol} mg/dL` : 'Not provided'}</span>
              <span class="print-legend-ref">P5: 165.2 – P95: 339.8 mg/dL</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Max Heart Rate</span>
              <span class="print-legend-val">${maxHrVal}</span>
              <span class="print-legend-ref">P5: 96.0 – P95: 178.0 bpm</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Oldpeak (ST Dep)</span>
              <span class="print-legend-val">${oldpeakVal}</span>
              <span class="print-legend-ref">P5: 0.0 – P95: 3.0 mm (≤ 0 at centre)</span>
            </div>
          </div>
        `;
      }

      if (printVizNote) {
        printVizNote.textContent = 'The chart visualizes your submitted clinical measurements relative to reference ranges from the Major Assessment training dataset. Measurements at or below the lower reference boundary (such as negative Oldpeak values) are plotted at the centre (≤ 0.0 mm). Refer to the submitted values table for exact measurements.';
      }

    } else {
      // Minor Assessment (Simple Assessment)
      if (printMeasurementsHeader) printMeasurementsHeader.textContent = 'Health Measurements';
      if (printIndicatorsHeader) printIndicatorsHeader.textContent = 'Lifestyle & Additional Indicators';

      const heightM = payload && payload.height ? (parseFloat(payload.height) / 100) : 0;
      const weightKg = payload && payload.weight ? parseFloat(payload.weight) : 0;
      const bmiCalc = (heightM > 0 && weightKg > 0) ? (weightKg / (heightM * heightM)).toFixed(1) : '--';

      const ageVal = payload && payload.age !== undefined ? `${payload.age} yrs` : 'Not provided';
      const sexVal = payload && payload.gender === 2 ? 'Male' : (payload && payload.gender === 1 ? 'Female' : 'Not provided');
      const heightVal = payload && payload.height !== undefined ? `${payload.height} cm` : 'Not provided';
      const weightVal = payload && payload.weight !== undefined ? `${payload.weight} kg` : 'Not provided';
      const sysVal = payload && payload.ap_hi !== undefined ? `${payload.ap_hi} mmHg` : 'Not provided';
      const diaVal = payload && payload.ap_lo !== undefined ? `${payload.ap_lo} mmHg` : 'Not provided';

      if (printMeasurementsBody) {
        printMeasurementsBody.innerHTML = `
          <tr>
            <td>Age</td>
            <td>${ageVal}</td>
            <td>Dataset P5–P95: 41.2 – 63.7 yrs</td>
          </tr>
          <tr>
            <td>Biological Sex</td>
            <td>${sexVal}</td>
            <td>Baseline Demographic</td>
          </tr>
          <tr>
            <td>Standing Height</td>
            <td>${heightVal}</td>
            <td>General Population</td>
          </tr>
          <tr>
            <td>Body Weight</td>
            <td>${weightVal}</td>
            <td>General Population</td>
          </tr>
          <tr>
            <td>Body Mass Index (BMI)</td>
            <td>${bmiCalc} kg/m²</td>
            <td>Dataset P5–P95: 20.9 – 37.3 kg/m²</td>
          </tr>
          <tr>
            <td>Systolic Blood Pressure</td>
            <td>${sysVal}</td>
            <td>Dataset P5–P95: 100.0 – 160.0 mmHg</td>
          </tr>
          <tr>
            <td>Diastolic Blood Pressure</td>
            <td>${diaVal}</td>
            <td>Dataset P5–P95: 70.0 – 100.0 mmHg</td>
          </tr>
        `;
      }

      // Map Minor Categorical Indicators
      const cholMap = { 1: 'Normal', 2: 'Above normal', 3: 'Well above normal' };
      const cholVal = payload && cholMap[payload.cholesterol] ? cholMap[payload.cholesterol] : 'Normal';

      const glucMap = { 1: 'Normal', 2: 'Above normal', 3: 'Well above normal' };
      const glucVal = payload && glucMap[payload.gluc] ? glucMap[payload.gluc] : 'Normal';

      const smokeVal = payload && (payload.smoke === 1 || payload.smoke === '1') ? 'Yes (Active smoker)' : 'No (Non-smoker)';
      const alcoVal = payload && (payload.alco === 1 || payload.alco === '1') ? 'Yes (Drinks alcohol)' : 'No (Rarely or never)';
      const activeVal = payload && (payload.active === 1 || payload.active === '1') ? 'Active (Regular activity)' : 'Inactive';

      if (printIndicatorsBody) {
        printIndicatorsBody.innerHTML = `
          <tr>
            <td>Serum Cholesterol</td>
            <td>${cholVal}</td>
          </tr>
          <tr>
            <td>Blood Glucose</td>
            <td>${glucVal}</td>
          </tr>
          <tr>
            <td>Active Smoking</td>
            <td>${smokeVal}</td>
          </tr>
          <tr>
            <td>Alcohol Intake</td>
            <td>${alcoVal}</td>
          </tr>
          <tr>
            <td>Physical Activity</td>
            <td>${activeVal}</td>
          </tr>
        `;
      }

      // Minor Visualization & Legend
      if (printVizChartWrap && minorRadarSvg) {
        printVizChartWrap.innerHTML = minorRadarSvg.outerHTML;
      }

      if (printVizLegendWrap) {
        printVizLegendWrap.innerHTML = `
          <div class="print-legend-grid">
            <div class="print-legend-item">
              <span class="print-legend-title">Age</span>
              <span class="print-legend-val">${ageVal}</span>
              <span class="print-legend-ref">P5: 41.2 – P95: 63.7 yrs</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Body Mass Index</span>
              <span class="print-legend-val">${bmiCalc} kg/m²</span>
              <span class="print-legend-ref">P5: 20.9 – P95: 37.3 kg/m²</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Systolic BP</span>
              <span class="print-legend-val">${sysVal}</span>
              <span class="print-legend-ref">P5: 100.0 – P95: 160.0 mmHg</span>
            </div>
            <div class="print-legend-item">
              <span class="print-legend-title">Diastolic BP</span>
              <span class="print-legend-val">${diaVal}</span>
              <span class="print-legend-ref">P5: 70.0 – P95: 100.0 mmHg</span>
            </div>
          </div>
        `;
      }

      if (printVizNote) {
        printVizNote.textContent = 'The chart visualizes your submitted measurements relative to reference ranges from the Minor Assessment training dataset. It does not represent medical risk, clinical thresholds, or the contribution of individual features to the model\'s prediction.';
      }
    }
  }

  // ==========================================
  // Major Assessment: Health Measurements Visualization
  // ==========================================
  function renderMajorHealthMeasurements(payload) {
    if (!majorRadarPolygon) return;

    // 1. Extract values
    const age = parseFloat(payload.Age) || 0;
    const restingBP = parseFloat(payload.RestingBP) || 0;
    const maxHR = parseFloat(payload.MaxHR) || 0;
    const oldpeak = typeof payload.Oldpeak === 'number' ? payload.Oldpeak : (parseFloat(payload.Oldpeak) || 0);

    // Check if Cholesterol was provided and > 0
    const rawChol = payload.Cholesterol;
    const hasChol = !(rawChol === null || rawChol === undefined || rawChol === '' || parseFloat(rawChol) === 0 || isNaN(parseFloat(rawChol)));
    const chol = hasChol ? parseFloat(rawChol) : 0;

    // 2. Reference percentiles (P5, P95 from cleaned heart.csv, 917 records)
    const ref = {
      age: { p5: 37.0, p95: 68.0 },
      rbp: { p5: 107.6, p95: 160.0 },
      chol: { p5: 165.25, p95: 339.75 },
      maxhr: { p5: 96.0, p95: 178.0 },
      oldpeak: { p5: 0.0, p95: 3.0 }
    };

    // 3. Normalization and clamping to 0-100%
    function calcNorm(val, p5, p95) {
      if (p95 === p5) return 50;
      const pct = ((val - p5) / (p95 - p5)) * 100;
      return Math.max(0, Math.min(100, pct));
    }

    const normAge = calcNorm(age, ref.age.p5, ref.age.p95);
    const normRBP = calcNorm(restingBP, ref.rbp.p5, ref.rbp.p95);
    const normChol = hasChol ? calcNorm(chol, ref.chol.p5, ref.chol.p95) : 0;
    const normMaxHR = calcNorm(maxHR, ref.maxhr.p5, ref.maxhr.p95);
    const normOldpeak = calcNorm(oldpeak, ref.oldpeak.p5, ref.oldpeak.p95);

    // 4. Radar geometry: Center (170, 170), Max Radius = 110
    const center = 170;
    const maxRadius = 110;

    // Angles for the 5 axes (degrees):
    // Age: -90° (Top)
    // RestingBP: -18° (Top-Right)
    // Cholesterol: 54° (Bottom-Right)
    // MaxHR: 126° (Bottom-Left)
    // Oldpeak: 198° (Top-Left)
    function getPoint(deg, normVal) {
      const rad = (deg * Math.PI) / 180;
      const r = (normVal / 100) * maxRadius;
      return {
        x: center + r * Math.cos(rad),
        y: center + r * Math.sin(rad)
      };
    }

    const pAge = getPoint(-90, normAge);
    const pRBP = getPoint(-18, normRBP);
    const pChol = hasChol ? getPoint(54, normChol) : null;
    const pMaxHR = getPoint(126, normMaxHR);
    const pOldpeak = getPoint(198, normOldpeak);

    // 5. Update Dynamic Polygon / Path and Vertex Dots
    if (hasChol) {
      // Complete 5-axis profile: Closed polygon path
      const d = `M ${pAge.x.toFixed(1)},${pAge.y.toFixed(1)} L ${pRBP.x.toFixed(1)},${pRBP.y.toFixed(1)} L ${pChol.x.toFixed(1)},${pChol.y.toFixed(1)} L ${pMaxHR.x.toFixed(1)},${pMaxHR.y.toFixed(1)} L ${pOldpeak.x.toFixed(1)},${pOldpeak.y.toFixed(1)} Z`;
      majorRadarPolygon.setAttribute('d', d);
      majorRadarPolygon.classList.remove('has-missing-axis');

      if (majorDotChol) {
        majorDotChol.style.display = '';
        majorDotChol.setAttribute('cx', pChol.x.toFixed(1));
        majorDotChol.setAttribute('cy', pChol.y.toFixed(1));
      }

      if (majorAxisLineChol) {
        majorAxisLineChol.classList.remove('axis-dashed-missing');
      }

      if (majorAxisLabelChol) {
        majorAxisLabelChol.textContent = 'Cholesterol';
      }

      if (majorRadarValChol) {
        majorRadarValChol.textContent = `${Math.round(chol)} mg/dL`;
        majorRadarValChol.classList.remove('not-provided');
      }
    } else {
      // Missing cholesterol: Open path drawing ONLY available adjacent segments
      // RestingBP -> Age -> Oldpeak -> MaxHR (leaving a visible gap across the Cholesterol axis)
      // RestingBP is NOT connected to MaxHR
      const d = `M ${pRBP.x.toFixed(1)},${pRBP.y.toFixed(1)} L ${pAge.x.toFixed(1)},${pAge.y.toFixed(1)} L ${pOldpeak.x.toFixed(1)},${pOldpeak.y.toFixed(1)} L ${pMaxHR.x.toFixed(1)},${pMaxHR.y.toFixed(1)}`;
      majorRadarPolygon.setAttribute('d', d);
      majorRadarPolygon.classList.add('has-missing-axis');

      if (majorDotChol) {
        majorDotChol.style.display = 'none';
      }

      if (majorAxisLineChol) {
        majorAxisLineChol.classList.add('axis-dashed-missing');
      }

      if (majorAxisLabelChol) {
        majorAxisLabelChol.textContent = 'Cholesterol (Not provided)';
      }

      if (majorRadarValChol) {
        majorRadarValChol.textContent = 'Not provided';
        majorRadarValChol.classList.add('not-provided');
      }
    }

    if (majorDotAge) {
      majorDotAge.setAttribute('cx', pAge.x.toFixed(1));
      majorDotAge.setAttribute('cy', pAge.y.toFixed(1));
    }
    if (majorDotRestingBP) {
      majorDotRestingBP.setAttribute('cx', pRBP.x.toFixed(1));
      majorDotRestingBP.setAttribute('cy', pRBP.y.toFixed(1));
    }
    if (majorDotMaxHR) {
      majorDotMaxHR.setAttribute('cx', pMaxHR.x.toFixed(1));
      majorDotMaxHR.setAttribute('cy', pMaxHR.y.toFixed(1));
    }
    if (majorDotOldpeak) {
      majorDotOldpeak.setAttribute('cx', pOldpeak.x.toFixed(1));
      majorDotOldpeak.setAttribute('cy', pOldpeak.y.toFixed(1));
    }

    // 6. Update Legend Values (Always actual submitted measurements)
    if (majorRadarValAge) majorRadarValAge.textContent = `${Math.round(age)} yrs`;
    if (majorRadarValRestingBP) majorRadarValRestingBP.textContent = `${Math.round(restingBP)} mmHg`;
    if (majorRadarValMaxHR) majorRadarValMaxHR.textContent = `${Math.round(maxHR)} bpm`;
    if (majorRadarValOldpeak) majorRadarValOldpeak.textContent = `${oldpeak.toFixed(1)} mm`;

    // 7. Update Categorical & Clinical Grid (6 cards)
    const sexMap = { M: 'Male', F: 'Female' };
    const chestPainMap = {
      ASY: 'Asymptomatic',
      NAP: 'Non-Anginal Pain',
      ATA: 'Atypical Angina',
      TA: 'Typical Angina'
    };
    const ecgMap = {
      Normal: 'Normal',
      ST: 'ST-T Wave Abnormality',
      LVH: 'Left Ventricular Hypertrophy'
    };
    const slopeMap = {
      Up: 'Upsloping',
      Flat: 'Flat',
      Down: 'Downsloping'
    };

    if (majorValSex) {
      majorValSex.textContent = sexMap[payload.Sex] || payload.Sex || '--';
    }
    if (majorValChestPainType) {
      majorValChestPainType.textContent = chestPainMap[payload.ChestPainType] || payload.ChestPainType || '--';
    }
    if (majorValFastingBS) {
      majorValFastingBS.textContent = parseInt(payload.FastingBS, 10) === 1 ? 'Elevated' : 'Normal';
    }
    if (majorValRestingECG) {
      majorValRestingECG.textContent = ecgMap[payload.RestingECG] || payload.RestingECG || '--';
    }
    if (majorValExerciseAngina) {
      majorValExerciseAngina.textContent = payload.ExerciseAngina === 'Y' ? 'Yes' : 'No';
    }
    if (majorValSTSlope) {
      majorValSTSlope.textContent = slopeMap[payload.ST_Slope] || payload.ST_Slope || '--';
    }
  }

  // ==========================================
  // Minor Assessment: Health Measurements Visualization
  // ==========================================
  function renderMinorHealthMeasurements(payload) {
    if (!minorRadarPolygon) return;

    // 1. Extract values
    const age = parseFloat(payload.age) || 0;
    const height = parseFloat(payload.height) || 170;
    const weight = parseFloat(payload.weight) || 70;
    const ap_hi = parseFloat(payload.ap_hi) || 120;
    const ap_lo = parseFloat(payload.ap_lo) || 80;

    // 2. Compute BMI: weight (kg) / (height (m))^2
    const heightM = height / 100;
    const bmi = heightM > 0 ? (weight / (heightM * heightM)) : 0;

    // 3. Dataset reference percentiles (P5, P95 from cleaned Minor dataset, 68,640 records)
    const ref = {
      age: { p5: 41.2, p95: 63.7 },
      bmi: { p5: 20.9, p95: 37.3 },
      sys: { p5: 100.0, p95: 160.0 },
      dia: { p5: 70.0, p95: 100.0 }
    };

    // 4. Normalization and clamping to 0-100%
    function calcNorm(val, p5, p95) {
      if (p95 === p5) return 50;
      const pct = ((val - p5) / (p95 - p5)) * 100;
      return Math.max(0, Math.min(100, pct));
    }

    const normAge = calcNorm(age, ref.age.p5, ref.age.p95);
    const normBmi = calcNorm(bmi, ref.bmi.p5, ref.bmi.p95);
    const normSys = calcNorm(ap_hi, ref.sys.p5, ref.sys.p95);
    const normDia = calcNorm(ap_lo, ref.dia.p5, ref.dia.p95);

    // 5. Radar geometry: Center (170, 170), Max Radius = 110
    const center = 170;
    const maxRadius = 110;

    const rAge = (normAge / 100) * maxRadius;
    const rBmi = (normBmi / 100) * maxRadius;
    const rSys = (normSys / 100) * maxRadius;
    const rDia = (normDia / 100) * maxRadius;

    // 4-axis points:
    // Age (Top, -90°): (170, 170 - rAge)
    // BMI (Right, 0°): (170 + rBmi, 170)
    // Systolic (Bottom, 90°): (170, 170 + rSys)
    // Diastolic (Left, 180°): (170 - rDia, 170)
    const pAge = { x: center, y: center - rAge };
    const pBmi = { x: center + rBmi, y: center };
    const pSys = { x: center, y: center + rSys };
    const pDia = { x: center - rDia, y: center };

    minorRadarPolygon.setAttribute(
      'points',
      `${pAge.x.toFixed(1)},${pAge.y.toFixed(1)} ${pBmi.x.toFixed(1)},${pBmi.y.toFixed(1)} ${pSys.x.toFixed(1)},${pSys.y.toFixed(1)} ${pDia.x.toFixed(1)},${pDia.y.toFixed(1)}`
    );

    if (minorDotAge) {
      minorDotAge.setAttribute('cx', pAge.x.toFixed(1));
      minorDotAge.setAttribute('cy', pAge.y.toFixed(1));
    }
    if (minorDotBMI) {
      minorDotBMI.setAttribute('cx', pBmi.x.toFixed(1));
      minorDotBMI.setAttribute('cy', pBmi.y.toFixed(1));
    }
    if (minorDotSys) {
      minorDotSys.setAttribute('cx', pSys.x.toFixed(1));
      minorDotSys.setAttribute('cy', pSys.y.toFixed(1));
    }
    if (minorDotDia) {
      minorDotDia.setAttribute('cx', pDia.x.toFixed(1));
      minorDotDia.setAttribute('cy', pDia.y.toFixed(1));
    }

    // 6. Update Legend Values (Always actual submitted measurements)
    if (minorRadarValAge) minorRadarValAge.textContent = `${Math.round(age)} yrs`;
    if (minorRadarValBMI) minorRadarValBMI.textContent = `${bmi.toFixed(1)} kg/m²`;
    if (minorRadarValSysBP) minorRadarValSysBP.textContent = `${Math.round(ap_hi)} mmHg`;
    if (minorRadarValDiaBP) minorRadarValDiaBP.textContent = `${Math.round(ap_lo)} mmHg`;

    // 7. Update Categorical & Lifestyle Grid
    const cholMap = { 1: 'Normal', 2: 'Above Normal', 3: 'Well Above Normal' };
    const glucMap = { 1: 'Normal', 2: 'Above Normal', 3: 'Well Above Normal' };

    if (minorValCholesterol) {
      minorValCholesterol.textContent = cholMap[payload.cholesterol] || `Level ${payload.cholesterol}`;
    }
    if (minorValGlucose) {
      minorValGlucose.textContent = glucMap[payload.gluc] || `Level ${payload.gluc}`;
    }
    if (minorValSmoke) {
      minorValSmoke.textContent = parseInt(payload.smoke, 10) === 1 ? 'Smoker' : 'Non-smoker';
    }
    if (minorValAlco) {
      minorValAlco.textContent = parseInt(payload.alco, 10) === 1 ? 'Regular' : 'Rarely or never';
    }
    if (minorValActive) {
      minorValActive.textContent = parseInt(payload.active, 10) === 1 ? 'Active' : 'Inactive';
    }
  }

  // ==========================================
  // Field Information Tooltips Popover
  // ==========================================
  function setupFieldTooltips() {
    const popover = document.getElementById('fieldTooltipPopover');
    const titleEl = document.getElementById('tooltipPopoverTitle');
    const descEl = document.getElementById('tooltipPopoverDesc');
    const rangeEl = document.getElementById('tooltipPopoverRange');
    const rangeBox = document.getElementById('tooltipPopoverRangeBox');
    const closeBtn = document.getElementById('tooltipPopoverClose');
    if (!popover || !titleEl || !descEl || !rangeEl) return;

    let activeBtn = null;
    let hideTimer = null;

    function showTooltip(btn) {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      activeBtn = btn;
      const title = btn.getAttribute('data-title') || 'Biomarker Information';
      const tip = btn.getAttribute('data-tip') || '';
      const range = btn.getAttribute('data-range') || '';

      titleEl.textContent = title;
      descEl.textContent = tip;
      if (range) {
        rangeEl.textContent = range;
        if (rangeBox) rangeBox.style.display = 'flex';
      } else {
        if (rangeBox) rangeBox.style.display = 'none';
      }

      popover.classList.remove('hidden');
      positionPopover(btn);
    }

    function hideTooltip() {
      popover.classList.add('hidden');
      activeBtn = null;
    }

    function positionPopover(btn) {
      const btnRect = btn.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const margin = 8;
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;

      // Center horizontally on button, clamped to screen margins
      let left = btnRect.left + scrollX + btnRect.width / 2 - popoverRect.width / 2;
      const minLeft = scrollX + 12;
      const maxLeft = scrollX + document.documentElement.clientWidth - popoverRect.width - 12;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;

      // Position above if possible, else below
      let top = btnRect.top + scrollY - popoverRect.height - margin;
      if (btnRect.top - popoverRect.height - margin < 10) {
        // Not enough space above, position below
        top = btnRect.bottom + scrollY + margin;
      }

      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    }

    const tooltipBtns = document.querySelectorAll('.info-tooltip-btn');
    tooltipBtns.forEach((btn) => {
      // Desktop Hover
      btn.addEventListener('mouseenter', () => {
        showTooltip(btn);
      });

      btn.addEventListener('mouseleave', () => {
        hideTimer = setTimeout(() => {
          hideTooltip();
        }, 180);
      });

      // Keyboard Focus
      btn.addEventListener('focus', () => {
        showTooltip(btn);
      });

      btn.addEventListener('blur', () => {
        hideTooltip();
      });

      // Mobile / Click Toggle
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeBtn === btn && !popover.classList.contains('hidden')) {
          hideTooltip();
        } else {
          showTooltip(btn);
        }
      });
    });

    // Keep tooltip open while hovering the popover itself
    popover.addEventListener('mouseenter', () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });

    popover.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        hideTooltip();
      }, 180);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideTooltip();
      });
    }

    // Dismiss on outside click
    document.addEventListener('click', (e) => {
      if (!popover.classList.contains('hidden') && !popover.contains(e.target)) {
        hideTooltip();
      }
    });

    // Dismiss on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popover.classList.contains('hidden')) {
        hideTooltip();
      }
    });

    // Reposition on window resize
    window.addEventListener('resize', () => {
      if (activeBtn && !popover.classList.contains('hidden')) {
        positionPopover(activeBtn);
      }
    });
  }

  // ==========================================
  // Modals & Glossaries
  // ==========================================
  function setupModals() {
    // Glossary Modal
    if (glossaryBtn && glossaryModal) {
      glossaryBtn.addEventListener('click', () => {
        glossaryModal.classList.remove('hidden');
      });

      if (closeGlossaryBtn) {
        closeGlossaryBtn.addEventListener('click', () => {
          glossaryModal.classList.add('hidden');
        });
      }

      if (dismissGlossaryBtn) {
        dismissGlossaryBtn.addEventListener('click', () => {
          glossaryModal.classList.add('hidden');
        });
      }
    }
  }

  // ==========================================
  // Toast Notification
  // ==========================================
  let toastTimer = null;
  function showToast(msg, type = 'info') {
    if (!toastNotification || !toastMessage) return;

    toastMessage.textContent = msg;
    toastNotification.className = `toast-notification toast-${type}`;
    toastNotification.classList.remove('hidden');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, 4000);
  }

  // Expose for testing & deterministic verification
  if (typeof window !== 'undefined') {
    window.resolvePrediction = resolvePrediction;
    window.displayResults = displayResults;
    window.updatePrintReport = updatePrintReport;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { resolvePrediction, displayResults, updatePrintReport };
  }

  // Launch on DOM Content Loaded (Browser runtime)
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof module === 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
