// Second Opinion - Gemini & GPT-Style Live Interactive Voice Engine (Pure Vanilla JS)

const STORAGE_KEYS = {
  USER: 'second_opinion_user',
  REPORTS: 'second_opinion_reports',
  CHAT_PREFIX: 'second_opinion_chat_',
  GROQ_KEY: 'second_opinion_groq_key',
  GEMINI_KEY: 'second_opinion_gemini_key',
  AI_PROVIDER: 'second_opinion_ai_provider'
};

// MANDATORY SAFETY DISCLAIMER
const MANDATORY_DISCLAIMER = {
  en: 'This is an educational explanation, not a medical diagnosis. Please discuss these test results with your doctor.',
  hi: 'यह एक शिक्षण व्याख्या है, चिकित्सीय निदान नहीं। कृपया इन जांच परिणामों पर अपने डॉक्टर से चर्चा करें।'
};

// SAMPLE DEMO REPORT
const DEMO_REPORT = {
  id: 'rep_demo_cbc_123',
  user_id: 'demo_patient_123',
  title: 'Complete Blood Count & Sugar Test Report',
  document_type: 'Blood Test',
  language: 'en',
  file_name: 'sample_blood_test.pdf',
  summary_explanation: 'Your blood test is overall stable. Here is what stands out: Your Hemoglobin (iron & oxygen carrying capacity) is slightly lower than ideal, and your Fasting Blood Sugar is slightly elevated. Your Platelets (blood clotting cells) are completely healthy and normal.',
  key_findings: [
    {
      id: 'f1',
      term: 'Hemoglobin (Hb)',
      original_value: '11.2 g/dL',
      reference_range: '12.0 - 15.5 g/dL',
      numeric_value: 11.2,
      min_ref: 12.0,
      max_ref: 15.5,
      gauge_percent: 22,
      is_normal: false,
      status: 'out_of_range',
      level_label: 'Slightly Low (Mild Deficiency)',
      plain_explanation: 'Hemoglobin carries oxygen in your blood. Your level (11.2) is slightly lower than normal (12.0 - 15.5). This can sometimes make you feel a bit tired.',
      what_to_ask_doctor: 'Ask your doctor if you should eat more iron-rich foods (like spinach or lentils) or take iron supplements.'
    },
    {
      id: 'f2',
      term: 'Fasting Blood Glucose',
      original_value: '104 mg/dL',
      reference_range: '70 - 99 mg/dL',
      numeric_value: 104,
      min_ref: 70,
      max_ref: 99,
      gauge_percent: 78,
      is_normal: false,
      status: 'out_of_range',
      level_label: 'Borderline High (Prediabetes range)',
      plain_explanation: 'This measures blood sugar after not eating overnight. 104 mg/dL is slightly higher than normal (70-99). It is not diabetes, but doctors call it borderline or prediabetes.',
      what_to_ask_doctor: 'Ask your doctor what daily diet changes or light walks can bring sugar back into normal range.'
    },
    {
      id: 'f3',
      term: 'Platelet Count',
      original_value: '220,000 /µL',
      reference_range: '150,000 - 450,000 /µL',
      numeric_value: 220000,
      min_ref: 150000,
      max_ref: 450000,
      gauge_percent: 50,
      is_normal: true,
      status: 'normal',
      level_label: 'Optimal & Healthy',
      plain_explanation: 'Platelets help stop bleeding when you get a cut. Your count is completely healthy and in the middle of normal range.',
      what_to_ask_doctor: null
    }
  ],
  unclear_flags: [
    'Doctor signature stamp slightly covered bottom lab notes on page 1.'
  ],
  disclaimer: MANDATORY_DISCLAIMER.en,
  created_at: new Date().toISOString()
};

// STORAGE MANAGER
const StorageManager = {
  getUser() {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  getGroqKey() {
    return localStorage.getItem(STORAGE_KEYS.GROQ_KEY) || '';
  },

  setGroqKey(key) {
    if (key) localStorage.setItem(STORAGE_KEYS.GROQ_KEY, key);
    else localStorage.removeItem(STORAGE_KEYS.GROQ_KEY);
  },

  getGeminiKey() {
    return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
  },

  setGeminiKey(key) {
    if (key) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key);
    else localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
  },

  getAIProvider() {
    return localStorage.getItem(STORAGE_KEYS.AI_PROVIDER) || 'auto';
  },

  setAIProvider(provider) {
    localStorage.setItem(STORAGE_KEYS.AI_PROVIDER, provider);
  },

  hasAnyAIKey() {
    return !!(this.getGroqKey() || this.getGeminiKey());
  },

  getReports() {
    const data = localStorage.getItem(STORAGE_KEYS.REPORTS);
    const reports = data ? JSON.parse(data) : [DEMO_REPORT];
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    }
    return reports;
  },

  getReportById(id) {
    const reports = this.getReports();
    return reports.find(r => r.id === id) || (id === DEMO_REPORT.id ? DEMO_REPORT : null);
  },

  saveReport(report) {
    const reports = this.getReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);
    if (existingIndex >= 0) {
      reports[existingIndex] = report;
    } else {
      reports.unshift(report);
    }
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  },

  deleteReport(id) {
    const reports = this.getReports().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    localStorage.removeItem(STORAGE_KEYS.CHAT_PREFIX + id);
  },

  getChatMessages(reportId) {
    const data = localStorage.getItem(STORAGE_KEYS.CHAT_PREFIX + reportId);
    return data ? JSON.parse(data) : [];
  },

  saveChatMessage(message) {
    const messages = this.getChatMessages(message.report_id);
    messages.push(message);
    localStorage.setItem(STORAGE_KEYS.CHAT_PREFIX + message.report_id, JSON.stringify(messages));
  },

  clearChat(reportId) {
    localStorage.removeItem(STORAGE_KEYS.CHAT_PREFIX + reportId);
  }
};

