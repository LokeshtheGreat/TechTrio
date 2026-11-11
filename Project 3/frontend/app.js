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
    currentMode: 'major', // 'major' | 'minor'
    apiBaseUrl: localStorage.getItem('cardiopredict_api_url') || 'http://localhost:8000',
    isSubmitting: false,
    lastResult: null,
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

  const apiConfigBtn = document.getElementById('apiConfigBtn');
  const apiModal = document.getElementById('apiModal');
  const closeApiBtn = document.getElementById('closeApiBtn');
  const apiUrlInput = document.getElementById('apiUrlInput');
  const saveApiBtn = document.getElementById('saveApiBtn');
  const testConnectionBtn = document.getElementById('testConnectionBtn');

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

  const scorePercentage = document.getElementById('scorePercentage');
  const scoreCaption = document.getElementById('scoreCaption');
  const scoreTierBadge = document.getElementById('scoreTierBadge');
  const gaugeProgress = document.getElementById('gaugeProgress');

  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const statusHeadline = document.getElementById('statusHeadline');
  const statusSubtext = document.getElementById('statusSubtext');

  const generalExplanationText = document.getElementById('generalExplanationText');
  const featureImportanceList = document.getElementById('featureImportanceList');

  // Radar Elements
  const radarPolygon = document.getElementById('radarPolygon');
  const radarValBP = document.getElementById('radarValBP');
  const radarValHR = document.getElementById('radarValHR');
  const radarValChol = document.getElementById('radarValChol');
  const radarValAngina = document.getElementById('radarValAngina');
  const radarValST = document.getElementById('radarValST');

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
    setAssessmentMode('major');
  }

  function setAssessmentMode(mode) {
    state.currentMode = mode;
    clearValidationErrors();

    if (mode === 'major') {
      if (tabMajor) tabMajor.classList.add('active');
      if (tabSimple) tabSimple.classList.remove('active');
      if (majorFieldsContainer) majorFieldsContainer.classList.remove('hidden');
      if (minorFieldsContainer) minorFieldsContainer.classList.add('hidden');
      if (majorOnlySection) majorOnlySection.classList.remove('hidden');

      if (bannerTitle) bannerTitle.textContent = 'Major Model Assessment Mode (Random Forest)';
      if (bannerText) bannerText.textContent = '11-feature clinical diagnostic screening evaluated against Cleveland/Statlog heart pathology parameters.';
    } else {
      if (tabSimple) tabSimple.classList.add('active');
      if (tabMajor) tabMajor.classList.remove('active');
      if (majorFieldsContainer) majorFieldsContainer.classList.add('hidden');
      if (minorFieldsContainer) minorFieldsContainer.classList.remove('hidden');
      if (majorOnlySection) majorOnlySection.classList.add('hidden');

      if (bannerTitle) bannerTitle.textContent = 'Minor Model Assessment Mode (Keras Neural Network)';
      if (bannerText) bannerText.textContent = '11-feature cardiovascular screening evaluated against Kaggle 70,000-patient cardiovascular indicators.';
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
      const cards = chestPainCardGrid.querySelectorAll('.chest-pain-card');
      cards.forEach((card) => {
        card.addEventListener('click', () => {
          cards.forEach((c) => c.classList.remove('active'));
          card.classList.add('active');
          const type = card.getAttribute('data-type');
          if (inputChestPainType) {
            inputChestPainType.value = type;
            clearFieldError('ChestPainType');
          }
        });
      });
    }

    // Angina Pill Group
    if (anginaPillGroup) {
      const pills = anginaPillGroup.querySelectorAll('.angina-pill');
      pills.forEach((pill) => {
        pill.addEventListener('click', () => {
          pills.forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
          const val = pill.getAttribute('data-value');
          if (inputExerciseAngina) {
            inputExerciseAngina.value = val;
            clearFieldError('ExerciseAngina');
          }
        });
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
        chestPainCardGrid.querySelectorAll('.chest-pain-card').forEach((c) => {
          c.classList.toggle('active', c.getAttribute('data-type') === 'ASY');
        });
      }
      if (inputChestPainType) inputChestPainType.value = 'ASY';

      // Exercise Angina Y
      if (anginaPillGroup) {
        anginaPillGroup.querySelectorAll('.angina-pill').forEach((p) => {
          p.classList.toggle('active', p.getAttribute('data-value') === 'Y');
        });
      }
      if (inputExerciseAngina) inputExerciseAngina.value = 'Y';

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
      chestPainCardGrid.querySelectorAll('.chest-pain-card').forEach((c) => c.classList.remove('active'));
    }
    if (anginaPillGroup) {
      anginaPillGroup.querySelectorAll('.angina-pill').forEach((p) => {
        p.classList.toggle('active', p.getAttribute('data-value') === 'N');
      });
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
        window.print();
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
        Cholesterol: cholVal === '' ? null : parseFloat(cholVal),
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
  // Display Assessment Results
  // ==========================================
  function displayResults(result, payload) {
    state.lastResult = result;

    if (resultModeBadge) {
      resultModeBadge.textContent = state.currentMode === 'major'
        ? 'Major Model (Random Forest)'
        : 'Minor Model (Keras Neural Network)';
    }

    if (resultTimestamp) {
      const now = new Date();
      resultTimestamp.textContent = `Evaluated: ${now.toLocaleTimeString()} • ${now.toLocaleDateString()}`;
    }

    const rawScore = typeof result.model_score === 'number' ? result.model_score : 0;
    const scorePct = (rawScore * 100).toFixed(1);

    if (scorePercentage) scorePercentage.textContent = `${scorePct}%`;
    if (scoreCaption) scoreCaption.textContent = 'Model Score';

    // Circular gauge stroke animation
    if (gaugeProgress) {
      const circumference = 251.2;
      const offset = circumference - (circumference * Math.min(1.0, Math.max(0, rawScore)));
      gaugeProgress.style.strokeDashoffset = offset;

      if (rawScore < 0.35) {
        gaugeProgress.style.stroke = 'var(--success-color, #10b981)';
      } else if (rawScore < 0.65) {
        gaugeProgress.style.stroke = 'var(--warning-color, #f59e0b)';
      } else {
        gaugeProgress.style.stroke = 'var(--danger-color, #ef4444)';
      }
    }

    // Model score classification tier (statistical model range, non-clinical)
    if (scoreTierBadge) {
      if (rawScore < 0.35) {
        scoreTierBadge.textContent = 'Low Model Score (0.00 – 0.34)';
        scoreTierBadge.className = 'score-tier-badge tier-low';
      } else if (rawScore < 0.65) {
        scoreTierBadge.textContent = 'Moderate Model Score (0.35 – 0.64)';
        scoreTierBadge.className = 'score-tier-badge tier-moderate';
      } else {
        scoreTierBadge.textContent = 'Elevated Model Score (0.65 – 1.00)';
        scoreTierBadge.className = 'score-tier-badge tier-high';
      }
    }

    // Predicted Status Card
    const isPositive = result.predicted_class === 1;
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
      statusHeadline.textContent = result.predicted_status || (isPositive ? 'Heart Disease Detected' : 'No Heart Disease Detected');
    }

    if (statusSubtext) {
      statusSubtext.textContent = isPositive
        ? 'The statistical classification model predicted a positive status based on the submitted feature inputs.'
        : 'The statistical classification model predicted a negative status based on the submitted feature inputs.';
    }

    // Context & Explanation Box (Zero-fabrication)
    if (generalExplanationText) {
      generalExplanationText.innerHTML = `
        <p><strong>Predicted Status:</strong> <span style="font-weight: 700; color: ${isPositive ? '#ef4444' : '#10b981'};">${result.predicted_status}</span> &bull; <strong>Continuous Model Score:</strong> ${scorePct}% (${rawScore.toFixed(4)})</p>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
          <strong>Model Pipeline:</strong> ${result.metadata && result.metadata.model_name ? result.metadata.model_name : (state.currentMode === 'major' ? 'Random Forest Classifier (scikit-learn)' : 'Multilayer Perceptron (Keras/TensorFlow)')}
        </p>
        <div style="margin-top: 0.75rem; padding: 0.6rem 0.85rem; background: rgba(239, 68, 68, 0.06); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 0.8rem; color: var(--text-primary); font-style: italic;">
          <strong>Regulatory Notice:</strong> ${result.disclaimer || 'This tool provides a machine-learning-assisted estimation and does not constitute a definitive medical diagnosis.'}
        </div>
      `;
    }

    // Evaluated Features Summary List (No fabricated SHAP weights)
    if (featureImportanceList) {
      featureImportanceList.innerHTML = '';
      const summaryContainer = document.createElement('div');
      summaryContainer.className = 'evaluated-features-grid';
      summaryContainer.style.display = 'grid';
      summaryContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
      summaryContainer.style.gap = '0.6rem';
      summaryContainer.style.marginTop = '0.5rem';

      for (const [key, val] of Object.entries(payload)) {
        const item = document.createElement('div');
        item.style.padding = '0.5rem 0.75rem';
        item.style.background = 'var(--card-bg, #1e293b)';
        item.style.border = '1px solid var(--border-color, #334155)';
        item.style.borderRadius = '6px';
        item.style.fontSize = '0.82rem';

        const displayVal = val === null ? 'Imputed (Median)' : val;
        item.innerHTML = `<span style="color: var(--text-muted);">${key}:</span> <strong style="color: var(--text-primary); float: right;">${displayVal}</strong>`;
        summaryContainer.appendChild(item);
      }
      featureImportanceList.appendChild(summaryContainer);
    }

    // Render 360° Radar Chart
    renderRadarChart(payload);

    if (resultsContainer) {
      resultsContainer.classList.remove('hidden');
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ==========================================
  // 360° Cardiac Biomarker Radar Chart
  // ==========================================
  function renderRadarChart(payload) {
    if (!radarPolygon) return;

    let bpScore = 0.5;
    let hrScore = 0.5;
    let cholScore = 0.5;
    let anginaScore = 0.0;
    let stScore = 0.5;

    if (state.currentMode === 'major') {
      const bp = parseFloat(payload.RestingBP) || 120;
      bpScore = Math.max(0.1, Math.min(1.0, (bp - 90) / 100));

      const hr = parseFloat(payload.MaxHR) || 140;
      hrScore = Math.max(0.1, Math.min(1.0, (hr - 70) / 130));

      const chol = parseFloat(payload.Cholesterol) || 200;
      cholScore = Math.max(0.1, Math.min(1.0, (chol - 120) / 260));

      anginaScore = payload.ExerciseAngina === 'Y' ? 0.95 : 0.15;

      const oldpeak = parseFloat(payload.Oldpeak) || 0;
      stScore = Math.max(0.1, Math.min(1.0, (oldpeak + 2.0) / 6.0));

      if (radarValBP) radarValBP.textContent = `${Math.round(bp)} mmHg`;
      if (radarValHR) radarValHR.textContent = `${Math.round(hr)} bpm`;
      if (radarValChol) radarValChol.textContent = `${Math.round(chol)} mg/dL`;
      if (radarValAngina) radarValAngina.textContent = payload.ExerciseAngina === 'Y' ? 'Positive' : 'None';
      if (radarValST) radarValST.textContent = `${oldpeak.toFixed(1)} mm`;
    } else {
      const bp = parseFloat(payload.ap_hi) || 120;
      bpScore = Math.max(0.1, Math.min(1.0, (bp - 90) / 90));

      const chol = parseInt(payload.cholesterol, 10) || 1;
      cholScore = chol === 1 ? 0.25 : (chol === 2 ? 0.65 : 0.95);

      const gluc = parseInt(payload.gluc, 10) || 1;
      hrScore = gluc === 1 ? 0.25 : (gluc === 2 ? 0.65 : 0.95);

      anginaScore = payload.smoke === 1 ? 0.85 : 0.15;
      stScore = payload.active === 1 ? 0.20 : 0.80;

      if (radarValBP) radarValBP.textContent = `${Math.round(bp)} mmHg`;
      if (radarValHR) radarValHR.textContent = `Gluc: ${gluc}`;
      if (radarValChol) radarValChol.textContent = `Chol: ${chol}`;
      if (radarValAngina) radarValAngina.textContent = payload.smoke === 1 ? 'Smoker' : 'Non-Smoker';
      if (radarValST) radarValST.textContent = payload.active === 1 ? 'Active' : 'Sedentary';
    }

    // 5-point radar polygon mapping
    const center = 150;
    const maxRadius = 110;
    const scores = [bpScore, hrScore, cholScore, anginaScore, stScore];
    const angles = [-90, -18, 54, 126, 198]; // 5 equally spaced angles in degrees

    const points = angles.map((deg, i) => {
      const rad = (deg * Math.PI) / 180;
      const r = maxRadius * scores[i];
      const x = center + r * Math.cos(rad);
      const y = center + r * Math.sin(rad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    radarPolygon.setAttribute('points', points.join(' '));
  }

  // ==========================================
  // Modals & API Configuration
  // ==========================================
  function setupModals() {
    // API Configuration Modal
    if (apiConfigBtn && apiModal) {
      apiConfigBtn.addEventListener('click', () => {
        if (apiUrlInput) apiUrlInput.value = state.apiBaseUrl;
        apiModal.classList.remove('hidden');
      });

      if (closeApiBtn) {
        closeApiBtn.addEventListener('click', () => {
          apiModal.classList.add('hidden');
        });
      }

      if (saveApiBtn) {
        saveApiBtn.addEventListener('click', () => {
          if (apiUrlInput) {
            const newUrl = apiUrlInput.value.trim().replace(/\/+$/, '');
            if (newUrl) {
              state.apiBaseUrl = newUrl;
              localStorage.setItem('cardiopredict_api_url', newUrl);
              showToast(`API endpoint saved: ${newUrl}`, 'success');
            }
          }
          apiModal.classList.add('hidden');
        });
      }

      if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', async () => {
          const testUrl = apiUrlInput ? apiUrlInput.value.trim().replace(/\/+$/, '') : state.apiBaseUrl;
          try {
            const resp = await fetch(`${testUrl}/health`);
            if (resp.ok) {
              const data = await resp.json();
              showToast(`Backend connection healthy (${data.status || 'OK'})`, 'success');
            } else {
              showToast(`Server returned HTTP ${resp.status}`, 'warning');
            }
          } catch (err) {
            showToast(`Connection failed: ${err.message}`, 'error');
          }
        });
      }
    }

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

  // Launch on DOM Content Loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
