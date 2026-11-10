/**
 * CardioPredict ML - Frontend Application Logic
 * Integrates:
 * 1. Live Dynamic Heartbeat & Vascular Heatmap
 * 2. 360° Cardiac Biomarker Radar Chart
 * 3. Major Random Forest & Minor Keras Neural Network Backend Integration
 * 4. Apple Health-Style Interactive Dials & Cards
 * 5. Multi-Theme Switching (Clinical, Neon Dark, Sunset)
 */

(function () {
  'use strict';

  // --- Configuration & State ---
  const state = {
    currentMode: 'major', // 'major' | 'minor'
    apiBaseUrl: 'http://localhost:8000',
    useMockFallback: false,
    isSubmitting: false,
    lastResult: null
  };

  // --- DOM Element References ---
  const tabMajor = document.getElementById('tabMajor');
  const tabSimple = document.getElementById('tabSimple'); // Minor assessment tab
  const modeBanner = document.getElementById('modeBanner');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerText = document.getElementById('bannerText');

  const majorFieldsContainer = document.getElementById('majorFieldsContainer');
  const minorFieldsContainer = document.getElementById('minorFieldsContainer');
  const majorOnlySection = document.getElementById('majorOnlySection');

  const form = document.getElementById('assessmentForm');
  const resetBtn = document.getElementById('resetBtn');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const predictBtn = document.getElementById('predictBtn');
  const predictSpinner = document.getElementById('predictSpinner');

  // Interactive Controls (Major Model)
  const inputAge = document.getElementById('inputAge');
  const inputSex = document.getElementById('inputSex');
  const inputRestingBP = document.getElementById('inputRestingBP');
  const sliderRestingBP = document.getElementById('sliderRestingBP');
  const badgeRestingBP = document.getElementById('badgeRestingBP');

  const inputMaxHR = document.getElementById('inputMaxHR');
  const sliderMaxHR = document.getElementById('sliderMaxHR');
  const badgeMaxHR = document.getElementById('badgeMaxHR');
  const liveBpmValue = document.getElementById('liveBpmValue');
  const heartPulseGroup = document.getElementById('heartPulseGroup');
  const heartAura = document.getElementById('heartAura');
  const vascularStateDot = document.getElementById('vascularStateDot');
  const vascularStateText = document.getElementById('vascularStateText');

  const inputExerciseAngina = document.getElementById('inputExerciseAngina');
  const anginaPillGroup = document.getElementById('anginaPillGroup');

  const inputChestPainType = document.getElementById('inputChestPainType');
  const chestPainCardGrid = document.getElementById('chestPainCardGrid');

  const inputCholesterol = document.getElementById('inputCholesterol');
  const inputFastingBS = document.getElementById('inputFastingBS');
  const inputRestingECG = document.getElementById('inputRestingECG');
  const inputOldpeak = document.getElementById('inputOldpeak');
  const inputST_Slope = document.getElementById('inputST_Slope');

  // Minor Model Inputs
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

  // Results Section
  const resultsContainer = document.getElementById('resultsContainer');
  const resultModeBadge = document.getElementById('resultModeBadge');
  const resultTimestamp = document.getElementById('resultTimestamp');
  const statusCard = document.getElementById('statusCard');
  const statusIcon = document.getElementById('statusIcon');
  const statusHeadline = document.getElementById('statusHeadline');
  const statusSubtext = document.getElementById('statusSubtext');
  const scorePercentage = document.getElementById('scorePercentage');
  const scoreCaption = document.getElementById('scoreCaption');
  const scoreTierBadge = document.getElementById('scoreTierBadge');
  const gaugeProgress = document.getElementById('gaugeProgress');
  const generalExplanationText = document.getElementById('generalExplanationText');
  const featureImportanceList = document.getElementById('featureImportanceList');
  const closeResultsTopBtn = document.getElementById('closeResultsTopBtn');
  const performAnotherAssessmentBtn = document.getElementById('performAnotherAssessmentBtn');
  const printReportBtn = document.getElementById('printReportBtn');

  // Multi-Theme Switcher Elements
  const themeBtn = document.getElementById('themeBtn');
  const themeDropdown = document.getElementById('themeDropdown');
  const themeCurrentIcon = document.getElementById('themeCurrentIcon');
  const themeCurrentLabel = document.getElementById('themeCurrentLabel');
  const themeOptionButtons = document.querySelectorAll('.theme-option-btn');

  // Radar Chart Elements
  const radarPolygon = document.getElementById('radarPolygon');
  const radarValBP = document.getElementById('radarValBP');
  const radarValHR = document.getElementById('radarValHR');
  const radarValChol = document.getElementById('radarValChol');
  const radarValAngina = document.getElementById('radarValAngina');
  const radarValST = document.getElementById('radarValST');
  const radarStop1 = document.getElementById('radarStop1');

  // Modals & Navigation
  const glossaryBtn = document.getElementById('glossaryBtn');
  const glossaryModal = document.getElementById('glossaryModal');
  const closeGlossaryBtn = document.getElementById('closeGlossaryBtn');
  const dismissGlossaryBtn = document.getElementById('dismissGlossaryBtn');

  const apiConfigBtn = document.getElementById('apiConfigBtn');
  const apiModal = document.getElementById('apiModal');
  const closeApiBtn = document.getElementById('closeApiBtn');
  const saveApiBtn = document.getElementById('saveApiBtn');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const apiUrlInput = document.getElementById('apiUrlInput');
  const mockModeToggle = document.getElementById('mockModeToggle');

  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');
  const tooltipButtons = document.querySelectorAll('.info-tooltip-btn');

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  function init() {
    setupThemeSwitcher();
    setupEventListeners();
    setupInteractiveWidgets();
    updateModeUI();
    syncHeartPacing(130);
    updateRestingBPBadge(130);
    updateVascularTone();
  }

  // =========================================================================
  // MULTI-THEME SWITCHER
  // =========================================================================

  function setupThemeSwitcher() {
    const savedTheme = localStorage.getItem('cardioTheme') || 'clinical';
    applyTheme(savedTheme);

    if (themeBtn && themeDropdown) {
      themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('hidden');
      });

      themeOptionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const selected = btn.getAttribute('data-theme');
          applyTheme(selected);
          themeDropdown.classList.add('hidden');
          showToast(`Switched theme to ${btn.querySelector('strong').textContent}`);
        });
      });

      document.addEventListener('click', (e) => {
        if (!themeBtn.contains(e.target) && !themeDropdown.contains(e.target)) {
          themeDropdown.classList.add('hidden');
        }
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cardioTheme', theme);

    themeOptionButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });

    const icons = {
      clinical: '🩺',
      neon: '🌌',
      sunset: '🌅'
    };
    const labels = {
      clinical: 'Clinical',
      neon: 'Neon Dark',
      sunset: 'Sunset'
    };

    if (themeCurrentIcon) themeCurrentIcon.textContent = icons[theme] || '🎨';
    if (themeCurrentLabel) themeCurrentLabel.textContent = labels[theme] || 'Theme';
  }

  // =========================================================================
  // MODE SWITCHING (Major Random Forest vs Minor Keras Neural Network)
  // =========================================================================

  function setAssessmentMode(mode) {
    if (state.currentMode === mode) return;
    state.currentMode = mode;
    updateModeUI();
    clearValidationErrors();
    showToast(`Switched to ${mode === 'major' ? 'Major (Random Forest)' : 'Minor (Keras NN)'} Mode`);
  }

  function updateModeUI() {
    if (state.currentMode === 'major') {
      tabMajor.classList.add('active');
      tabSimple.classList.remove('active');

      if (majorFieldsContainer) majorFieldsContainer.classList.remove('hidden');
      if (minorFieldsContainer) minorFieldsContainer.classList.add('hidden');

      bannerTitle.textContent = 'Major Assessment Mode Active:';
      bannerText.textContent = 'Evaluating 11 clinical features (RestingBP, Serum Cholesterol, RestingECG, ST_Slope, Oldpeak, etc.) using the Major Random Forest model (Trained on Heart Disease UCI Dataset).';

      // Set required attributes on major fields
      ['Age', 'Sex', 'RestingBP', 'MaxHR', 'ExerciseAngina', 'ChestPainType', 'FastingBS', 'RestingECG', 'Oldpeak', 'ST_Slope'].forEach(id => {
        const el = document.getElementById('input' + id);
        if (el) el.required = true;
      });
      // Cholesterol is optional in major model (imputed with median)
      if (inputCholesterol) inputCholesterol.required = false;

      // Unrequire minor fields
      ['inputMinorAge', 'inputMinorGender', 'inputMinorHeight', 'inputMinorWeight', 'inputMinorApHi', 'inputMinorApLo', 'inputMinorCholesterol', 'inputMinorGluc', 'inputMinorSmoke', 'inputMinorAlco', 'inputMinorActive'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = false;
      });
    } else {
      tabMajor.classList.remove('active');
      tabSimple.classList.add('active');

      if (majorFieldsContainer) majorFieldsContainer.classList.add('hidden');
      if (minorFieldsContainer) minorFieldsContainer.classList.remove('hidden');

      bannerTitle.textContent = 'Minor Assessment Mode Active:';
      bannerText.textContent = 'Evaluating 11 demographic, biometric, and lifestyle indicators (Age, Gender, Height, Weight, Systolic/Diastolic BP, Cholesterol, Glucose, Smoking, Alcohol, Activity) using the Minor Keras Neural Network model.';

      // Unrequire major fields
      ['Age', 'Sex', 'RestingBP', 'MaxHR', 'ExerciseAngina', 'ChestPainType', 'Cholesterol', 'FastingBS', 'RestingECG', 'Oldpeak', 'ST_Slope'].forEach(id => {
        const el = document.getElementById('input' + id);
        if (el) el.required = false;
      });

      // Require minor fields
      ['inputMinorAge', 'inputMinorGender', 'inputMinorHeight', 'inputMinorWeight', 'inputMinorApHi', 'inputMinorApLo', 'inputMinorCholesterol', 'inputMinorGluc', 'inputMinorSmoke', 'inputMinorAlco', 'inputMinorActive'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = true;
      });
    }
  }

  // =========================================================================
  // INTERACTIVE WIDGETS & DYNAMIC PACING
  // =========================================================================

  function setupInteractiveWidgets() {
    // 1. RestingBP Slider & Input Sync
    if (sliderRestingBP && inputRestingBP) {
      sliderRestingBP.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        inputRestingBP.value = val;
        updateRestingBPBadge(val);
        updateVascularTone();
      });

      inputRestingBP.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) || 120;
        if (val >= 80 && val <= 200) sliderRestingBP.value = val;
        updateRestingBPBadge(val);
        updateVascularTone();
      });
    }

    // 2. MaxHR Slider & Live Heartbeat Sync
    if (sliderMaxHR && inputMaxHR) {
      sliderMaxHR.addEventListener('input', (e) => {
        const bpm = parseInt(e.target.value);
        inputMaxHR.value = bpm;
        syncHeartPacing(bpm);
      });

      inputMaxHR.addEventListener('input', (e) => {
        const bpm = parseInt(e.target.value) || 120;
        if (bpm >= 60 && bpm <= 210) sliderMaxHR.value = bpm;
        syncHeartPacing(bpm);
      });
    }

    // 3. Exercise Angina Segmented Pill Toggle
    if (anginaPillGroup && inputExerciseAngina) {
      const anginaButtons = anginaPillGroup.querySelectorAll('.segment-btn');
      anginaButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-val');
          inputExerciseAngina.value = val;

          anginaButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          updateVascularTone();
        });
      });
    }

    // 4. Chest Pain Type Interactive Cards
    if (chestPainCardGrid && inputChestPainType) {
      const chestCards = chestPainCardGrid.querySelectorAll('.chest-card');
      chestCards.forEach(card => {
        card.addEventListener('click', () => {
          const val = card.getAttribute('data-val');
          inputChestPainType.value = val;

          chestCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');

          const group = document.getElementById('group-ChestPainType');
          if (group) group.classList.remove('has-error');

          updateVascularTone();
        });
      });
    }
  }

  function syncHeartPacing(bpm) {
    const safeBpm = Math.max(50, Math.min(220, bpm));
    if (liveBpmValue) liveBpmValue.textContent = safeBpm;
    if (badgeMaxHR) badgeMaxHR.textContent = `Pacing Heart: ${safeBpm} BPM`;

    const durationSec = (60 / safeBpm).toFixed(2);
    if (heartPulseGroup) {
      heartPulseGroup.style.animationDuration = `${durationSec}s`;
    }
  }

  function updateRestingBPBadge(val) {
    if (!badgeRestingBP) return;
    if (val < 120) {
      badgeRestingBP.className = 'dial-badge badge-optimal';
      badgeRestingBP.textContent = `Normal (${val} mmHg)`;
    } else if (val <= 139) {
      badgeRestingBP.className = 'dial-badge badge-elevated';
      badgeRestingBP.textContent = `Pre-Hypertension (${val})`;
    } else {
      badgeRestingBP.className = 'dial-badge badge-high';
      badgeRestingBP.textContent = `Hypertension (${val} mmHg)`;
    }
  }

  function updateVascularTone() {
    const bp = parseInt(inputRestingBP?.value) || 120;
    const angina = inputExerciseAngina?.value === 'Y';
    const chestPain = inputChestPainType?.value;

    const isHighStress = bp >= 140 && angina;
    const isModerateWarning = bp >= 135 || angina || chestPain === 'TA';

    const realisticHeartImg = document.getElementById('realisticHeartImg');

    if (isHighStress) {
      if (vascularStateDot) vascularStateDot.className = 'state-dot stress';
      if (vascularStateText) vascularStateText.textContent = 'High Vascular Strain';
      if (heartPulseGroup) heartPulseGroup.style.filter = 'drop-shadow(0 0 18px rgba(239, 68, 68, 0.8))';
      if (realisticHeartImg) realisticHeartImg.style.filter = 'drop-shadow(0 0 25px rgba(239, 68, 68, 0.9)) saturate(1.3)';
    } else if (isModerateWarning) {
      if (vascularStateDot) vascularStateDot.className = 'state-dot warning';
      if (vascularStateText) vascularStateText.textContent = 'Borderline Resistance';
      if (heartPulseGroup) heartPulseGroup.style.filter = 'drop-shadow(0 0 14px rgba(245, 158, 11, 0.6))';
      if (realisticHeartImg) realisticHeartImg.style.filter = 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.7)) saturate(1.15)';
    } else {
      if (vascularStateDot) vascularStateDot.className = 'state-dot optimal';
      if (vascularStateText) vascularStateText.textContent = 'Optimal Vascular Tone';
      if (heartPulseGroup) heartPulseGroup.style.filter = 'none';
      if (realisticHeartImg) realisticHeartImg.style.filter = '';
    }
  }

  // =========================================================================
  // 360° CARDIAC BIOMARKER RADAR CHART GENERATOR
  // =========================================================================

  function renderCardiacRadarChart(inputs, mode) {
    if (!radarPolygon) return;

    let scoreBP = 0.35;
    let scoreHR = 0.35;
    let scoreChol = 0.35;
    let scoreAngina = 0.25;
    let scoreST = 0.25;

    let bpLabel = '';
    let hrLabel = '';
    let cholLabel = '';
    let anginaLabel = '';
    let stLabel = '';

    if (mode === 'major') {
      const bp = parseFloat(inputs.RestingBP) || 120;
      const maxHr = parseFloat(inputs.MaxHR) || 140;
      const chol = inputs.Cholesterol !== null && inputs.Cholesterol !== undefined && inputs.Cholesterol !== '' ? parseFloat(inputs.Cholesterol) : 200;
      const angina = inputs.ExerciseAngina === 'Y';
      const stSlope = inputs.ST_Slope || 'Up';
      const oldpeak = parseFloat(inputs.Oldpeak) || 0;

      scoreBP = Math.min(0.95, Math.max(0.2, (bp - 90) / (180 - 90)));
      scoreHR = Math.min(0.95, Math.max(0.2, (190 - maxHr) / (190 - 80)));
      scoreChol = Math.min(0.95, Math.max(0.2, (chol - 120) / (340 - 120)));
      scoreAngina = angina ? 0.92 : 0.22;

      if (stSlope === 'Down' || oldpeak >= 2.0) scoreST = 0.92;
      else if (stSlope === 'Flat' || oldpeak >= 1.0) scoreST = 0.72;
      else scoreST = 0.25;

      bpLabel = `${bp} mm Hg (${scoreBP > 0.6 ? 'Elevated' : 'Normal'})`;
      hrLabel = `${maxHr} bpm (${maxHr < 125 ? 'Blunted' : 'Good Reserve'})`;
      cholLabel = inputs.Cholesterol ? `${chol} mg/dL` : 'Imputed (Median)';
      anginaLabel = angina ? 'Induced (Positive)' : 'Absent (Negative)';
      stLabel = `${stSlope} / ${oldpeak}mm`;
    } else {
      // Minor Model inputs
      const sysBP = parseFloat(inputs.ap_hi) || 120;
      const diaBP = parseFloat(inputs.ap_lo) || 80;
      const height = parseFloat(inputs.height) || 165;
      const weight = parseFloat(inputs.weight) || 70;
      const bmi = weight / Math.pow(height / 100, 2);
      const cholTier = parseInt(inputs.cholesterol) || 1;
      const glucTier = parseInt(inputs.gluc) || 1;
      const isSmoker = inputs.smoke === 1 || inputs.smoke === '1';
      const isDrinker = inputs.alco === 1 || inputs.alco === '1';
      const isActive = inputs.active === 1 || inputs.active === '1';

      scoreBP = Math.min(0.95, Math.max(0.2, (sysBP - 90) / (180 - 90)));
      scoreHR = Math.min(0.95, Math.max(0.2, (bmi - 18.5) / (38 - 18.5)));
      scoreChol = cholTier === 3 ? 0.92 : (cholTier === 2 ? 0.65 : 0.25);
      scoreAngina = (isSmoker && isDrinker) ? 0.92 : ((isSmoker || isDrinker) ? 0.65 : 0.22);
      scoreST = (!isActive || glucTier === 3) ? 0.85 : (glucTier === 2 ? 0.55 : 0.25);

      bpLabel = `${sysBP}/${diaBP} mm Hg (${sysBP >= 140 ? 'High' : 'Normal'})`;
      hrLabel = `BMI: ${bmi.toFixed(1)} kg/m² (${bmi >= 25 ? 'Overweight' : 'Normal'})`;
      cholLabel = `Tier ${cholTier} (${cholTier === 1 ? 'Normal' : cholTier === 2 ? 'Above Normal' : 'High'})`;
      anginaLabel = isSmoker ? (isDrinker ? 'Smoker & Drinker' : 'Smoker') : (isDrinker ? 'Alcohol Intake' : 'Non-Smoker');
      stLabel = `Glucose Tier ${glucTier} / ${isActive ? 'Active' : 'Sedentary'}`;
    }

    const scores = [scoreBP, scoreHR, scoreChol, scoreAngina, scoreST];
    const centerX = 170;
    const centerY = 170;
    const maxRadius = 120;

    const points = scores.map((val, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const r = maxRadius * val;
      const x = (centerX + r * Math.cos(angle)).toFixed(1);
      const y = (centerY + r * Math.sin(angle)).toFixed(1);
      return `${x},${y}`;
    });

    radarPolygon.setAttribute('points', points.join(' '));

    if (radarValBP) radarValBP.textContent = bpLabel;
    if (radarValHR) radarValHR.textContent = hrLabel;
    if (radarValChol) radarValChol.textContent = cholLabel;
    if (radarValAngina) radarValAngina.textContent = anginaLabel;
    if (radarValST) radarValST.textContent = stLabel;

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore > 0.55) {
      radarPolygon.style.stroke = '#ef4444';
      if (radarStop1) radarStop1.setAttribute('stop-color', 'rgba(239, 68, 68, 0.65)');
    } else {
      radarPolygon.style.stroke = '#10b981';
      if (radarStop1) radarStop1.setAttribute('stop-color', 'rgba(16, 185, 129, 0.5)');
    }
  }

  // =========================================================================
  // INPUT VALIDATION (Strict match with backend validation_service.py)
  // =========================================================================

  const MAJOR_BOUNDS = {
    Age: { min: 18, max: 120, label: 'Age' },
    RestingBP: { min: 50, max: 260, label: 'Resting Blood Pressure' },
    MaxHR: { min: 40, max: 250, label: 'Maximum Heart Rate' },
    Oldpeak: { min: -5.0, max: 10.0, label: 'Oldpeak (ST Depression)' }
  };

  const MAJOR_CATEGORICALS = {
    Sex: ['M', 'F'],
    ChestPainType: ['ATA', 'NAP', 'ASY', 'TA'],
    RestingECG: ['Normal', 'ST', 'LVH'],
    ExerciseAngina: ['Y', 'N'],
    ST_Slope: ['Up', 'Flat', 'Down'],
    FastingBS: ['0', '1', 0, 1]
  };

  const MINOR_BOUNDS = {
    age: { min: 18, max: 120, label: 'Age (in years)' },
    height: { min: 100, max: 250, label: 'Height (cm)' },
    weight: { min: 30, max: 300, label: 'Weight (kg)' },
    ap_hi: { min: 50, max: 260, label: 'Systolic Blood Pressure (ap_hi)' },
    ap_lo: { min: 30, max: 180, label: 'Diastolic Blood Pressure (ap_lo)' }
  };

  const MINOR_CATEGORICALS = {
    gender: ['1', '2', 1, 2],
    cholesterol: ['1', '2', '3', 1, 2, 3],
    gluc: ['1', '2', '3', 1, 2, 3],
    smoke: ['0', '1', 0, 1],
    alco: ['0', '1', 0, 1],
    active: ['0', '1', 0, 1]
  };

  function validateFormData(data, mode) {
    const errors = {};

    if (mode === 'major') {
      const requiredMajor = [
        'Age', 'Sex', 'ChestPainType', 'RestingBP', 'FastingBS',
        'RestingECG', 'MaxHR', 'ExerciseAngina', 'Oldpeak', 'ST_Slope'
      ];

      requiredMajor.forEach(f => {
        if (data[f] === undefined || data[f] === null || data[f] === '') {
          errors[f] = `Field '${f}' is required.`;
        }
      });

      for (const [f, b] of Object.entries(MAJOR_BOUNDS)) {
        if (data[f] !== undefined && data[f] !== null && data[f] !== '') {
          const num = parseFloat(data[f]);
          if (isNaN(num)) {
            errors[f] = `${b.label} must be a valid number.`;
          } else if (num < b.min || num > b.max) {
            errors[f] = `${b.label} must be between ${b.min} and ${b.max}.`;
          }
        }
      }

      if (data.Cholesterol !== undefined && data.Cholesterol !== null && data.Cholesterol !== '') {
        const cholNum = parseFloat(data.Cholesterol);
        if (isNaN(cholNum)) {
          errors.Cholesterol = 'Cholesterol must be a valid number or empty.';
        } else if (cholNum < 0 || cholNum > 800) {
          errors.Cholesterol = 'Cholesterol must be between 0 and 800 mg/dL.';
        }
      }

      for (const [f, allowed] of Object.entries(MAJOR_CATEGORICALS)) {
        if (data[f] !== undefined && data[f] !== null && data[f] !== '') {
          if (!allowed.includes(data[f])) {
            errors[f] = `Invalid selection for ${f}.`;
          }
        }
      }
    } else {
      // Minor mode validation
      const requiredMinor = [
        'age', 'gender', 'height', 'weight', 'ap_hi', 'ap_lo',
        'cholesterol', 'gluc', 'smoke', 'alco', 'active'
      ];

      requiredMinor.forEach(f => {
        if (data[f] === undefined || data[f] === null || data[f] === '') {
          errors[f] = `Field '${f}' is required.`;
        }
      });

      for (const [f, b] of Object.entries(MINOR_BOUNDS)) {
        if (data[f] !== undefined && data[f] !== null && data[f] !== '') {
          const num = parseFloat(data[f]);
          if (isNaN(num)) {
            errors[f] = `${b.label} must be a valid number.`;
          } else if (num < b.min || num > b.max) {
            errors[f] = `${b.label} must be between ${b.min} and ${b.max}.`;
          }
        }
      }

      // Diastolic must be lower than systolic
      if (data.ap_hi && data.ap_lo && !errors.ap_hi && !errors.ap_lo) {
        const hi = parseFloat(data.ap_hi);
        const lo = parseFloat(data.ap_lo);
        if (lo >= hi) {
          errors.ap_lo = 'Diastolic blood pressure (ap_lo) must be lower than systolic (ap_hi).';
        }
      }

      for (const [f, allowed] of Object.entries(MINOR_CATEGORICALS)) {
        if (data[f] !== undefined && data[f] !== null && data[f] !== '') {
          if (!allowed.includes(data[f])) {
            errors[f] = `Invalid selection for ${f}.`;
          }
        }
      }
    }

    return errors;
  }

  function displayValidationErrors(errors) {
    clearValidationErrors();
    const errorKeys = Object.keys(errors);
    if (errorKeys.length === 0) return true;

    errorKeys.forEach(fieldKey => {
      const group = document.getElementById(`group-${fieldKey}`);
      const errorSpan = document.getElementById(`error-${fieldKey}`);
      if (group) group.classList.add('has-error');
      if (errorSpan) errorSpan.textContent = errors[fieldKey];
    });

    const firstGroup = document.getElementById(`group-${errorKeys[0]}`);
    if (firstGroup) {
      firstGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showToast(`Please check ${errorKeys.length} highlighted field(s).`);
    return false;
  }

  function clearValidationErrors() {
    document.querySelectorAll('.form-group.has-error').forEach(group => {
      group.classList.remove('has-error');
    });
    document.querySelectorAll('.field-error').forEach(span => {
      span.textContent = '';
    });
  }

  function resetForm() {
    form.reset();
    clearValidationErrors();
    resultsContainer.classList.add('hidden');

    // Reset Major Widgets
    if (sliderRestingBP && inputRestingBP) {
      sliderRestingBP.value = 130;
      inputRestingBP.value = 130;
      updateRestingBPBadge(130);
    }

    if (sliderMaxHR && inputMaxHR) {
      sliderMaxHR.value = 130;
      inputMaxHR.value = 130;
      syncHeartPacing(130);
    }

    if (inputExerciseAngina && anginaPillGroup) {
      inputExerciseAngina.value = 'N';
      anginaPillGroup.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-val') === 'N');
      });
    }

    if (inputChestPainType && chestPainCardGrid) {
      inputChestPainType.value = 'ASY';
      chestPainCardGrid.querySelectorAll('.chest-card').forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-val') === 'ASY');
      });
    }

    updateVascularTone();
    showToast('Form reset to default state.');
  }

  // Quick Sample Profiles for Major & Minor modes
  const sampleProfiles = {
    major: {
      highRisk: {
        Age: 58,
        Sex: 'M',
        RestingBP: 152,
        MaxHR: 112,
        ExerciseAngina: 'Y',
        ChestPainType: 'ASY',
        Cholesterol: 285,
        FastingBS: '1',
        RestingECG: 'ST',
        Oldpeak: 2.2,
        ST_Slope: 'Flat'
      },
      lowRisk: {
        Age: 42,
        Sex: 'F',
        RestingBP: 118,
        MaxHR: 172,
        ExerciseAngina: 'N',
        ChestPainType: 'ATA',
        Cholesterol: 195,
        FastingBS: '0',
        RestingECG: 'Normal',
        Oldpeak: 0.0,
        ST_Slope: 'Up'
      }
    },
    minor: {
      highRisk: {
        age: 58,
        gender: '2',
        height: 168,
        weight: 88,
        ap_hi: 155,
        ap_lo: 95,
        cholesterol: '3',
        gluc: '2',
        smoke: '1',
        alco: '1',
        active: '0'
      },
      lowRisk: {
        age: 38,
        gender: '1',
        height: 165,
        weight: 60,
        ap_hi: 115,
        ap_lo: 75,
        cholesterol: '1',
        gluc: '1',
        smoke: '0',
        alco: '0',
        active: '1'
      }
    }
  };

  let currentSampleToggle = false;
  function loadSampleData() {
    currentSampleToggle = !currentSampleToggle;
    const mode = state.currentMode;
    const profile = currentSampleToggle ? sampleProfiles[mode].highRisk : sampleProfiles[mode].lowRisk;

    if (mode === 'major') {
      for (const [key, val] of Object.entries(profile)) {
        const input = document.getElementById(`input${key}`);
        if (input) input.value = val;
      }

      if (sliderRestingBP) sliderRestingBP.value = profile.RestingBP;
      updateRestingBPBadge(profile.RestingBP);

      if (sliderMaxHR) sliderMaxHR.value = profile.MaxHR;
      syncHeartPacing(profile.MaxHR);

      if (anginaPillGroup) {
        anginaPillGroup.querySelectorAll('.segment-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-val') === profile.ExerciseAngina);
        });
      }

      if (chestPainCardGrid) {
        chestPainCardGrid.querySelectorAll('.chest-card').forEach(card => {
          card.classList.toggle('active', card.getAttribute('data-val') === profile.ChestPainType);
        });
      }

      updateVascularTone();
    } else {
      if (inputMinorAge) inputMinorAge.value = profile.age;
      if (inputMinorGender) inputMinorGender.value = profile.gender;
      if (inputMinorHeight) inputMinorHeight.value = profile.height;
      if (inputMinorWeight) inputMinorWeight.value = profile.weight;
      if (inputMinorApHi) inputMinorApHi.value = profile.ap_hi;
      if (inputMinorApLo) inputMinorApLo.value = profile.ap_lo;
      if (inputMinorCholesterol) inputMinorCholesterol.value = profile.cholesterol;
      if (inputMinorGluc) inputMinorGluc.value = profile.gluc;
      if (inputMinorSmoke) inputMinorSmoke.value = profile.smoke;
      if (inputMinorAlco) inputMinorAlco.value = profile.alco;
      if (inputMinorActive) inputMinorActive.value = profile.active;
    }

    clearValidationErrors();
    showToast(`Loaded ${mode === 'major' ? 'Major' : 'Minor'} ${currentSampleToggle ? 'High-Risk' : 'Low-Risk'} profile.`);
  }

  // =========================================================================
  // MODEL PREDICTION & INTELLIGENT BACKEND INTEGRATION
  // =========================================================================

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (state.isSubmitting) return;

    // 1. Gather raw inputs from active container
    const rawData = {};
    if (state.currentMode === 'major') {
      rawData.Age = inputAge ? inputAge.value.trim() : '';
      rawData.Sex = inputSex ? inputSex.value.trim() : '';
      rawData.ChestPainType = inputChestPainType ? inputChestPainType.value.trim() : '';
      rawData.RestingBP = inputRestingBP ? inputRestingBP.value.trim() : '';
      rawData.Cholesterol = inputCholesterol ? inputCholesterol.value.trim() : '';
      rawData.FastingBS = inputFastingBS ? inputFastingBS.value.trim() : '';
      rawData.RestingECG = inputRestingECG ? inputRestingECG.value.trim() : '';
      rawData.MaxHR = inputMaxHR ? inputMaxHR.value.trim() : '';
      rawData.ExerciseAngina = inputExerciseAngina ? inputExerciseAngina.value.trim() : '';
      rawData.Oldpeak = inputOldpeak ? inputOldpeak.value.trim() : '';
      rawData.ST_Slope = inputST_Slope ? inputST_Slope.value.trim() : '';
    } else {
      rawData.age = inputMinorAge ? inputMinorAge.value.trim() : '';
      rawData.gender = inputMinorGender ? inputMinorGender.value.trim() : '';
      rawData.height = inputMinorHeight ? inputMinorHeight.value.trim() : '';
      rawData.weight = inputMinorWeight ? inputMinorWeight.value.trim() : '';
      rawData.ap_hi = inputMinorApHi ? inputMinorApHi.value.trim() : '';
      rawData.ap_lo = inputMinorApLo ? inputMinorApLo.value.trim() : '';
      rawData.cholesterol = inputMinorCholesterol ? inputMinorCholesterol.value.trim() : '';
      rawData.gluc = inputMinorGluc ? inputMinorGluc.value.trim() : '';
      rawData.smoke = inputMinorSmoke ? inputMinorSmoke.value.trim() : '';
      rawData.alco = inputMinorAlco ? inputMinorAlco.value.trim() : '';
      rawData.active = inputMinorActive ? inputMinorActive.value.trim() : '';
    }

    // 2. Validate client-side
    const errors = validateFormData(rawData, state.currentMode);
    if (Object.keys(errors).length > 0) {
      displayValidationErrors(errors);
      return;
    }

    clearValidationErrors();
    setLoadingState(true);

    // 3. Build typed JSON payload for backend
    let typedPayload = {};
    if (state.currentMode === 'major') {
      typedPayload = {
        Age: Number(rawData.Age),
        Sex: rawData.Sex,
        ChestPainType: rawData.ChestPainType,
        RestingBP: Number(rawData.RestingBP),
        Cholesterol: rawData.Cholesterol === '' ? null : Number(rawData.Cholesterol),
        FastingBS: Number(rawData.FastingBS),
        RestingECG: rawData.RestingECG,
        MaxHR: Number(rawData.MaxHR),
        ExerciseAngina: rawData.ExerciseAngina,
        Oldpeak: Number(rawData.Oldpeak),
        ST_Slope: rawData.ST_Slope
      };
    } else {
      typedPayload = {
        age: Number(rawData.age),
        gender: Number(rawData.gender),
        height: Number(rawData.height),
        weight: Number(rawData.weight),
        ap_hi: Number(rawData.ap_hi),
        ap_lo: Number(rawData.ap_lo),
        cholesterol: Number(rawData.cholesterol),
        gluc: Number(rawData.gluc),
        smoke: Number(rawData.smoke),
        alco: Number(rawData.alco),
        active: Number(rawData.active)
      };
    }

    try {
      let result;
      if (state.useMockFallback) {
        await new Promise(r => setTimeout(r, 400));
        result = simulateModelInference(typedPayload, state.currentMode);
      } else {
        const endpoint = `${state.apiBaseUrl}/predict/${state.currentMode}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typedPayload)
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => null);
          if (response.status === 400 && errJson && errJson.details) {
            displayValidationErrors(errJson.details);
            throw new Error('Validation failed on backend server.');
          }
          throw new Error(errJson && errJson.error ? errJson.error : `HTTP ${response.status}`);
        }

        result = await response.json();
      }

      displayResults(result, state.currentMode, typedPayload);
      renderCardiacRadarChart(typedPayload, state.currentMode);
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Risk estimation completed successfully.');
    } catch (err) {
      console.error('Prediction request failed:', err);
      if (state.useMockFallback) {
        const fallbackResult = simulateModelInference(typedPayload, state.currentMode);
        displayResults(fallbackResult, state.currentMode, typedPayload);
        renderCardiacRadarChart(typedPayload, state.currentMode);
        showToast('Backend offline: Simulated inference executed.');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        showToast(`Request Error: ${err.message}`);
      }
    } finally {
      setLoadingState(false);
    }
  }

  function simulateModelInference(data, mode) {
    if (mode === 'major') {
      let logOdds = -1.8;
      const age = parseFloat(data.Age) || 50;
      logOdds += (age - 53) * 0.045;
      if (data.Sex === 'M') logOdds += 1.35; else logOdds -= 0.65;
      const rbp = parseFloat(data.RestingBP) || 120;
      if (rbp > 140) logOdds += (rbp - 140) * 0.02;
      const maxHr = parseFloat(data.MaxHR) || 140;
      logOdds -= (maxHr - 135) * 0.032;
      if (data.ExerciseAngina === 'Y') logOdds += 1.45;
      if (data.ChestPainType === 'ASY') logOdds += 1.65;
      else if (data.ChestPainType === 'ATA') logOdds -= 1.3;
      else if (data.ChestPainType === 'NAP') logOdds -= 0.6;

      const chol = parseFloat(data.Cholesterol) || 200;
      if (chol > 240) logOdds += 0.35;
      if (data.FastingBS === 1) logOdds += 0.85;
      if (data.RestingECG === 'ST') logOdds += 0.45;
      else if (data.RestingECG === 'LVH') logOdds += 0.35;
      const oldpeak = parseFloat(data.Oldpeak) || 0;
      if (oldpeak > 1.0) logOdds += oldpeak * 0.8;
      if (data.ST_Slope === 'Flat') logOdds += 1.85;
      else if (data.ST_Slope === 'Down') logOdds += 1.95;
      else if (data.ST_Slope === 'Up') logOdds -= 1.8;

      const probability = 1 / (1 + Math.exp(-logOdds));
      const isPositive = probability >= 0.5;

      return {
        success: true,
        prediction: isPositive ? 1 : 0,
        predicted_status: isPositive ? 'Positive' : 'Negative',
        model_score: parseFloat(probability.toFixed(4)),
        model_type: 'Major Random Forest (Simulated)',
        disclaimer: 'This result is an experimental machine learning prediction, not a clinical or medical diagnosis.'
      };
    } else {
      // Minor model simulation
      let logOdds = -1.5;
      const age = parseFloat(data.age) || 50;
      logOdds += (age - 50) * 0.04;
      if (data.gender === 2) logOdds += 0.2;
      const bmi = (parseFloat(data.weight) || 70) / Math.pow((parseFloat(data.height) || 165) / 100, 2);
      if (bmi > 25) logOdds += (bmi - 25) * 0.08;
      const hi = parseFloat(data.ap_hi) || 120;
      if (hi > 130) logOdds += (hi - 130) * 0.035;
      if (data.cholesterol === 2) logOdds += 0.45;
      else if (data.cholesterol === 3) logOdds += 0.95;
      if (data.gluc === 2) logOdds += 0.35;
      else if (data.gluc === 3) logOdds += 0.8;
      if (data.smoke === 1) logOdds += 0.4;
      if (data.alco === 1) logOdds += 0.2;
      if (data.active === 0) logOdds += 0.3;

      const probability = 1 / (1 + Math.exp(-logOdds));
      const isPositive = probability >= 0.5;

      return {
        success: true,
        prediction: isPositive ? 1 : 0,
        predicted_status: isPositive ? 'Positive' : 'Negative',
        model_score: parseFloat(probability.toFixed(4)),
        model_type: 'Minor Keras Neural Network (Simulated)',
        disclaimer: 'This result is an experimental machine learning prediction, not a clinical or medical diagnosis.'
      };
    }
  }

  function displayResults(result, mode, inputs) {
    state.lastResult = { result, mode, inputs };

    if (resultModeBadge) {
      resultModeBadge.textContent = result.model_type || (mode === 'major' ? 'Major Random Forest' : 'Minor Keras Neural Network');
    }

    const now = new Date();
    if (resultTimestamp) {
      resultTimestamp.textContent = `Evaluated: ${now.toLocaleTimeString()} &bull; ${now.toLocaleDateString()}`;
    }

    const isPositive = result.prediction === 1;

    if (isPositive) {
      if (statusCard) statusCard.className = 'outcome-card status-card status-positive';
      if (statusIcon) {
        statusIcon.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        `;
      }
      if (statusHeadline) statusHeadline.textContent = 'Model Predicts Status: POSITIVE';
      if (statusSubtext) statusSubtext.textContent = 'The classifier detected characteristic patterns consistent with recorded heart disease.';
      if (scoreTierBadge) scoreTierBadge.textContent = 'Elevated Risk Tier';
    } else {
      if (statusCard) statusCard.className = 'outcome-card status-card status-negative';
      if (statusIcon) {
        statusIcon.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        `;
      }
      if (statusHeadline) statusHeadline.textContent = 'Model Predicts Status: NEGATIVE';
      if (statusSubtext) statusSubtext.textContent = 'The classifier did not detect patterns indicating recorded heart disease.';
      if (scoreTierBadge) scoreTierBadge.textContent = 'Low Risk Tier';
    }

    // Model Score calculation
    const rawScore = result.model_score !== undefined ? result.model_score : (result.score ? result.score / 100 : 0.5);
    const scoreVal = Math.round(rawScore * 100);

    if (scorePercentage) scorePercentage.textContent = `${scoreVal}%`;
    if (scoreCaption) scoreCaption.textContent = 'Model Score';

    const circumference = 314.16;
    const offset = circumference - (scoreVal / 100) * circumference;
    if (gaugeProgress) gaugeProgress.style.strokeDashoffset = offset;

    const disclaimerText = result.disclaimer || 'This result is an experimental machine learning prediction, not a clinical or medical diagnosis.';

    if (generalExplanationText) {
      generalExplanationText.innerHTML = `
        <p><strong>Predicted Status:</strong> <span style="color: ${isPositive ? '#ef4444' : '#10b981'}; font-weight: 700;">${result.predicted_status || (isPositive ? 'Positive' : 'Negative')}</span> &bull; <strong>Continuous Model Score:</strong> ${scoreVal}% (${rawScore.toFixed(4)})</p>
        <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #64748b;">
          <strong>Model Architecture:</strong> ${result.model_type || (mode === 'major' ? 'Major Random Forest' : 'Minor Keras Neural Network')}
        </p>
        <div style="margin-top: 0.75rem; padding: 0.6rem 0.8rem; background: rgba(239, 68, 68, 0.06); border-left: 3px solid #ef4444; border-radius: 4px; font-size: 0.8rem; color: #475569; font-style: italic;">
          <strong>Regulatory Disclaimer:</strong> ${disclaimerText}
        </div>
      `;
    }

    if (featureImportanceList) {
      featureImportanceList.innerHTML = '';
      if (result.feature_influences && result.feature_influences.length > 0) {
        result.feature_influences.forEach(item => {
          const isRisk = item.direction === 'risk';
          const barItem = document.createElement('div');
          barItem.className = 'feature-bar-item';
          barItem.innerHTML = `
            <div class="feature-bar-header">
              <span class="feature-bar-name">${item.feature}: <small style="font-weight: normal; color: #64748b;">${item.value}</small></span>
              <span class="feature-bar-value" style="color: ${isRisk ? '#dc2626' : '#059669'};">
                ${isRisk ? '+ Risk Factor' : '- Protective Factor'}
              </span>
            </div>
            <div class="feature-bar-track">
              <div class="feature-bar-fill ${isRisk ? 'risk-increase' : 'risk-decrease'}" style="width: ${item.weight}%;"></div>
            </div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.25rem;">${item.note}</div>
          `;
          featureImportanceList.appendChild(barItem);
        });
      } else {
        const infoDiv = document.createElement('div');
        infoDiv.style.padding = '0.85rem';
        infoDiv.style.background = '#f8fafc';
        infoDiv.style.borderRadius = '8px';
        infoDiv.style.border = '1px solid #e2e8f0';
        infoDiv.style.fontSize = '0.85rem';
        infoDiv.style.color = '#475569';
        infoDiv.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 0.4rem; color: #1e293b;">
            Evaluated Feature Vector (${mode === 'major' ? '11 Clinical Predictors' : '11 Biometric & Lifestyle Indicators'})
          </div>
          <p style="margin: 0; line-height: 1.5; color: #64748b;">
            ${mode === 'major'
              ? 'Age, Sex, ChestPainType, RestingBP, Cholesterol (median-imputed if empty), FastingBS, RestingECG, MaxHR, ExerciseAngina, Oldpeak, ST_Slope.'
              : 'Age (years), Gender (1: Female, 2: Male), Height (cm), Weight (kg), Systolic BP (ap_hi), Diastolic BP (ap_lo), Cholesterol category, Glucose category, Tobacco smoking, Alcohol intake, Physical activity.'}
          </p>
        `;
        featureImportanceList.appendChild(infoDiv);
      }
    }

    if (resultsContainer) resultsContainer.classList.remove('hidden');
  }

  function setLoadingState(loading) {
    state.isSubmitting = loading;
    if (loading) {
      if (predictBtn) {
        predictBtn.disabled = true;
        predictBtn.querySelector('.btn-arrow')?.classList.add('hidden');
        const textSpan = predictBtn.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = 'Estimating Risk...';
      }
      if (predictSpinner) predictSpinner.classList.remove('hidden');
    } else {
      if (predictBtn) {
        predictBtn.disabled = false;
        predictBtn.querySelector('.btn-arrow')?.classList.remove('hidden');
        const textSpan = predictBtn.querySelector('.btn-text');
        if (textSpan) textSpan.textContent = 'Run Risk Estimation';
      }
      if (predictSpinner) predictSpinner.classList.add('hidden');
    }
  }

  // =========================================================================
  // EVENT LISTENERS & MODALS
  // =========================================================================

  function setupEventListeners() {
    if (tabMajor) tabMajor.addEventListener('click', () => setAssessmentMode('major'));
    if (tabSimple) tabSimple.addEventListener('click', () => setAssessmentMode('minor'));

    if (form) form.addEventListener('submit', handleFormSubmit);
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
    if (loadSampleBtn) loadSampleBtn.addEventListener('click', loadSampleData);

    if (closeResultsTopBtn) {
      closeResultsTopBtn.addEventListener('click', () => {
        resultsContainer.classList.add('hidden');
      });
    }

    if (performAnotherAssessmentBtn) {
      performAnotherAssessmentBtn.addEventListener('click', () => {
        resultsContainer.classList.add('hidden');
        form.scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (glossaryBtn) glossaryBtn.addEventListener('click', () => glossaryModal.classList.remove('hidden'));
    if (closeGlossaryBtn) closeGlossaryBtn.addEventListener('click', () => glossaryModal.classList.add('hidden'));
    if (dismissGlossaryBtn) dismissGlossaryBtn.addEventListener('click', () => glossaryModal.classList.add('hidden'));

    if (apiConfigBtn) {
      apiConfigBtn.addEventListener('click', () => {
        if (apiUrlInput) apiUrlInput.value = state.apiBaseUrl;
        if (mockModeToggle) mockModeToggle.checked = state.useMockFallback;
        if (apiModal) apiModal.classList.remove('hidden');
      });
    }
    if (closeApiBtn) closeApiBtn.addEventListener('click', () => apiModal.classList.add('hidden'));

    if (saveApiBtn) {
      saveApiBtn.addEventListener('click', () => {
        if (apiUrlInput) state.apiBaseUrl = apiUrlInput.value.trim().replace(/\/$/, '');
        if (mockModeToggle) state.useMockFallback = mockModeToggle.checked;
        if (apiModal) apiModal.classList.add('hidden');
        showToast('API Settings Saved.');
      });
    }

    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', async () => {
        testConnectionBtn.disabled = true;
        testConnectionBtn.textContent = 'Testing...';
        try {
          const url = apiUrlInput ? apiUrlInput.value.trim().replace(/\/$/, '') : state.apiBaseUrl;
          const res = await fetch(`${url}/health`, { method: 'GET', signal: AbortSignal.timeout(3500) });
          if (res.ok) {
            const data = await res.json();
            showToast(`Connected: ${data.service} (Major: ${data.models?.major}, Minor: ${data.models?.minor})`, 4500);
          } else {
            showToast(`Server replied with status HTTP ${res.status}`);
          }
        } catch (e) {
          showToast('Could not reach server at this URL. Is backend running on port 8000?');
        } finally {
          testConnectionBtn.disabled = false;
          testConnectionBtn.textContent = 'Test Endpoint';
        }
      });
    }

    [glossaryModal, apiModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) modal.classList.add('hidden');
        });
      }
    });

    tooltipButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tip = btn.getAttribute('data-tip');
        if (tip) showToast(tip, 4500);
      });
    });

    // Clear error style when user inputs value
    if (form) {
      form.querySelectorAll('input, select').forEach(field => {
        field.addEventListener('input', () => {
          const group = field.closest('.form-group');
          if (group && group.classList.contains('has-error')) {
            group.classList.remove('has-error');
            const errorSpan = group.querySelector('.field-error');
            if (errorSpan) errorSpan.textContent = '';
          }
        });
      });
    }
  }

  let toastTimer = null;
  function showToast(msg, duration = 3200) {
    if (!toastNotification || !toastMessage) return;
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = msg;
    toastNotification.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      toastNotification.classList.add('hidden');
    }, duration);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
