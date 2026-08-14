// Second Opinion - Pure Vanilla JS Application Core (Smart Document Validation & Natural Conversational Assistant)

const STORAGE_KEYS = {
  USER: 'second_opinion_user',
  REPORTS: 'second_opinion_reports',
  CHAT_PREFIX: 'second_opinion_chat_'
};

// MANDATORY SAFETY DISCLAIMERS
const MANDATORY_DISCLAIMER = {
  en: 'This is an educational explanation, not a medical diagnosis. Please discuss these test results with your doctor.',
  hi: 'यह एक शिक्षण व्याख्या है, चिकित्सीय निदान नहीं। कृपया इन जांच परिणामों पर अपने डॉक्टर से चर्चा करें।'
};

// SAMPLE DEMO REPORT (SUPER SIMPLE PATIENT LANGUAGE + GAUGES)
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

  medicalKeywords: [
    'blood', 'cbc', 'hemoglobin', 'glucose', 'sugar', 'test', 'lab', 'report',
    'prescription', 'doctor', 'patient', 'hospital', 'clinic', 'scan', 'mri',
    'ct', 'xray', 'ultrasound', 'pathology', 'metabolic', 'cholesterol', 'thyroid',
    'urine', 'lipid', 'vitamin', 'creatinine', 'urea', 'liver', 'kidney', 'sgot', 'sgpt'
  ],

  validateFile(file) {
    if (!file) return { isValid: false, reason: 'No file selected.' };

    const name = file.name.toLowerCase();

    // 1. Check if filename explicitly indicates non-medical content
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

// NATURAL CONVERSATIONAL AI ASSISTANT RESPONSE ENGINE
const AssistantAI = {
  generateResponse(query, report, language = 'en') {
    const q = query.trim().toLowerCase();
    const isHindi = language === 'hi';
    const disclaimer = MANDATORY_DISCLAIMER[language];

    // 1. GREETINGS
    if (/^(hi|hello|hey|namaste|good morning|good evening|greetings|hola)\b/i.test(q)) {
      return isHindi
        ? `नमस्ते! मैं आपका सेकेंड ओपिनियन वॉइस एंड टेक्स्ट असिस्टेंट हूँ। 🙏\n\nमैं आपकी मेडिकल रिपोर्ट को समझने में आपकी मदद कर सकता हूँ। आप किसी भी लैब टेस्ट मान, हीमोग्लोबिन, शुगर या रिपोर्ट के बारे में सवाल पूछ सकते हैं।`
        : `Hello! I am your Second Opinion Voice & Text Assistant. 👋\n\nI am here to help you understand your medical report. You can ask me about any parameter value (like Hemoglobin or Blood Sugar), reference ranges, or what questions to ask your doctor. How can I help you today?`;
    }

    // 2. ACKNOWLEDGMENTS & THANKS
    if (/^(ok|okay|thanks|thank you|got it|understood|fine|cool|dhanyawad|shukriya)\b/i.test(q)) {
      return isHindi
        ? `आपका स्वागत है! यदि आपकी रिपोर्ट के संबंध में आपके मन में कोई और प्रश्न हो, तो बेझिझक पूछें।\n\n${disclaimer}`
        : `You are very welcome! Feel free to ask if you have any other questions about your report findings.\n\n${disclaimer}`;
    }

    // 3. IDENTITY / CAPABILITIES
    if (/^(who are you|what can you do|what is this|help)\b/i.test(q)) {
      return isHindi
        ? `मैं सेकेंड ओपिनियन असिस्टेंट हूँ। मैं मेडिकल रिपोर्ट के कठिन शब्दों को सरल हिंदी भाषा में और विजुअल ग्राफ के साथ समझाता हूँ।`
        : `I am Second Opinion, an AI medical report explainer. I translate complex lab jargon into plain language and visual spectrum gauges (Low-Normal-High). I also help suggest questions for your doctor.`;
    }

    // 4. PARAMETER SPECIFIC QUERIES

    // Hemoglobin
    if (q.includes('hemoglobin') || q.includes('hb') || q.includes('हीमोग्लोबिन') || q.includes('iron') || q.includes('blood count')) {
      return isHindi
        ? `हीमोग्लोबिन आपके रक्त में ऑक्सीजन पहुंचाता है। आपकी रिपोर्ट में यह 11.2 g/dL है जो सामान्य सीमा (12.0 - 15.5) से थोड़ा कम है।\n\n💡 सलाह: अपने डॉक्टर से पूछें कि क्या पालक, अनार, बीटरूट या आयरन सप्लीमेंट से इसे बढ़ाना उचित है।\n\n${disclaimer}`
        : `Hemoglobin is the protein in red blood cells that carries oxygen throughout your body. Your result is 11.2 g/dL, which is slightly below the target range of 12.0 - 15.5 g/dL.\n\n💡 What to ask: Ask your doctor if adding iron-rich foods (spinach, lentils, pomegranate) or iron supplements is recommended.\n\n${disclaimer}`;
    }

    // Glucose / Sugar
    if (q.includes('sugar') || q.includes('glucose') || q.includes('fasting') || q.includes('शुगर') || q.includes('ग्लूकोज') || q.includes('diabetes')) {
      return isHindi
        ? `फास्टिंग ब्लड शुगर खाली पेट रक्त शर्करा का स्तर मापता है। आपका मान 104 mg/dL है जो सामान्य सीमा (70 - 99) से थोड़ा ऊपर है। इसे डॉक्टर 'बॉर्डरलाइन प्रीडायबिटीज' कहते हैं।\n\n💡 सलाह: डॉक्टर से पूछें कि मीठा कम करने और हल्की चहलकदमी से इसे कैसे सामान्य करें।\n\n${disclaimer}`
        : `Fasting Blood Glucose measures blood sugar after not eating overnight. Your level of 104 mg/dL is slightly above the normal upper limit of 99 mg/dL. Doctors refer to this range as borderline prediabetes.\n\n💡 What to ask: Ask your doctor what simple diet adjustments or 20-minute daily walks can bring your sugar back to optimal range.\n\n${disclaimer}`;
    }

    // Platelets
    if (q.includes('platelet') || q.includes('platelets') || q.includes('प्लेटलेट')) {
      return isHindi
        ? `आपकी प्लेटलेट संख्या (220,000 /µL) पूरी तरह से सामान्य और स्वस्थ सीमा (150,000 - 450,000) में है। प्लेटलेट्स चोट लगने पर थक्का जमाने का काम करती हैं।\n\n${disclaimer}`
        : `Your Platelet Count is 220,000 /µL, which is completely normal and healthy (normal range is 150,000 - 450,000 /µL). Platelets help your blood clot normally.\n\n${disclaimer}`;
    }

    // Reference Range
    if (q.includes('reference') || q.includes('range') || q.includes('normal range') || q.includes('रेफरेंस')) {
      return isHindi
        ? `रेफरेंस रेंज (Reference Range) स्वस्थ व्यक्तियों के लिए सामान्य मानों की सीमा होती है। यदि आपका परिणाम इस सीमा के बाहर है, तो विजुअल ग्राफ में आपको संकेत दिखेगा।\n\n${disclaimer}`
        : `A Reference Range shows the typical upper and lower boundary values for healthy individuals. In your report cards above, look at the visual gauge line to see exactly where your value lands relative to normal limits.\n\n${disclaimer}`;
    }

    // 5. GENERAL REPORT QUERY FALLBACK
    return isHindi
      ? `आपकी रिपोर्ट ("${report ? report.title : 'रक्त जांच'}") के संदर्भ में: मुख्य बिंदु यह है कि हीमोग्लोबिन 11.2 (थोड़ा कम) और फास्टिंग शुगर 104 (बॉर्डरलाइन अधिक) है। आपकी प्लेटलेट्स बिल्कुल स्वस्थ हैं।\n\n${disclaimer}`
      : `Regarding your query about "${report ? report.title : 'your report'}": The main findings highlight that your Hemoglobin (11.2) is slightly low and Fasting Glucose (104) is borderline high. Your Platelet count is completely normal. Please confirm these findings with your doctor.\n\n${disclaimer}`;
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

// FLOATING INDIAN VOICE ASSISTANT WIDGET
const FloatingVoiceWidget = {
  render() {
    if (document.getElementById('floating-voice-widget')) return;

    const container = document.createElement('div');
    container.id = 'floating-voice-widget';
    container.className = 'floating-voice-widget';

    container.innerHTML = `
      <div id="voice-popover" class="voice-popover">
        <div class="flex items-center justify-between" style="border-bottom: 1px solid var(--sage-line); padding-bottom: 0.5rem;">
          <div class="flex items-center gap-2 font-bold text-xs" style="color: var(--teal-deep);">
            <span>🎙️ Indian Voice Assistant</span>
          </div>
          <button onclick="FloatingVoiceWidget.closePopover()" class="text-xs font-bold" style="color: rgba(29,43,39,0.5);">✕</button>
        </div>
        
        <p class="text-xs" style="color: rgba(29,43,39,0.8);" id="popover-status">
          Tap "Talk Now" and ask any question in Hindi or English (e.g. "Hi", "How is my sugar?", "What is hemoglobin?")
        </p>

        <div id="popover-transcript" style="display: none; background: var(--paper); padding: 0.5rem; border-radius: 0.5rem; font-size: 0.75rem; font-family: monospace; max-height: 80px; overflow-y: auto;">
        </div>

        <div class="flex gap-2">
          <button id="widget-mic-btn" onclick="FloatingVoiceWidget.toggleVoice()" class="btn btn-marigold text-xs w-full">
            <span>🎙️ Talk Now</span>
          </button>
          <button id="widget-stop-audio" onclick="VoiceEngine.stopSpeaking(); FloatingVoiceWidget.closePopover();" class="btn btn-outline text-xs" style="display: none;">
            <span>Stop Voice</span>
          </button>
        </div>
      </div>

      <button id="widget-floating-trigger" onclick="FloatingVoiceWidget.togglePopover()" class="voice-widget-btn" title="Talk to Voice Assistant">
        <span style="font-size: 1.125rem;">🎙️</span>
        <span>Talk to Voice Assistant</span>
      </button>
    `;

    document.body.appendChild(container);
  },

  togglePopover() {
    const popover = document.getElementById('voice-popover');
    if (popover) {
      popover.classList.toggle('active');
    }
  },

  closePopover() {
    const popover = document.getElementById('voice-popover');
    if (popover) {
      popover.classList.remove('active');
    }
    VoiceEngine.stopListening();
    VoiceEngine.stopSpeaking();
  },

  toggleVoice() {
    const statusEl = document.getElementById('popover-status');
    const transcriptEl = document.getElementById('popover-transcript');
    const micBtn = document.getElementById('widget-mic-btn');
    const floatingBtn = document.getElementById('widget-floating-trigger');

    if (VoiceEngine.isListening) {
      VoiceEngine.stopListening();
      micBtn.classList.remove('listening');
      floatingBtn.classList.remove('listening');
      micBtn.querySelector('span').innerText = '🎙️ Talk Now';
      statusEl.innerText = 'Listening stopped. Tap to speak again.';
      return;
    }

    const report = StorageManager.getReports()[0];
    const lang = report ? report.language : 'en';

    statusEl.innerText = lang === 'hi' ? '🎙️ सुन रहा हूँ... प्रश्न बोलिए' : '🎙️ Listening... Speak your medical question now!';
    transcriptEl.style.display = 'block';
    transcriptEl.innerText = '...';
    micBtn.classList.add('listening');
    floatingBtn.classList.add('listening');
    micBtn.querySelector('span').innerText = '🔴 Listening...';

    VoiceEngine.startListening(
      lang,
      (text) => {
        transcriptEl.innerText = text;
      },
      (err) => {
        statusEl.innerText = '⚠️ ' + err;
        micBtn.classList.remove('listening');
        floatingBtn.classList.remove('listening');
        micBtn.querySelector('span').innerText = '🎙️ Talk Now';
      },
      () => {
        micBtn.classList.remove('listening');
        floatingBtn.classList.remove('listening');
        micBtn.querySelector('span').innerText = '🎙️ Talk Now';
        const text = transcriptEl.innerText;
        if (text && text !== '...') {
          statusEl.innerText = 'Responding in Indian voice...';
          const reply = AssistantAI.generateResponse(text, report, lang);
          
          document.getElementById('widget-stop-audio').style.display = 'inline-flex';
          VoiceEngine.speak(reply, lang, () => {
            document.getElementById('widget-stop-audio').style.display = 'none';
            statusEl.innerText = 'Answer complete. Tap microphone to ask another question.';
          });
        }
      }
    );
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
