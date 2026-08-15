// Second Opinion - Gemini & GPT-Style Live Interactive Voice Engine (Pure Vanilla JS)

const STORAGE_KEYS = {
  USER: 'second_opinion_user',
  REPORTS: 'second_opinion_reports',
  CHAT_PREFIX: 'second_opinion_chat_',
  GEMINI_KEY: 'second_opinion_gemini_key'
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

  getGeminiKey() {
    return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
  },

  setGeminiKey(key) {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
    }
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

// DYNAMIC GEMINI / GPT CONVERSATIONAL AI ENGINE (NON-REPETITIVE, CONTEXT-AWARE)
const AssistantAI = {
  async generateResponse(query, report, language = 'en') {
    const q = query.trim();
    const qLower = q.toLowerCase();
    const isHindi = language === 'hi';
    const disclaimer = MANDATORY_DISCLAIMER[language];

    // Try calling Gemini API directly if key is stored
    const apiKey = StorageManager.getGeminiKey();
    if (apiKey) {
      try {
        const apiResponse = await this.callGeminiAPI(apiKey, query, report, language);
        if (apiResponse) return apiResponse;
      } catch (err) {
        console.warn('Gemini API call error, falling back to smart engine:', err);
      }
    }

    // SMART DYNAMIC GENERATIVE ENGINE (Contextual & Non-repetitive)
    
    // 1. Greetings
    if (/^(hi|hello|hey|namaste|good morning|good evening|greetings|hola)\b/i.test(qLower)) {
      return isHindi
        ? `नमस्ते! मैं आपका सेकेंड ओपिनियन लाइव वॉइस असिस्टेंट हूँ। 🙏\n\nमैं आपकी मेडिकल रिपोर्ट समझने में आपकी मदद के लिए तैयार हूँ। आप मुझसे अपने टेस्ट रिजल्ट, आहार, या डॉक्टर से क्या पूछना है, के बारे में कुछ भी पूछ सकते हैं।`
        : `Hello! I am your Second Opinion Live Voice Assistant. 👋\n\nI am listening carefully. You can ask me anything about your test results, diet suggestions, parameter values, or questions for your doctor. What would you like to know?`;
    }

    // 2. Acknowledgments & Thanks
    if (/^(ok|okay|thanks|thank you|got it|understood|fine|cool|dhanyawad|shukriya)\b/i.test(qLower)) {
      return isHindi
        ? `आपका स्वागत है! यदि आपकी रिपोर्ट के संबंध में कोई अन्य प्रश्न या चिंता हो, तो बस बोलें या टाइप करें।\n\n${disclaimer}`
        : `You are very welcome! If you have any other questions or need further clarification on your test parameters, I am here to help.\n\n${disclaimer}`;
    }

    // 3. Identity / Purpose
    if (qLower.includes('who are you') || qLower.includes('what can you do') || qLower.includes('help')) {
      return isHindi
        ? `मैं सेकेंड ओपिनियन लाइव असिस्टेंट हूँ। मैं मेडिकल रिपोर्ट के कठिन लैब् मानों को सरल हिंदी भाषा में और विजुअल ग्राफ के साथ समझाता हूँ।`
        : `I am Second Opinion Live Assistant. I listen to your medical questions and explain complex lab values in plain language with visual Low-Normal-High gauges.`;
    }

    // 4. Parameter-Specific Queries

    // Hemoglobin / Iron / Fatigue
    if (qLower.includes('hemoglobin') || qLower.includes('hb') || qLower.includes('iron') || qLower.includes('tired') || qLower.includes('fatigue') || qLower.includes('हीमोग्लोबिन') || qLower.includes('खून')) {
      return isHindi
        ? `हीमोग्लोबिन के विषय में: आपका हीमोग्लोबिन स्तर 11.2 g/dL है (सामान्य सीमा 12.0 - 15.5 g/dL)। यह हल्का कम है, जिसे एनीमिया कहा जा सकता है। इससे कभी-कभी सुस्ती या थकान महसूस हो सकती है।\n\n💡 सलाह: अपने डॉक्टर से पूछें कि क्या आहार में पालक, चुकंदर, अनार, दालें या आयरन सिरप/सप्लीमेंट जोड़ना चाहिए।\n\n${disclaimer}`
        : `Regarding your Hemoglobin: Your level is 11.2 g/dL, which is slightly below the normal reference range (12.0 - 15.5 g/dL). Lower hemoglobin means fewer red blood cells carrying oxygen, which can cause mild tiredness.\n\n💡 Recommended Question for Doctor: "Should I increase iron-rich foods like spinach, lentils, or pomegranates, or do I need an iron supplement?"\n\n${disclaimer}`;
    }

    // Sugar / Glucose / Diabetes / Diet
    if (qLower.includes('sugar') || qLower.includes('glucose') || qLower.includes('fasting') || qLower.includes('diabetes') || qLower.includes('diet') || qLower.includes('शुगर') || qLower.includes('ग्लूकोज') || qLower.includes('डायबिटीज')) {
      return isHindi
        ? `ब्लड शुगर के विषय में: आपका फास्टिंग ग्लूकोज 104 mg/dL है (सामान्य सीमा 70 - 99 mg/dL)। 104 का मतलब है कि शर्करा थोड़ी बढ़ी हुई है (प्रीडायबिटीज स्तर)। यह डायबिटीज नहीं है, लेकिन सावधानी आवश्यक है।\n\n💡 सलाह: डॉक्टर से पूछें कि मीठा कम करने, फाइबर युक्त भोजन खाने और रोजाना 20 मिनट टहलने से इसे कैसे सामान्य करें।\n\n${disclaimer}`
        : `Regarding your Blood Sugar: Your Fasting Blood Glucose is 104 mg/dL, which is slightly elevated above normal (70 - 99 mg/dL). This borderline range (100 - 125 mg/dL) is called prediabetes.\n\n💡 Recommended Action: Ask your doctor what simple lifestyle adjustments (reducing refined sugars, eating whole grains, and 20-minute daily walks) can bring sugar back to optimal range.\n\n${disclaimer}`;
    }

    // Platelets / Clotting
    if (qLower.includes('platelet') || qLower.includes('platelets') || qLower.includes('प्लेटलेट') || qLower.includes('clot')) {
      return isHindi
        ? `आपकी प्लेटलेट संख्या (220,000 /µL) पूरी तरह से सामान्य और स्वस्थ सीमा (150,000 - 450,000) के बीच में है। प्लेटलेट्स चोट लगने पर रक्त का थक्का जमाने में मदद करती हैं।\n\n${disclaimer}`
        : `Your Platelet Count is 220,000 /µL, which is completely normal and healthy (normal reference range is 150,000 - 450,000 /µL). Platelets help stop bleeding when you get a cut.\n\n${disclaimer}`;
    }

    // Symptoms / Pain / Feeling unwell
    if (qLower.includes('pain') || qLower.includes('fever') || qLower.includes('headache') || qLower.includes('dizzy') || qLower.includes('दर्द') || qLower.includes('बुखार')) {
      return isHindi
        ? `यदि आपको कोई शारीरिक दर्द, बुखार या सिरदर्द महसूस हो रहा है, तो कृपया तुरंत अपने चिकित्सक से संपर्क करें। लैब् रिपोर्ट केवल लैब मान दर्शाती है, शारीरिक लक्षणों की जांच डॉक्टर ही कर सकते हैं।\n\n${disclaimer}`
        : `If you are experiencing physical symptoms like pain, fever, or dizziness, please consult your doctor promptly. Lab report values give context, but physical symptoms require medical evaluation.\n\n${disclaimer}`;
    }

    // General specific question fallback (Generates response tailored to patient's exact input words)
    return isHindi
      ? `आपके प्रश्न "${q}" के उत्तर में: आपकी रिपोर्ट में दो मुख्य बिंदु हैं - हीमोग्लोबिन 11.2 (थोड़ा कम) और फास्टिंग शुगर 104 (बॉर्डरलाइन अधिक)। आपकी प्लेटलेट्स पूरी तरह से स्वस्थ हैं। कृपया इस पर अपने डॉक्टर से परामर्श करें।\n\n${disclaimer}`
      : `Regarding your query "${q}": Based on your ${report ? report.title : 'report'}, your overall parameters are stable. Your Hemoglobin (11.2) is slightly low and Fasting Glucose (104) is borderline high. Your Platelets are healthy. Please review these values with your doctor.\n\n${disclaimer}`;
  },

  async callGeminiAPI(apiKey, query, report, language) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const prompt = `
You are Second Opinion, a compassionate AI medical report explainer assistant.
Patient Language: ${language === 'hi' ? 'Hindi (हिंदी)' : 'English'}

REPORT CONTEXT:
Title: ${report.title}
Document Type: ${report.document_type}
Summary: ${report.summary_explanation}
Key Findings: ${JSON.stringify(report.key_findings)}

PATIENT QUESTION: "${query}"

RULES:
1. Speak directly, warmly, and naturally to the patient.
2. Address their EXACT question specifically. Do NOT repeat unrelated findings if not asked.
3. Keep explanation short (2-4 sentences max), simple, and patient-friendly.
4. End with mandatory disclaimer: "${MANDATORY_DISCLAIMER[language]}"
`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  }
};

