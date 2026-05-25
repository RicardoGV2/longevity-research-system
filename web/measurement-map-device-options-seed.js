(() => {
  const KEY = "longevityResearchSystem.measurementMap.v0.1";
  const C = "€";
  const DATA = {
    scale: [
      ["RENPHO Smart Body Scale",29,4,3,5,4,5,3,"Best low-cost starter. Weight trend is useful; body-fat is trend-only."],
      ["Withings Body Smart",99,5,4,5,5,4,4,"Best balanced smart scale. Strong app/export ecosystem."],
      ["Garmin Index S2",149,4,3,4,5,3,4,"Good if already using Garmin; more expensive for similar trend use."]
    ],
    "tape-measure": [
      ["Basic soft measuring tape",5,3,3,4,1,5,5,"Cheapest option; accuracy depends on same landmark and tension."],
      ["RENPHO Smart Tape Measure",39,4,3,4,4,3,3,"Convenient app logging; placement still drives accuracy."],
      ["Locking body tape / MyoTape",15,4,4,5,1,4,5,"Best simple choice for measuring alone with repeatability."]
    ],
    "bp-monitor": [
      ["Omron M3 Comfort upper-arm",69,5,5,4,2,4,4,"Strong default home BP choice; upper-arm cuff."],
      ["Omron M7 Intelli IT",109,5,5,5,4,4,4,"Best connected option if Bluetooth history matters."],
      ["Withings BPM Connect",129,4,4,5,5,3,4,"Best app experience; verify cuff fit and validation needs."]
    ],
    abpm: [
      ["Pharmacy/clinic 24h ABPM rental",80,4,5,3,2,3,4,"Best first route if available locally."],
      ["Private GP 24h ABPM service",120,4,5,4,3,3,4,"Good if interpretation and report are included."],
      ["Cardiology clinic ABPM",180,5,5,4,3,2,4,"Best for abnormal readings or higher cardiac risk."]
    ],
    "pulse-oximeter": [
      ["Beurer PO 30",35,4,4,5,1,4,4,"Good basic fingertip oximeter for spot checks."],
      ["Beurer PO 60 Bluetooth",65,4,4,4,3,3,4,"Better if app logging matters."],
      ["Nonin Onyx Vantage 9590",220,5,5,5,1,2,5,"Clinical-grade option; probably overkill for baseline."]
    ],
    wearable: [
      ["Apple Watch SE / Series",279,4,4,5,5,5,4,"Best iPhone and Apple Health integration."],
      ["Garmin Forerunner 165",279,5,4,4,5,4,4,"Best training/battery balance for running and zones."],
      ["Oura Ring 4",399,5,4,5,4,3,4,"Best sleep comfort; remember subscription cost."]
    ],
    "chest-strap": [
      ["Polar H10",89,5,5,4,4,5,4,"Best general HR accuracy for training/testing."],
      ["Garmin HRM-Pro Plus",129,5,5,4,5,4,4,"Best if using Garmin; adds running dynamics."],
      ["Wahoo TICKR",49,4,4,4,4,4,4,"Cheaper Bluetooth/ANT+ HR tracking."]
    ],
    glucometer: [
      ["Accu-Chek Instant",25,4,4,5,3,5,4,"Good starter; strip cost matters most."],
      ["CONTOUR NEXT ONE",25,5,5,5,4,4,4,"Strong accuracy reputation and app support."],
      ["OneTouch Select Plus",20,4,4,5,2,5,4,"Basic and accessible if strips are easy to source."]
    ],
    cgm: [
      ["FreeStyle Libre 2 sensor",65,4,4,5,4,4,3,"Best short food-response experiment option if available."],
      ["Dexcom ONE+",80,4,4,4,4,3,3,"Alternative CGM; compare total sensor cost."],
      ["FreeStyle Libre 3",75,5,4,5,5,3,3,"Smaller/continuous option where available; verify notices."]
    ],
    ecg: [
      ["Clinic 12-lead resting ECG",60,5,5,4,2,4,5,"Best clinically interpretable baseline."],
      ["KardiaMobile 6L",169,4,4,5,4,3,4,"Good personal ECG snapshot; not a replacement for 12-lead."],
      ["Apple Watch ECG model",449,4,3,5,5,5,4,"Convenient rhythm snapshots if buying a watch anyway."]
    ],
    "stress-test": [
      ["Private exercise ECG test",250,4,5,3,2,3,5,"Best first cardiac stress assessment when indicated."],
      ["Stress echocardiogram",450,5,5,3,2,2,5,"More informative but more expensive."],
      ["Sports treadmill threshold test",150,3,3,4,3,3,4,"Useful for training zones; not a medical stress test."]
    ],
    cpet: [
      ["Sports science VO2 max test",180,4,4,4,3,3,4,"Good performance baseline; interpretation varies."],
      ["Clinical CPET",300,5,5,3,3,2,5,"Best for unexplained exercise limitation."],
      ["University/performance lab CPET",220,5,4,4,3,2,4,"Good if thresholds and clear zones are included."]
    ],
    dexa: [
      ["DXA body composition scan",150,4,4,5,2,3,4,"Best body composition trend if repeated on same machine."],
      ["DXA bone density scan",180,5,5,4,2,3,5,"Best for bone health questions or family risk."],
      ["BIA smart scale alternative",99,3,2,5,5,5,4,"Cheaper trends, less precise than DXA."]
    ],
    "sleep-study": [
      ["Home sleep apnea test",180,4,4,4,3,3,4,"Best first step for snoring/apnea/somnolence."],
      ["WatchPAT ONE home test",250,4,4,5,4,3,4,"Convenient if clinician interpretation is included."],
      ["Full polysomnography",650,5,5,2,2,2,5,"Most complete; expensive and for stronger indications."]
    ],
    "blood-panel": [
      ["Basic GP blood panel",80,4,4,4,2,5,5,"Good baseline: CBC, metabolic, lipids, glucose depending setup."],
      ["Private longevity/metabolic panel",220,5,4,4,3,4,4,"Better coverage: HbA1c, insulin, ApoB, hs-CRP, vitamin D, ferritin."],
      ["Advanced panel with omega-3/hormones",450,5,4,3,3,3,4,"Useful later only if each marker has a decision rule."]
    ],
    "air-monitor": [
      ["Aranet4 CO2 monitor",199,5,5,5,4,4,4,"Best focused CO2 monitor for ventilation experiments."],
      ["Airthings View Plus",299,5,4,4,5,3,4,"Best broad home air monitor: CO2/PM/VOC/radon depending model."],
      ["Qingping Air Monitor Lite",99,4,3,4,4,3,3,"Cheaper multi-sensor option; verify calibration/data export."]
    ],
    thermometer: [
      ["Beurer FT 13 digital thermometer",8,3,4,4,1,5,5,"Cheap reliable basic thermometer."],
      ["Braun ThermoScan 7",55,4,4,5,1,5,4,"Fast ear thermometer; technique and covers matter."],
      ["Withings Thermo",99,4,3,5,5,3,4,"Best app logging; expensive for occasional use."]
    ],
    "kitchen-scale": [
      ["Salter digital kitchen scale",15,4,4,5,1,5,5,"Best cheap starter for recipes and portions."],
      ["Etekcity food kitchen scale",20,4,4,5,1,4,5,"Good simple option; check max weight and tare usability."],
      ["Greater Goods nutrition scale",50,4,4,4,2,3,4,"More nutrition-focused; optional if using an app/database."]
    ],
    "grip-dynamometer": [
      ["Camry EH101 digital dynamometer",35,4,3,5,1,3,4,"Affordable home grip trend option."],
      ["Baseline hydraulic dynamometer",250,5,5,4,1,3,5,"Clinical physical-therapy option; durable."],
      ["Takei T.K.K. 5401 Grip-D",350,5,5,4,1,2,5,"Research/clinical standard; expensive for personal use."]
    ],
    "lux-meter": [
      ["Phone lux meter app",0,2,2,5,2,5,3,"Free rough comparison; not highly accurate."],
      ["UNI-T UT383BT lux meter",35,4,4,5,3,4,4,"Good low-cost meter with Bluetooth option."],
      ["Dr.meter LX1330B lux meter",25,4,4,4,1,4,4,"Cheap dedicated lux meter for indoor/outdoor comparison."]
    ],
    spirometer: [
      ["Mini-Wright peak flow meter",20,3,3,5,1,4,5,"Simple peak flow tracking, not full spirometry."],
      ["MIR Smart One spirometer",120,4,4,4,4,3,4,"Home spirometry-style option; technique matters."],
      ["Clinic spirometry",100,5,5,4,2,3,5,"Best if respiratory symptoms or asthma questions exist."]
    ],
    "rmr-test": [
      ["Clinic indirect calorimetry RMR",120,5,5,3,2,2,4,"Best direct RMR estimate when protocol is followed."],
      ["Lumen metabolism tracker",299,3,2,5,5,3,3,"Behavior feedback; not clinical RMR calorimetry."],
      ["University/sports lab RMR",150,5,5,3,2,2,4,"Good if report quality is strong and changes decisions."]
    ],
    "lactate-meter": [
      ["Lactate Plus meter",450,5,5,3,1,2,4,"Accurate but expensive; strips add cost."],
      ["Lactate Scout 4",400,5,5,3,2,2,4,"Strong sports testing option with structured protocol."],
      ["Edge Lactate meter",250,4,4,3,1,2,3,"Lower cost; verify strips and accuracy."]
    ]
  };

  function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
  function write(state) { state.updatedAt = new Date().toISOString(); localStorage.setItem(KEY, JSON.stringify(state)); }
  function optionFromArray(arr, selected) {
    return { id: uid(), name: arr[0], cost: String(arr[1]), currency: C, quality: String(arr[2]), accuracy: String(arr[3]), ease: String(arr[4]), dataExport: String(arr[5]), availability: String(arr[6]), privacy: String(arr[7]), notes: arr[8], selected };
  }
  function applySeed() {
    const state = read();
    const items = Array.isArray(state.items) ? state.items : [];
    let changed = false;
    Object.entries(DATA).forEach(([deviceId, options]) => {
      const item = items.find((entry) => entry.id === deviceId);
      if (!item) return;
      if (!Array.isArray(item.deviceOptions)) item.deviceOptions = [];
      options.forEach((raw, index) => {
        const exists = item.deviceOptions.some((option) => String(option.name || "").trim().toLowerCase() === raw[0].toLowerCase());
        if (!exists) { item.deviceOptions.push(optionFromArray(raw, index === 0)); changed = true; }
      });
      if (!item.deviceOptions.some((option) => option.selected) && item.deviceOptions[0]) { item.deviceOptions[0].selected = true; changed = true; }
    });
    if (changed) { state.items = items; write(state); window.dispatchEvent(new CustomEvent("measurementMapDeviceOptionsChanged")); }
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(applySeed, 600));
  applySeed();
})();
