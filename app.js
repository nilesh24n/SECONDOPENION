// Second Opinion - Pure Vanilla JS Application Core

const STORAGE_KEYS = {
  USER: 'second_opinion_user',
  REPORTS: 'second_opinion_reports',
  CHAT_PREFIX: 'second_opinion_chat_'
};

// MANDATORY SAFETY DISCLAIMERS
const MANDATORY_DISCLAIMER = {
  en: 'This is not a medical diagnosis. Please discuss this with your doctor.',
  hi: 'यह कोई चिकित्सीय निदान नहीं है। कृपया अपने डॉक्टर से इस पर चर्चा करें।'
};

// SAMPLE DEMO REPORT
const DEMO_REPORT = {
  id: 'rep_demo_cbc_123',
  user_id: 'demo_patient_123',
  title: 'Complete Blood Count & Glucose Report',
  document_type: 'Blood Test',
  language: 'en',
  file_name: 'blood_test_report.pdf',
  summary_explanation: 'Your blood report shows standard blood cell counts and glucose levels. Your Hemoglobin and Fasting Blood Sugar are slightly outside the typical reference range, while your Platelets and White Blood Cells are healthy and normal.',
  key_findings: [
    {
      id: 'f1',
      term: 'Hemoglobin (Hb)',
      original_value: '11.2 g/dL',
      reference_range: '12.0 - 15.5 g/dL',
      is_normal: false,
      status: 'out_of_range',
      plain_explanation: 'Hemoglobin is the protein in red blood cells that carries oxygen throughout your body. Your value of 11.2 g/dL is slightly below the target minimum of 12.0 g/dL.',
      what_to_ask_doctor: 'Ask your doctor if dietary iron or vitamin intake is recommended.'
    },
    {
      id: 'f2',
      term: 'Fasting Blood Glucose',
      original_value: '104 mg/dL',
      reference_range: '70 - 99 mg/dL',
      is_normal: false,
      status: 'out_of_range',
      plain_explanation: 'This measures blood sugar after fasting overnight. 104 mg/dL is slightly elevated above the 99 mg/dL threshold (borderline prediabetes).',
      what_to_ask_doctor: 'Ask your doctor what dietary tweaks can keep blood sugar in optimal range.'
    },
    {
      id: 'f3',
      term: 'Platelet Count',
      original_value: '220,000 /µL',
      reference_range: '150,000 - 450,000 /µL',
      is_normal: true,
      status: 'normal',
      plain_explanation: 'Platelets help your blood clot normally. Your count is completely normal and healthy.',
      what_to_ask_doctor: null
    }
  ],
  unclear_flags: [
    'Doctor signature stamp slightly obscured bottom lab notes on page 1.'
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

// ROBUST VOICE ENGINE (STT & TTS FOR MOBILE & DESKTOP)
const VoiceEngine = {
  synth: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null,
  activeRecognition: null,
  isListening: false,

  isSTTSupported() {
    return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  },

  isTTSSupported() {
    return !!this.synth;
  },

  // Start fresh SpeechRecognition instance on tap
  startListening(language = 'en', onResult, onError, onEnd) {
    if (!this.isSTTSupported()) {
      if (onError) onError('Voice microphone input is not supported on this browser. Try Chrome or Safari.');
      return false;
    }

    this.stopListening();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

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

    // Clean markdown/emojis for smooth speech synthesis
    const cleanText = text
      .replace(/[#*`_~]/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

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

// COMMON HEADER RENDERER
function renderNav() {
  const user = StorageManager.getUser();
  const userContainer = document.getElementById('nav-user-container');
  if (!userContainer) return;

  if (user) {
    userContainer.innerHTML = `
      <div class="user-badge">
        <span>👤</span>
        <span>${user.name || user.email}</span>
      </div>
      <button onclick="handleSignOut()" style="color: rgba(29,43,39,0.6); padding: 0.25rem 0.5rem; font-size: 0.875rem;" title="Sign Out">
        🚪
      </button>
    `;
  } else {
    userContainer.innerHTML = `
      <a href="auth.html" class="nav-btn-primary">
        <span>Sign In</span>
      </a>
    `;
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
      ? 'आपकी रक्त रिपोर्ट मुख्य रूप से हीमोग्लोबिन और फास्टिंग ग्लूकोज के स्तर में मामूली बदलाव दिखाती है। प्लेटलेट्स पूरी तरह से स्वस्थ सीमा में हैं।'
      : 'Your blood report shows standard cell counts and glucose levels. Your Hemoglobin and Fasting Blood Sugar are slightly outside the typical reference range, while your Platelets are healthy and normal.',
    key_findings: [
      {
        id: 'f1',
        term: 'Hemoglobin (Hb)',
        original_value: '11.2 g/dL',
        reference_range: '12.0 - 15.5 g/dL',
        is_normal: false,
        status: 'out_of_range',
        plain_explanation: language === 'hi'
          ? 'हीमोग्लोबिन रक्त में ऑक्सीजन ले जाता है। आपका स्तर 11.2 g/dL है जो 12.0 की सामान्य सीमा से थोड़ा कम है।'
          : 'Hemoglobin is the protein in red blood cells that carries oxygen. Your value of 11.2 g/dL is slightly below the target minimum of 12.0 g/dL.',
        what_to_ask_doctor: language === 'hi'
          ? 'डॉक्टर से पूछें कि क्या आहार में आयरन बढ़ाना आवश्यक है।'
          : 'Ask your doctor if dietary iron or vitamin intake is recommended.'
      },
      {
        id: 'f2',
        term: 'Fasting Blood Glucose',
        original_value: '104 mg/dL',
        reference_range: '70 - 99 mg/dL',
        is_normal: false,
        status: 'out_of_range',
        plain_explanation: language === 'hi'
          ? 'खाली पेट ब्लड शुगर 104 mg/dL है, जो सामान्य (99) से थोड़ा ऊपर है (प्रीडायबिटीज स्तर)।'
          : 'This measures blood sugar after fasting overnight. 104 mg/dL is slightly elevated above the 99 mg/dL threshold (borderline prediabetes).',
        what_to_ask_doctor: language === 'hi'
          ? 'डॉक्टर से आहार और जीवनशैली के सुझाव लें।'
          : 'Ask your doctor what dietary tweaks can keep blood sugar in optimal range.'
      },
      {
        id: 'f3',
        term: 'Platelet Count',
        original_value: '220,000 /µL',
        reference_range: '150,000 - 450,000 /µL',
        is_normal: true,
        status: 'normal',
        plain_explanation: language === 'hi'
          ? 'आपकी प्लेटलेट संख्या पूरी तरह से सामान्य और स्वस्थ सीमा में है।'
          : 'Platelets help your blood clot normally. Your count is completely normal and healthy.',
        what_to_ask_doctor: null
      }
    ],
    unclear_flags: [
      language === 'hi' ? 'निचले हिस्से में डॉक्टर स्टैम्प के कारण लैब् नोट धुंधला था।' : 'Doctor signature stamp slightly obscured bottom lab notes on page 1.'
    ],
    disclaimer: MANDATORY_DISCLAIMER[language],
    created_at: new Date().toISOString()
  };

  StorageManager.saveReport(report);
  window.location.href = `report.html?id=${reportId}`;
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
});