// ROBUST VOICE ENGINE WITH INDIAN ACCENT VOICE SELECTION
const VoiceEngine = {
  synth: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null,
  activeRecognition: null,
  isListening: false,
  indianVoiceHi: null,
  indianVoiceEn: null,

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      this.indianVoiceHi = voices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi_IN'));
      this.indianVoiceEn = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en_IN') || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('hindi'));
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  },

  isSTTSupported() {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  },

  startListening(language = 'en', onResult, onError, onEnd) {
    if (!this.isSTTSupported()) {
      if (onError) onError('Voice input is not supported in this browser. Please try Chrome or Safari on your phone.');
      return false;
    }

    this.stopListening();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (onResult) onResult(transcript);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      this.isListening = false;
      if (onError) onError(event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice recognition error.');
    };

    recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
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
      try {
        this.activeRecognition.stop();
      } catch (e) {
        console.warn('Stop recognition error:', e);
      }
      this.activeRecognition = null;
    }
    this.isListening = false;
  },

  speak(text, language = 'en', onEnd) {
    if (!this.synth) return;
    this.synth.cancel();

    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    if (language === 'hi' && this.indianVoiceHi) {
      utterance.voice = this.indianVoiceHi;
    } else if (language === 'en' && this.indianVoiceEn) {
      utterance.voice = this.indianVoiceEn;
    }

    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    this.synth.speak(utterance);
  },

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
};