// MEDICAL DOCUMENT VALIDATOR (DETECTS NON-MEDICAL FILES LIKE TIMETABLES, RECEIPTS, NOTEPADS)
const DocumentValidator = {
  nonMedicalKeywords: [
    'timetable', 'schedule', 'routine', 'class', 'lecture', 'calendar', 'invoice',
    'receipt', 'bill', 'ticket', 'flight', 'reservation', 'resume', 'cv', 'passport',
    'license', 'assignment', 'homework', 'syllabus', 'agenda', 'menu', 'restaurant'
  ],

  validateFile(file) {
    if (!file) return { isValid: false, reason: 'No file selected.' };

    const name = file.name.toLowerCase();
    const isNonMedicalFilename = this.nonMedicalKeywords.some(kw => name.includes(kw));

    if (isNonMedicalFilename) {
      return {
        isValid: false,
        reason: `Non-Medical File Detected ("${file.name}"): This file appears to be a timetable, schedule, or non-medical document. Please upload a valid medical report (blood test, lab result, prescription, or scan).`
      };
    }

    return { isValid: true };
  }
};

// REAL REPORT ANALYZER — Uses free Gemini Vision API when key is set
const ReportAnalyzer = {
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  computeGaugePercent(value, min, max) {
    if (value == null || min == null || max == null) return 50;
    const range = max - min;
    if (range <= 0) return 50;
    return Math.min(Math.max(Math.round(((value - min) / range) * 100), 5), 95);
  },

  async analyzeWithGemini(file, language = 'en') {
    const apiKey = StorageManager.getGeminiKey();
    if (!apiKey) return null;

    const base64 = await this.fileToBase64(file);
    const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const langLabel = language === 'hi' ? 'Hindi (Devanagari)' : 'simple Indian English';

    const prompt = `You are a medical report parser for patients in India.
Analyze this medical document image/PDF carefully.
Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "title": "short report title",
  "document_type": "Blood Test" | "Prescription" | "Scan Report" | "General Lab Report",
  "summary_explanation": "2-3 sentence plain-language summary in ${langLabel}",
  "key_findings": [{
    "term": "parameter name",
    "original_value": "value with units",
    "reference_range": "min - max with units",
    "numeric_value": number or null,
    "min_ref": number or null,
    "max_ref": number or null,
    "is_normal": true | false | null,
    "status": "normal" | "out_of_range" | "unclear",
    "level_label": "short status label",
    "plain_explanation": "simple patient-friendly explanation in ${langLabel}",
    "what_to_ask_doctor": "suggested question or null"
  }],
  "unclear_flags": ["list unreadable or ambiguous sections, empty array if none"]
}
Extract all visible lab values. If not a medical document, set document_type to "General Lab Report" and unclear_flags to ["Document may not be a medical report"].`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini vision failed (${res.status})`);
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error('No analysis returned from Gemini');

    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    parsed.key_findings = (parsed.key_findings || []).map((f, i) => ({
      id: 'f' + (i + 1),
      term: f.term || 'Unknown Parameter',
      original_value: f.original_value || '—',
      reference_range: f.reference_range || '',
      numeric_value: f.numeric_value ?? null,
      min_ref: f.min_ref ?? null,
      max_ref: f.max_ref ?? null,
      gauge_percent: this.computeGaugePercent(f.numeric_value, f.min_ref, f.max_ref),
      is_normal: f.is_normal ?? null,
      status: f.status || 'unclear',
      level_label: f.level_label || 'See report',
      plain_explanation: f.plain_explanation || '',
      what_to_ask_doctor: f.what_to_ask_doctor || null
    }));

    return parsed;
  },

  buildReportFromAnalysis(analysis, file, language) {
    return {
      id: 'rep_' + Date.now(),
      user_id: StorageManager.getUser()?.id || 'demo_patient_123',
      title: analysis.title || 'Medical Report Analysis',
      document_type: analysis.document_type || 'General Lab Report',
      language,
      file_name: file.name,
      summary_explanation: analysis.summary_explanation || '',
      key_findings: analysis.key_findings?.length ? analysis.key_findings : DEMO_REPORT.key_findings,
      unclear_flags: analysis.unclear_flags || [],
      disclaimer: MANDATORY_DISCLAIMER[language],
      created_at: new Date().toISOString()
    };
  }
};

// FREE LOCAL OCR — No API key needed (Tesseract.js runs in your browser)
const LocalOCR = {
  tesseractLoaded: false,

  loadLibrary() {
    if (this.tesseractLoaded || typeof Tesseract !== 'undefined') {
      this.tesseractLoaded = true;
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = () => { this.tesseractLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('Could not load OCR library'));
      document.head.appendChild(script);
    });
  },

  async extractText(file) {
    await this.loadLibrary();
    const result = await Tesseract.recognize(file, 'eng', { logger: () => {} });
    return result.data.text || '';
  },

  labPatterns: [
    { term: 'Hemoglobin (Hb)', regex: /(?:hemoglobin|h\.?\s*b\.?|hb)\s*[:\-=\s]*([\d.]+)\s*(?:g\/dl|gm\/dl)?/i, unit: 'g/dL', min: 12.0, max: 15.5, ref: '12.0 - 15.5 g/dL' },
    { term: 'Fasting Blood Glucose', regex: /(?:fasting\s*(?:blood\s*)?glucose|f\.?\s*b\.?\s*s\.?|fbs|blood\s*sugar)\s*[:\-=\s]*([\d.]+)\s*(?:mg\/dl)?/i, unit: 'mg/dL', min: 70, max: 99, ref: '70 - 99 mg/dL' },
    { term: 'Platelet Count', regex: /platelets?\s*[:\-=\s]*([\d,]+)\s*(?:\/|\s)?(?:ul|µl|mcu)?/i, unit: '/µL', min: 150000, max: 450000, ref: '150,000 - 450,000 /µL', parse: v => parseFloat(v.replace(/,/g, '')) },
    { term: 'WBC Count', regex: /(?:w\.?\s*b\.?\s*c\.?|white\s*blood\s*cell)\s*[:\-=\s]*([\d.]+)/i, unit: '/µL', min: 4000, max: 11000, ref: '4,000 - 11,000 /µL' },
    { term: 'RBC Count', regex: /(?:r\.?\s*b\.?\s*c\.?|red\s*blood\s*cell)\s*[:\-=\s]*([\d.]+)/i, unit: 'million/µL', min: 4.0, max: 5.5, ref: '4.0 - 5.5 million/µL' }
  ],

  buildFinding(pattern, rawValue, language) {
    const numeric = pattern.parse ? pattern.parse(rawValue) : parseFloat(rawValue);
    if (isNaN(numeric)) return null;
    const isNormal = numeric >= pattern.min && numeric <= pattern.max;
    const gauge = ReportAnalyzer.computeGaugePercent(numeric, pattern.min, pattern.max);
    const displayVal = pattern.term.includes('Platelet')
      ? numeric.toLocaleString('en-IN') + ' ' + pattern.unit
      : numeric + ' ' + pattern.unit;

    const explainEn = isNormal
      ? `Your ${pattern.term} is ${displayVal}, which is within the normal range (${pattern.ref}).`
      : `Your ${pattern.term} is ${displayVal}, which is ${numeric < pattern.min ? 'below' : 'above'} normal (${pattern.ref}). Discuss with your doctor.`;
    const explainHi = isNormal
      ? `आपका ${pattern.term} ${displayVal} है, जो सामान्य सीमा (${pattern.ref}) में है।`
      : `आपका ${pattern.term} ${displayVal} है, जो सामान्य (${pattern.ref}) से ${numeric < pattern.min ? 'कम' : 'अधिक'} है। डॉक्टर से चर्चा करें।`;

    return {
      term: pattern.term,
      original_value: displayVal.trim(),
      reference_range: pattern.ref,
      numeric_value: numeric,
      min_ref: pattern.min,
      max_ref: pattern.max,
      gauge_percent: gauge,
      is_normal: isNormal,
      status: isNormal ? 'normal' : 'out_of_range',
      level_label: isNormal
        ? (language === 'hi' ? 'सामान्य' : 'Normal')
        : (language === 'hi' ? 'सीमा से बाहर' : 'Out of Range'),
      plain_explanation: language === 'hi' ? explainHi : explainEn,
      what_to_ask_doctor: isNormal ? null : (language === 'hi' ? 'डॉक्टर से इस मान के बारे में पूछें।' : 'Ask your doctor about this value.')
    };
  },

  parseLabText(text, language = 'en') {
    const findings = [];
    for (const p of this.labPatterns) {
      const m = text.match(p.regex);
      if (m) {
        const f = this.buildFinding(p, m[1], language);
        if (f) findings.push(f);
      }
    }
    return findings.map((f, i) => ({ id: 'f' + (i + 1), ...f }));
  },

  async analyzeImage(file, language = 'en') {
    const text = await this.extractText(file);
    const key_findings = this.parseLabText(text, language);
    if (!key_findings.length) return null;

    const abnormal = key_findings.filter(f => !f.is_normal);
    const summaryEn = abnormal.length
      ? `OCR found ${key_findings.length} values. Notable: ${abnormal.map(f => f.term + ' ' + f.original_value).join(', ')}.`
      : `OCR found ${key_findings.length} values — all appear within normal ranges.`;
    const summaryHi = abnormal.length
      ? `OCR ने ${key_findings.length} मान पाए। ध्यान दें: ${abnormal.map(f => f.term).join(', ')}।`
      : `OCR ने ${key_findings.length} मान पाए — सभी सामान्य सीमा में लगते हैं।`;

    return {
      title: language === 'hi' ? 'OCR रक्त जांच रिपोर्ट' : 'Blood Test Report (Local OCR)',
      document_type: 'Blood Test',
      summary_explanation: language === 'hi' ? summaryHi : summaryEn,
      key_findings,
      unclear_flags: text.length < 50 ? ['OCR could read very little text — try a clearer photo.'] : []
    };
  }
};

// FREE AI PROVIDERS + SMART LOCAL FALLBACK
const AssistantAI = {
  buildPrompt(query, report, language) {
    const findingsText = (report?.key_findings || [])
      .map(f => `${f.term}: ${f.original_value} (ref ${f.reference_range}) — ${f.plain_explanation}`)
      .join('\n');

    return `You are Second Opinion, a compassionate medical report explainer for patients in India.
Reply in ${language === 'hi' ? 'Hindi (Devanagari script)' : 'simple Indian English'}.

REPORT: ${report?.title || 'Medical Report'}
TYPE: ${report?.document_type || 'Lab Report'}
SUMMARY: ${report?.summary_explanation || ''}
FINDINGS:
${findingsText}

PATIENT QUESTION: "${query}"

RULES:
1. Answer ONLY what was asked — be specific and warm.
2. Keep it short: 2-4 sentences, easy to speak aloud.
3. Never prescribe medicines or diagnose.
4. End with: "${MANDATORY_DISCLAIMER[language]}"`;
  },

  async generateResponse(query, report, language = 'en') {
    const q = query.trim();
    if (!q) return MANDATORY_DISCLAIMER[language];
    const provider = StorageManager.getAIProvider();

    if (provider !== 'local') {
      const tryGroq = provider === 'auto' || provider === 'groq';
      const tryGemini = provider === 'auto' || provider === 'gemini';

      if (tryGroq && StorageManager.getGroqKey()) {
        try {
          const res = await this.callGroqAPI(StorageManager.getGroqKey(), q, report, language);
          if (res) return res;
        } catch (err) {
          console.warn('Groq API error, trying next provider:', err);
        }
      }

      if (tryGemini && StorageManager.getGeminiKey()) {
        try {
          const res = await this.callGeminiAPI(StorageManager.getGeminiKey(), q, report, language);
          if (res) return res;
        } catch (err) {
          console.warn('Gemini API error, falling back to local engine:', err);
        }
      }
    }

    return this.generateLocalResponse(q, report, language);
  },

  async callGroqAPI(apiKey, query, report, language) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: this.buildPrompt(query, report, language) }],
        max_tokens: 350,
        temperature: 0.4
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Groq HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  },

  async callGeminiAPI(apiKey, query, report, language) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: this.buildPrompt(query, report, language) }] }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  },

  generateLocalResponse(query, report, language = 'en') {
    const qLower = query.toLowerCase();
    const isHindi = language === 'hi';
    const disclaimer = MANDATORY_DISCLAIMER[language];
    const findings = report?.key_findings || DEMO_REPORT.key_findings;

    const matchFindingByQuery = (keywords) => {
      const hit = keywords.find(kw => qLower.includes(kw));
      if (!hit) return null;
      return findings.find(f => keywords.some(kw => f.term.toLowerCase().includes(kw))) || null;
    };

    if (/^(hi|hello|hey|namaste|good morning|good evening|greetings)\b/i.test(qLower)) {
      return isHindi
        ? `नमस्ते! मैं आपका Second Opinion वॉइस असिस्टेंट हूँ। अपनी रिपोर्ट के बारे में कोई भी सवाल पूछें — बोलकर या टाइप करके।`
        : `Hello! I am your Second Opinion voice assistant. Ask me anything about your test results — by voice or by typing.`;
    }

    if (/^(ok|okay|thanks|thank you|got it|understood|dhanyawad|shukriya)\b/i.test(qLower)) {
      return isHindi
        ? `आपका स्वागत है! और कोई सवाल हो तो पूछें।\n\n${disclaimer}`
        : `You're welcome! Ask anytime if you need more clarity.\n\n${disclaimer}`;
    }

    if (/who are you|what can you do/i.test(qLower)) {
      return isHindi
        ? `मैं Second Opinion असिस्टेंट हूँ — लैब रिपोर्ट को सरल भाषा में समझाता हूँ। Settings में मुफ़्त Groq या Gemini API key जोड़ें बेहतर जवाबों के लिए।`
        : `I am Second Opinion assistant — I explain lab reports in plain language. Add a free Groq or Gemini API key in Settings for smarter answers.`;
    }

    const hb = matchFindingByQuery(['hemoglobin', 'hgb', ' hb', 'hb ', 'हीमोग्लोबिन']);
    if (hb || /\bhb\b|iron|tired|fatigue|खून/.test(qLower)) {
      const f = hb || findings[0];
      return isHindi
        ? `${f.term}: आपका स्तर ${f.original_value} है (सामान्य: ${f.reference_range})। ${f.plain_explanation}\n\n${disclaimer}`
        : `${f.term}: Your level is ${f.original_value} (normal: ${f.reference_range}). ${f.plain_explanation}\n\n${disclaimer}`;
    }

    const sugar = matchFindingByQuery(['glucose', 'glu', 'sugar', 'fasting', 'ग्लूकोज', 'शुगर']);
    if (sugar || /diabetes|diet|डायबिटीज/.test(qLower)) {
      const f = sugar || findings.find(x => /glucose|sugar/i.test(x.term)) || findings[1];
      return isHindi
        ? `${f.term}: ${f.original_value} (सामान्य: ${f.reference_range})। ${f.plain_explanation}\n\n${disclaimer}`
        : `${f.term}: ${f.original_value} (normal: ${f.reference_range}). ${f.plain_explanation}\n\n${disclaimer}`;
    }

    const platelet = matchFindingByQuery(['platelet', 'plt', 'प्लेटलेट']);
    if (platelet || /clot/.test(qLower)) {
      const f = platelet || findings.find(x => /platelet/i.test(x.term));
      if (f) {
        return isHindi
          ? `${f.term}: ${f.original_value} — ${f.plain_explanation}\n\n${disclaimer}`
          : `${f.term}: ${f.original_value} — ${f.plain_explanation}\n\n${disclaimer}`;
      }
    }

    if (/pain|fever|headache|dizzy|दर्द|बुखार/.test(qLower)) {
      return isHindi
        ? `शारीरिक लक्षणों के लिए कृपया तुरंत डॉक्टर से मिलें। लैब रिपोर्ट केवल संख्याएँ दिखाती है।\n\n${disclaimer}`
        : `For physical symptoms, please see your doctor promptly. Lab values alone cannot evaluate how you feel.\n\n${disclaimer}`;
    }

    if (/summary|overview|overall|सारांश|कुल/.test(qLower)) {
      return `${report?.summary_explanation || ''}\n\n${disclaimer}`;
    }

    // Match any parameter name mentioned in the question
    const skipWords = new Set(['count', 'blood', 'fasting', 'test', 'level', 'total', 'cell', 'cells']);
    for (const f of findings) {
      const termLower = f.term.toLowerCase();
      if (qLower.includes(termLower)) {
        return isHindi
          ? `${f.term}: ${f.original_value} (सामान्य: ${f.reference_range})। ${f.plain_explanation}\n\n${disclaimer}`
          : `${f.term}: ${f.original_value} (normal: ${f.reference_range}). ${f.plain_explanation}\n\n${disclaimer}`;
      }
      const words = termLower.split(/[\s(\/,\-]+/).filter(w => w.length > 2 && !skipWords.has(w));
      if (words.some(w => qLower.includes(w))) {
        return isHindi
          ? `${f.term}: ${f.original_value} (सामान्य: ${f.reference_range})। ${f.plain_explanation}\n\n${disclaimer}`
          : `${f.term}: ${f.original_value} (normal: ${f.reference_range}). ${f.plain_explanation}\n\n${disclaimer}`;
      }
    }

    const abnormal = findings.filter(f => f.is_normal === false);
    const summary = abnormal.length
      ? abnormal.map(f => `${f.term} (${f.original_value})`).join(', ')
      : report?.summary_explanation || 'All values look within expected ranges.';

    return isHindi
      ? `"${query}" — आपकी रिपोर्ट "${report?.title || 'रिपोर्ट'}" में ध्यान देने योग्य: ${summary}। विस्तार से डॉक्टर से चर्चा करें।\n\n${disclaimer}`
      : `About "${query}": In your report "${report?.title || 'report'}", notable values: ${summary}. Discuss details with your doctor.\n\n${disclaimer}`;
  }
};

