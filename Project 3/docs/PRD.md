# Product Requirements Document (PRD)

## Project: ML-Based Heart Disease Risk Estimator
**Repository:** `TechTrio-Month-2` / `Project 3`  
**Status:** Pending Team Approval / Draft  
**Version:** 0.1.0  

---

## 1. Executive Summary
Brief summary of the heart disease risk estimator, its clinical/health objective, and core deliverables.

---

## 2. Objectives & Success Metrics
- **Primary Objective:** Provide accurate, interpretable heart disease risk assessment.
- **Key Performance Indicators (KPIs):**
  - Model Performance: ROC-AUC, Precision, Recall, F1-Score, Calibration.
  - Latency: Sub-second inference time.
  - Usability: Responsive, clear, and non-alarmist health guidance UI.

---

## 3. User Personas & Use Cases
- **General Users / Individuals:** Exploring personalized cardiovascular health risk metrics based on routine health indicators.
- **Healthcare Practitioners / Clinicians:** Quick screening and review of patient risk indicators.

---

## 4. System Architecture & Tech Stack
- **Frontend:** Interactive web client for input collection and visual risk presentation.
- **Backend:** REST API service orchestrating preprocessing, inference, and response serialization.
- **ML Pipeline:** Data cleaning, feature scaling/encoding, model training, cross-validation, and serialized artifacts.

---

## 5. Functional Requirements
- **FR-1 Input Collection:** Form fields for standard cardiovascular health metrics (e.g., age, sex, blood pressure, cholesterol, fasting blood sugar, restecg, max heart rate, exercise angina, etc.).
- **FR-2 Input Validation:** Client and server-side range checks and type validation.
- **FR-3 Risk Estimation:** Model scoring with interpretable risk category and confidence/score indicators.
- **FR-4 Explanation / Feature Impact:** Transparency into which factors contributed most to the assessment.

---

## 6. Non-Functional Requirements
- **Data Privacy:** Client input handling compliant with standard security practices; no persistent storage of personally identifiable health data without consent.
- **Interpretability & Disclaimers:** Explicit non-diagnostic disclaimer emphasizing that the tool provides statistical risk estimation, not formal medical diagnosis.
- **Reliability & Test Coverage:** Comprehensive unit and integration test coverage across ML inference, API endpoints, and UI components.

---

## 7. Approval & Sign-Off
- [ ] Product Lead: 
- [ ] ML Engineer: 
- [ ] Backend Engineer: 
- [ ] Frontend Engineer: 