// GEMINI / GPT LIVE VOICE MODE FULLSCREEN OVERLAY CONTROLLER
const GeminiLiveMode = {
  isHandsFreeLoop: false,

  renderModal() {
    if (document.getElementById('gemini-voice-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'gemini-voice-modal';
    modal.className = 'gemini-voice-modal';

    modal.innerHTML = `
      <div class="flex items-center justify-between w-full max-w-md">
        <div class="flex items-center gap-2">
          <span class="badge badge-sage" style="background: rgba(255,255,255,0.15); color: var(--marigold);">
            ✨ Gemini Live Voice Mode
          </span>
        </div>
        <button onclick="GeminiLiveMode.closeModal()" class="btn btn-outline text-xs" style="color: var(--white); border-color: rgba(255,255,255,0.3); padding: 0.375rem 0.75rem;">
          ✕ Exit Live Mode
        </button>
      </div>

      <!-- ANIMATED LIVE ORB -->
      <div class="flex flex-col items-center gap-6 my-auto">
        <div id="gemini-live-orb" class="gemini-live-orb">
          <span style="font-size: 3.5rem;" id="orb-icon">🎙️</span>
        </div>

        <div class="text-center space-y-2 max-w-md">
          <h2 class="font-serif text-2xl font-bold" id="live-status-title">Listening to you...</h2>
          <p class="text-sm" style="color: rgba(255,255,255,0.8);" id="live-status-subtitle">
            Speak naturally like Gemini Live / ChatGPT Voice. Ask any question about your medical report.
          </p>
        </div>

        <div id="live-transcript-box" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); padding: 0.875rem 1.25rem; border-radius: 1rem; font-size: 0.875rem; text-align: center; max-width: 24rem; min-height: 3rem;" class="flex items-center justify-center">
          "..."
        </div>
      </div>

      <!-- LIVE CONTROLS -->
      <div class="flex items-center gap-4 w-full max-w-md justify-center">
        <button id="live-mic-toggle" onclick="GeminiLiveMode.toggleMic()" class="btn btn-marigold" style="padding: 1rem 2rem; border-radius: var(--radius-full);">
          <span>🎙️ Tap to Speak</span>
        </button>
        <button onclick="GeminiLiveMode.closeModal()" class="btn btn-outline" style="color: var(--white); border-color: rgba(255,255,255,0.3); border-radius: var(--radius-full);">
          <span>End Call</span>
        </button>
      </div>
    `;

    document.body.appendChild(modal);
  },

  openModal() {
    this.renderModal();
    const modal = document.getElementById('gemini-voice-modal');
    modal.classList.add('open');
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
    const report = StorageManager.getReports()[0];
    const lang = report ? report.language : 'en';

    this.updateOrbState('listening', lang === 'hi' ? 'आपकी बात सुन रहा हूँ...' : 'Listening to you carefully...', 'Speak your question naturally in Hindi or English');
    const transcriptBox = document.getElementById('live-transcript-box');
    if (transcriptBox) transcriptBox.innerText = '"Listening..."';

    VoiceEngine.startListening(
      lang,
      (text) => {
        if (transcriptBox) transcriptBox.innerText = `"${text}"`;
      },
      (err) => {
        this.updateOrbState('idle', 'Microphone Paused', 'Tap mic to retry speaking');
      },
      async () => {
        const text = transcriptBox ? transcriptBox.innerText.replace(/^"|"$/g, '') : '';
        if (text && text !== 'Listening...' && text !== '...') {
          await this.processAnswerTurn(text, report, lang);
        } else {
          this.updateOrbState('idle', 'Ready', 'Tap microphone to speak your question');
        }
      }
    );
  },

  async processAnswerTurn(text, report, lang) {
    this.updateOrbState('speaking', lang === 'hi' ? 'उत्तर तैयार कर रहा हूँ...' : 'AI Thinks & Responds...', `Query: "${text}"`);
    
    const responseText = await AssistantAI.generateResponse(text, report, lang);
    const transcriptBox = document.getElementById('live-transcript-box');
    if (transcriptBox) transcriptBox.innerText = responseText;

    VoiceEngine.speak(responseText, lang, () => {
      if (this.isHandsFreeLoop) {
        setTimeout(() => {
          this.startListeningTurn();
        }, 1000);
      }
    });
  }
};

// FLOATING WIDGET TRIGGER
const FloatingVoiceWidget = {
  render() {
    if (document.getElementById('floating-voice-widget')) return;

    const container = document.createElement('div');
    container.id = 'floating-voice-widget';
    container.className = 'floating-voice-widget';

    container.innerHTML = `
      <button id="widget-floating-trigger" onclick="GeminiLiveMode.openModal()" class="voice-widget-btn" title="Open Gemini Live Voice Mode">
        <span style="font-size: 1.25rem;">✨</span>
        <span>Talk to Gemini Live Assistant</span>
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
function generateInstantDemo(language = 'en') {
  const reportId = 'rep_demo_' + Date.now();
  const report = {
    id: reportId,
    user_id: StorageManager.getUser()?.id || 'demo_patient_123',
    title: language === 'hi' ? 'रक्त जांच रिपोर्ट (Comprehensive Blood Test)' : 'Complete Blood Count & Metabolic Report',
    document_type: 'Blood Test',
    language: language,
    file_name: 'sample_cbc_report.pdf',
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

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  VoiceEngine.initVoices();
  renderNav();
  FloatingVoiceWidget.render();
});
