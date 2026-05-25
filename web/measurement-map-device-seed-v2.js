(() => {
  const MAP_STORAGE_KEY = "longevityResearchSystem.measurementMap.v0.1";

  const PATCH_ITEMS = [
    {
      id: "bp-monitor",
      category: "Home device",
      name: "Home blood pressure monitor",
      type: "Device",
      priority: "High",
      status: "Need / pending",
      measures: "Home systolic pressure, diastolic pressure and pulse from spot readings.",
      use: "Use an upper-arm validated cuff. Sit quietly 5 minutes, feet on floor, cuff at heart level. Take 2 readings in the morning and evening during a 7-day baseline.",
      comparison: "This is not the same as 24-hour ambulatory blood pressure monitoring. Home monitors are practical for repeated tracking; ABPM is better for day/night pattern, white-coat hypertension and masked hypertension.",
      frequency: "7-day baseline, then periodic checks or whenever a change needs confirmation.",
      notes: "Core home cardiovascular device. Prefer upper-arm cuff over wrist cuff."
    },
    {
      id: "abpm",
      category: "Clinical / home study",
      name: "24-hour ambulatory blood pressure monitoring",
      type: "Study / Device",
      priority: "Conditional",
      status: "Research later",
      measures: "Blood pressure repeatedly across day, night and sleep, including nocturnal pressure and dipping pattern.",
      use: "Usually arranged through a clinic/pharmacy/GP. Wear the cuff for 24 hours while following normal routine. Use when home readings are high, inconsistent, suspicious or clinically relevant.",
      comparison: "More informative than a home cuff for white-coat hypertension, masked hypertension and night-time blood pressure, but less convenient and usually paid as a service.",
      frequency: "As indicated; not a daily tracker.",
      notes: "Separate from a normal home blood pressure monitor. Useful if home readings raise questions."
    },
    {
      id: "thermometer",
      category: "Home device",
      name: "Thermometer",
      type: "Device",
      priority: "Low",
      status: "Optional",
      measures: "Body temperature during illness, recovery or unusual fatigue.",
      use: "Use the same method and same time when comparing readings. Do not over-interpret small changes.",
      comparison: "Oral digital thermometers are usually enough. Ear/infrared thermometers are faster but can be more technique-sensitive.",
      frequency: "As needed.",
      notes: "Useful for context, not a core longevity metric."
    },
    {
      id: "kitchen-scale",
      category: "Nutrition device",
      name: "Kitchen food scale",
      type: "Device",
      priority: "High",
      status: "Need / pending",
      measures: "Food weight for recipe analysis, protein/fiber estimates and repeated meal experiments.",
      use: "Use tare function. Weigh ingredients during recipe experiments, not necessarily every meal forever.",
      comparison: "A simple 1 g precision scale is usually enough. App-connected scales are optional.",
      frequency: "During recipe experiments and selected 7-day logs.",
      notes: "High value for making nutrition experiments measurable."
    },
    {
      id: "grip-dynamometer",
      category: "Functional test device",
      name: "Grip strength dynamometer",
      type: "Device / Functional test",
      priority: "Medium",
      status: "Research later",
      measures: "Hand grip strength as a proxy for general strength and functional capacity.",
      use: "Use same hand position and protocol. Take 2–3 attempts per hand and record the best or average consistently.",
      comparison: "Digital dynamometers are easier to record; cheaper spring versions may be less consistent.",
      frequency: "Monthly or every training block.",
      notes: "Useful but not mandatory at the start."
    },
    {
      id: "lux-meter",
      category: "Environment device",
      name: "Light / lux meter",
      type: "Device / App",
      priority: "Low",
      status: "Optional",
      measures: "Light exposure intensity, especially morning light and indoor light levels.",
      use: "Use to compare morning outdoor light, indoor work light and winter exposure in Ireland.",
      comparison: "Phone apps can be enough for rough comparisons; dedicated meters are more consistent.",
      frequency: "Short experiment blocks or seasonal checks.",
      notes: "Useful for sleep/circadian experiments, especially in Ireland."
    },
    {
      id: "spirometer",
      category: "Respiratory device / study",
      name: "Spirometry / peak flow meter",
      type: "Device / Study",
      priority: "Conditional",
      status: "Research later",
      measures: "Basic lung function or peak expiratory flow depending on the device/test.",
      use: "Use if respiratory symptoms, asthma history, unusual breathlessness or clinical indication exists. Clinic spirometry is more reliable than casual home testing.",
      comparison: "Peak flow is simple and cheap; formal spirometry gives more complete information.",
      frequency: "As indicated.",
      notes: "Not needed unless respiratory questions appear."
    },
    {
      id: "rmr-test",
      category: "Nutrition / metabolic study",
      name: "Resting metabolic rate test",
      type: "Study",
      priority: "Advanced",
      status: "Research later",
      measures: "Estimated resting energy expenditure through indirect calorimetry.",
      use: "Done under protocol, usually fasted and rested. Useful if calorie estimates are uncertain or progress is confusing.",
      comparison: "More direct than formula estimates, but only useful if it changes nutrition decisions.",
      frequency: "Baseline or after major body composition change if justified.",
      notes: "Advanced; not required to start."
    },
    {
      id: "lactate-meter",
      category: "Exercise device",
      name: "Lactate meter",
      type: "Device",
      priority: "Advanced",
      status: "Research later",
      measures: "Blood lactate response during exercise for threshold estimation.",
      use: "Use only with a clear protocol. Requires strips, finger prick and interpretation.",
      comparison: "More detailed than HR zones, but more expensive and complex. CPET can be more complete.",
      frequency: "Specific training blocks only.",
      notes: "Probably not needed early."
    }
  ];

  function readState() {
    try { return JSON.parse(localStorage.getItem(MAP_STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function writeState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(state));
  }

  function mergePatch() {
    const state = readState();
    const items = Array.isArray(state.items) ? state.items : [];
    let changed = false;

    for (const patch of PATCH_ITEMS) {
      const existing = items.find((item) => item.id === patch.id);
      if (!existing) {
        items.push({ ...patch, photo: "", photoUrl: "" });
        changed = true;
        continue;
      }

      for (const [key, value] of Object.entries(patch)) {
        const current = String(existing[key] || "").trim();
        if (!current || key === "name" || key === "comparison" || key === "measures" || key === "use" || key === "frequency" || key === "notes") {
          if (existing[key] !== value) {
            existing[key] = value;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      state.items = items;
      writeState(state);
      window.dispatchEvent(new CustomEvent("measurementMapSeedUpdated"));
    }
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(mergePatch, 400));
  mergePatch();
})();