// ROBUST VOICE ENGINE WITH INDIAN ACCENT VOICE SELECTION
const VoiceEngine = {
  synth: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null,
  activeRecognition: null,
  isListening: false,
  isSpeaking: false,
  lastFinalTranscript: '',
  indianVoiceHi: null,
  indianVoiceEn: null,
  speechRate: 0.92,

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      this.indianVoiceHi = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi_IN'))
        || voices.find(v => v.lang.startsWith('hi'));
      this.indianVoiceEn = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en_IN'))
        || voices.find(v => /india|hindi/i.test(v.name))
        || voices.find(v => v.lang.startsWith('en'));
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  },

  isSTTSupported() {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  },

  detectSpeechLang(text, fallback = 'en') {
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    return fallback;
  },

  prepareSpeechText(text, maxSentences = 4) {
    const clean = text
      .replace(/[#*`_~]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\n+/g, ' ')
      .trim();
    const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
    return sentences.slice(0, maxSentences).join(' ').trim();
  },

  startListening(language = 'en', onResult, onError, onEnd) {
    if (!this.isSTTSupported()) {
      if (onError) onError('Voice input is not supported in this browser. Please try Chrome or Safari.');
      return false;
    }

    if (this.isSpeaking) this.stopSpeaking();
    this.stopListening();
    this.lastFinalTranscript = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const part = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += part;
        else interim += part;
      }
      if (finalText) this.lastFinalTranscript = (this.lastFinalTranscript + ' ' + finalText).trim();
      const display = this.lastFinalTranscript || interim;
      if (onResult && display) onResult(display, !!finalText);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      this.isListening = false;
      if (event.error === 'no-speech') {
        if (onEnd) onEnd(this.lastFinalTranscript);
        return;
      }
      if (onError) onError(event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice recognition error.');
    };

    recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd(this.lastFinalTranscript);
    };

    try {
      recognition.start();
      this.activeRecognition = recognition;
      this.isListening = true;
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      this.isListening = false;
      if (onError) onError('Could not access microphone.');
      return false;
    }
  },

  stopListening() {
    if (this.activeRecognition) {
      try { this.activeRecognition.stop(); } catch (e) { /* ignore */ }
      this.activeRecognition = null;
    }
    this.isListening = false;
  },

  speak(text, language = 'en', onEnd, options = {}) {
    if (!this.synth || !text) return;
    this.stopSpeaking();

    const speakText = options.short ? this.prepareSpeechText(text, 3) : this.prepareSpeechText(text, 8);
    const speakLang = options.autoLang ? this.detectSpeechLang(speakText, language) : language;

    const utterance = new SpeechSynthesisUtterance(speakText);
    utterance.lang = speakLang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    if (speakLang === 'hi' && this.indianVoiceHi) utterance.voice = this.indianVoiceHi;
    else if (speakLang === 'en' && this.indianVoiceEn) utterance.voice = this.indianVoiceEn;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; if (onEnd) onEnd(); };
    utterance.onerror = () => { this.isSpeaking = false; if (onEnd) onEnd(); };

    this.synth.speak(utterance);
  },

  stopSpeaking() {
    if (this.synth) this.synth.cancel();
    this.isSpeaking = false;
  }
};

// LIVE VOICE MODE FULLSCREEN OVERLAY CONTROLLER
const GeminiLiveMode = {
  isHandsFreeLoop: false,
  activeReportId: null,

  setActiveReport(reportId) {
    this.activeReportId = reportId;
  },

  getActiveReport() {
    if (this.activeReportId) {
      return StorageManager.getReportById(this.activeReportId);
    }
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('id');
    if (urlId) return StorageManager.getReportById(urlId);
    return StorageManager.getReports()[0] || DEMO_REPORT;
  },

  renderModal() {
    if (document.getElementById('gemini-voice-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'gemini-voice-modal';
    modal.className = 'gemini-voice-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Live Voice Assistant');

    modal.innerHTML = `
      <div class="flex items-center justify-between w-full max-w-md">
        <div class="flex items-center gap-2">
          <span class="badge badge-sage" style="background: rgba(255,255,255,0.15); color: var(--marigold);">
            🎙️ Live Voice Assistant
          </span>
        </div>
        <button onclick="GeminiLiveMode.closeModal()" class="btn btn-outline text-xs" style="color: var(--white); border-color: rgba(255,255,255,0.3); padding: 0.375rem 0.75rem;">
          ✕ Exit
        </button>
      </div>

      <div class="flex flex-col items-center gap-6 my-auto">
        <div id="gemini-live-orb" class="gemini-live-orb">
          <span style="font-size: 3.5rem;" id="orb-icon">🎙️</span>
        </div>

        <div class="text-center space-y-2 max-w-md">
          <h2 class="font-serif text-2xl font-bold" id="live-status-title">Listening to you...</h2>
          <p class="text-sm" style="color: rgba(255,255,255,0.8);" id="live-status-subtitle">
            Speak your question about your medical report. Tap mic to interrupt.
          </p>
        </div>

        <div id="live-transcript-box" aria-live="polite" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 0.875rem 1.25rem; border-radius: 1rem; font-size: 0.875rem; text-align: center; max-width: 24rem; min-height: 3rem;" class="flex items-center justify-center">
          ...
        </div>
      </div>

      <div class="flex items-center gap-4 w-full max-w-md justify-center">
        <button id="live-mic-toggle" onclick="GeminiLiveMode.toggleMic()" class="btn btn-marigold" style="padding: 1rem 2rem; border-radius: var(--radius-full);">
          <span>🎙️ Tap to Speak</span>
        </button>
        <button onclick="GeminiLiveMode.closeModal()" class="btn btn-outline" style="color: var(--white); border-color: rgba(255,255,255,0.3); border-radius: var(--radius-full);">
          <span>End</span>
        </button>
      </div>
    `;

    document.body.appendChild(modal);
  },

  openModal(reportId) {
    if (reportId) this.activeReportId = reportId;
    this.renderModal();
    document.getElementById('gemini-voice-modal').classList.add('open');
    this.isHandsFreeLoop = true;
    this.startListeningTurn();
  },

  closeModal() {
    const modal = document.getElementById('gemini-voice-modal');
    if (modal) modal.classList.remove('open');
    this.isHandsFreeLoop = false;
    VoiceEngine.stopListening();
    VoiceEngine.stopSpeaking();
  },

  toggleMic() {
    if (VoiceEngine.isSpeaking) VoiceEngine.stopSpeaking();
    if (VoiceEngine.isListening) {
      VoiceEngine.stopListening();
      this.updateOrbState('idle', 'Paused', 'Tap microphone to speak again');
    } else {
      this.startListeningTurn();
    }
  },

  updateOrbState(state, title, subtitle) {
    const orb = document.getElementById('gemini-live-orb');
    const icon = document.getElementById('orb-icon');
    const titleEl = document.getElementById('live-status-title');
    const subEl = document.getElementById('live-status-subtitle');

    if (!orb) return;
    orb.className = 'gemini-live-orb ' + state;

    if (state === 'listening') {
      icon.innerText = '🎙️';
    } else if (state === 'speaking') {
      icon.innerText = '🔊';
    } else {
      icon.innerText = '⚡';
    }

    if (title) titleEl.innerText = title;
    if (subtitle) subEl.innerText = subtitle;
  },

  async startListeningTurn() {
    const report = this.getActiveReport();
    const lang = report ? report.language : 'en';

    this.updateOrbState('listening', lang === 'hi' ? 'आपकी बात सुन रहा हूँ...' : 'Listening carefully...', lang === 'hi' ? 'हिंदी या अंग्रेज़ी में बोलें' : 'Speak in Hindi or English');
    const transcriptBox = document.getElementById('live-transcript-box');
    if (transcriptBox) transcriptBox.innerText = 'Listening...';

    VoiceEngine.startListening(
      lang,
      (text) => {
        if (transcriptBox) transcriptBox.innerText = text;
      },
      () => {
        this.updateOrbState('idle', 'Microphone paused', 'Tap mic to retry');
      },
      async (finalText) => {
        if (finalText && finalText.length > 2) {
          await this.processAnswerTurn(finalText, report, lang);
        } else {
          this.updateOrbState('idle', 'Ready', 'Tap microphone to speak your question');
        }
      }
    );
  },

  async processAnswerTurn(text, report, lang) {
    this.updateOrbState('speaking', lang === 'hi' ? 'उत्तर तैयार कर रहा हूँ...' : 'Preparing answer...', `"${text}"`);
    
    const responseText = await AssistantAI.generateResponse(text, report, lang);
    const transcriptBox = document.getElementById('live-transcript-box');
    if (transcriptBox) transcriptBox.innerText = responseText;

    VoiceEngine.speak(responseText, lang, () => {
      if (this.isHandsFreeLoop) {
        setTimeout(() => this.startListeningTurn(), 1200);
      }
    }, { short: true, autoLang: true });
  }
};

// FLOATING WIDGET TRIGGER
const FloatingVoiceWidget = {
  render() {
    if (document.getElementById('floating-voice-widget')) return;

    const container = document.createElement('div');
    container.id = 'floating-voice-widget';
    container.className = 'floating-voice-widget';

    const reportId = new URLSearchParams(window.location.search).get('id');
    const openArgs = reportId ? `( '${reportId}' )` : '()';

    container.innerHTML = `
      <button id="widget-floating-trigger" onclick="GeminiLiveMode.openModal${openArgs}" class="voice-widget-btn" title="Open Live Voice Assistant">
        <span style="font-size: 1.25rem;">🎙️</span>
        <span>Talk to Voice Assistant</span>
      </button>
    `;

    document.body.appendChild(container);
  }
};

// COMMON HEADER & MOBILE DRAWER RENDERER
function renderNav() {
  const user = StorageManager.getUser();
  const userContainer = document.getElementById('nav-user-container');
  const drawerContainer = document.getElementById('mobile-drawer-links');
  
  const linksHtml = user ? `
    <div class="user-badge" style="margin-right: 0.5rem;">
      <span>👤</span>
      <span>${user.name || user.email}</span>
    </div>
    <button onclick="handleSignOut()" style="color: rgba(29,43,39,0.6); padding: 0.25rem 0.5rem; font-size: 0.875rem;" title="Sign Out">
      🚪
    </button>
  ` : `
    <a href="auth.html" class="nav-btn-primary">
      <span>Sign In</span>
    </a>
  `;

  if (userContainer) userContainer.innerHTML = linksHtml;

  if (drawerContainer) {
    drawerContainer.innerHTML = `
      <a href="index.html" class="mobile-nav-link">🏠 Home</a>
      <a href="upload.html" class="mobile-nav-link">📤 Upload Report</a>
      <a href="history.html" class="mobile-nav-link">📜 Report History</a>
      <a href="settings.html" class="mobile-nav-link">⚙️ AI & Voice Settings</a>
      ${user ? `<button onclick="handleSignOut()" class="mobile-nav-link" style="color: var(--red-text);">🚪 Sign Out (${user.name})</button>` : `<a href="auth.html" class="mobile-nav-link">🔑 Sign In / Register</a>`}
    `;
  }
}

function toggleMobileDrawer() {
  const drawer = document.getElementById('mobile-drawer');
  if (drawer) {
    drawer.classList.toggle('open');
  }
}

function handleSignOut() {
  StorageManager.setUser(null);
  window.location.reload();
}

// INSTANT DEMO GENERATOR
function generateInstantDemo(language = 'en', fileName = 'sample_cbc_report.pdf') {
  const reportId = 'rep_demo_' + Date.now();
  const report = {
    id: reportId,
    user_id: StorageManager.getUser()?.id || 'demo_patient_123',
    title: language === 'hi' ? 'रक्त जांच रिपोर्ट (Comprehensive Blood Test)' : 'Complete Blood Count & Metabolic Report',
    document_type: 'Blood Test',
    language: language,
    file_name: fileName,
    summary_explanation: language === 'hi'
      ? 'आपकी रक्त रिपोर्ट कुल मिलाकर ठीक है। इसमें 2 मुख्य बातें ध्यान देने योग्य हैं: हीमोग्लोबिन 11.2 (सामान्य से थोड़ा कम) और फास्टिंग शर्करा 104 (बॉर्डरलाइन अधिक)। आपकी प्लेटलेट्स पूरी तरह से स्वस्थ हैं।'
      : 'Your blood test report is overall stable. Here is what stands out: Your Hemoglobin (11.2) is slightly lower than target, and your Fasting Glucose (104) is borderline high. Your Platelet count is completely healthy and normal.',
    key_findings: [
      {
        id: 'f1',
        term: 'Hemoglobin (Hb)',
        original_value: '11.2 g/dL',
        reference_range: '12.0 - 15.5 g/dL',
        numeric_value: 11.2,
        min_ref: 12.0,
        max_ref: 15.5,
        gauge_percent: 22,
        is_normal: false,
        status: 'out_of_range',
        level_label: language === 'hi' ? 'सामान्य से थोड़ा कम (हल्का आयरन की कमी)' : 'Slightly Low (Mild Iron Deficiency)',
        plain_explanation: language === 'hi'
          ? 'हीमोग्लोबिन आपके खून में ऑक्सीजन पहुंचाने का काम करता है। आपका स्तर 11.2 है जो 12.0 की सामान्य सीमा से थोड़ा कम है।'
          : 'Hemoglobin carries oxygen in your blood. Your level of 11.2 g/dL is slightly below normal (12.0 - 15.5 g/dL). This can sometimes cause mild tiredness.',
        what_to_ask_doctor: language === 'hi'
          ? 'डॉक्टर से पूछें कि क्या आहार में पालक, अनार, दालें या आयरन सप्लीमेंट बढ़ाना चाहिए।'
          : 'Ask your doctor if adding iron-rich foods (spinach, lentils) or iron supplements is recommended.'
      },
      {
        id: 'f2',
        term: 'Fasting Blood Glucose',
        original_value: '104 mg/dL',
        reference_range: '70 - 99 mg/dL',
        numeric_value: 104,
        min_ref: 70,
        max_ref: 99,
        gauge_percent: 78,
        is_normal: false,
        status: 'out_of_range',
        level_label: language === 'hi' ? 'बॉर्डरलाइन अधिक (प्रीडायबिटीज स्तर)' : 'Borderline High (Prediabetes Threshold)',
        plain_explanation: language === 'hi'
          ? 'रात भर भूखे रहने के बाद ब्लड शुगर 104 है, जो सामान्य (99) से थोड़ा ऊपर है। यह डायबिटीज नहीं है, लेकिन इसे डॉक्टर प्रीडायबिटीज कहते हैं।'
          : 'This measures blood sugar after not eating overnight. 104 mg/dL is slightly elevated above normal (70 - 99 mg/dL). It is not diabetes, but borderline prediabetes.',
        what_to_ask_doctor: language === 'hi'
          ? 'डॉक्टर से पूछें कि मीठा कम करने और हल्की चहलकदमी से इसे कैसे सामान्य करें।'
          : 'Ask your doctor what daily diet tweaks or light walks can bring sugar back into normal range.'
      },
      {
        id: 'f3',
        term: 'Platelet Count',
        original_value: '220,000 /µL',
        reference_range: '150,000 - 450,000 /µL',
        numeric_value: 220000,
        min_ref: 150000,
        max_ref: 450000,
        gauge_percent: 50,
        is_normal: true,
        status: 'normal',
        level_label: language === 'hi' ? 'बिल्कुल सामान्य एवं स्वस्थ' : 'Optimal & Perfectly Normal',
        plain_explanation: language === 'hi'
          ? 'आपकी प्लेटलेट संख्या पूरी तरह से सामान्य और स्वस्थ सीमा में है, जो चोट लगने पर थक्का जमाने में मदद करती है।'
          : 'Platelets help your blood clot normally when you get a cut. Your count is completely healthy and normal.',
        what_to_ask_doctor: null
      }
    ],
    unclear_flags: [
      language === 'hi' ? 'डॉक्टर स्टैम्प के कारण निचले हिस्से का लैब नोट धुंधला था।' : 'Doctor signature stamp slightly obscured bottom lab notes on page 1.'
    ],
    disclaimer: MANDATORY_DISCLAIMER[language],
    created_at: new Date().toISOString()
  };

  StorageManager.saveReport(report);
  window.location.href = `report.html?id=${reportId}`;
}

// PROCESS UPLOADED FILE — Gemini Vision → free local OCR → sample fallback
async function processUploadedFile(file, language = 'en', onProgress) {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isAnalyzable = isImage || isPdf;

  if (StorageManager.getGeminiKey() && isAnalyzable) {
    if (onProgress) onProgress(language === 'hi' ? 'Gemini AI रिपोर्ट पढ़ रहा है...' : 'Gemini AI is reading your report...');
    const analysis = await ReportAnalyzer.analyzeWithGemini(file, language);
    if (analysis) {
      const report = ReportAnalyzer.buildReportFromAnalysis(analysis, file, language);
      StorageManager.saveReport(report);
      window.location.href = `report.html?id=${report.id}`;
      return { mode: 'gemini', reportId: report.id };
    }
  }

  if (isImage) {
    if (onProgress) onProgress(language === 'hi' ? 'मुफ़्त OCR से रिपोर्ट स्कैन हो रही है...' : 'Scanning report with free local OCR...');
    try {
      const ocrResult = await LocalOCR.analyzeImage(file, language);
      if (ocrResult) {
        const report = ReportAnalyzer.buildReportFromAnalysis(ocrResult, file, language);
        StorageManager.saveReport(report);
        window.location.href = `report.html?id=${report.id}`;
        return { mode: 'ocr', reportId: report.id };
      }
    } catch (err) {
      console.warn('Local OCR failed:', err);
    }
  }

  if (onProgress) onProgress(language === 'hi' ? 'डेमो रिपोर्ट लोड हो रही है...' : 'Loading sample report...');
  generateInstantDemo(language, file.name);
  return { mode: 'demo', reason: isPdf && !StorageManager.getGeminiKey() ? 'pdf_needs_gemini' : 'no_values_found' };
}

function initFirstRun() {
  if (localStorage.getItem('second_opinion_initialized')) return;
  StorageManager.setUser({
    id: 'demo_patient_123',
    email: 'patient@secondopinion.health',
    name: 'Demo Patient'
  });
  localStorage.setItem('second_opinion_initialized', '1');
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initFirstRun();
  const savedRate = localStorage.getItem('second_opinion_speech_rate');
  if (savedRate) VoiceEngine.speechRate = parseFloat(savedRate);
  VoiceEngine.initVoices();
  renderNav();
  FloatingVoiceWidget.render();
});
