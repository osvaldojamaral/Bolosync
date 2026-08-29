/**
 * Fast Rule-Based Navigation & Voice Command Intent Detector
 * Evaluates transcripts in Hindi, Punjabi, English, and Hinglish for sub-100ms instant navigation.
 */

export type NavigationCommandType =
  | "menu"
  | "topic"
  | "call_helpline"
  | "confirm_yes"
  | "confirm_no"
  | "repeat"
  | "slower"
  | "go_back"
  | "start_over"
  | "stop"
  | "change_language";

export interface NavigationMatch {
  isNavigation: boolean;
  commandType?: NavigationCommandType;
  topic?: string;
  targetHelpline?: {
    number: string;
    name: string;
  };
  spokenResponse: {
    hi: string;
    pa: string;
    en: string;
  };
  speechRate?: number;
}

const TOPIC_DETAILS: Record<
  string,
  {
    name_hi: string;
    name_pa: string;
    name_en: string;
    overview_hi: string;
    overview_pa: string;
    overview_en: string;
    helpline: string;
    helpline_name: string;
  }
> = {
  scheme: {
    name_hi: "सरकारी योजनाएं",
    name_pa: "ਸਰਕਾਰੀ ਸਕੀਮਾਂ",
    name_en: "Government Schemes",
    overview_hi: "ठीक है, सरकारी योजनाएं अनुभाग। आप पीएम-किसान, आवास योजना, या राशन कार्ड के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਪੀਐੱਮ-ਕਿਸਾਨ, ਆਵਾਸ ਯੋਜਨਾ, ਜਾਂ ਰਾਸ਼ਨ ਕਾਰਡ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Government Schemes section. You can ask about PM-KISAN, Housing Scheme, or Ration Cards. What would you like to know?",
    helpline: "155261",
    helpline_name: "PM-KISAN Helpline",
  },
  health: {
    name_hi: "स्वास्थ्य और प्राथमिक उपचार",
    name_pa: "ਸਿਹਤ ਅਤੇ ਮੁੱਢਲੀ ਸਹਾਇਤਾ",
    name_en: "Health & First Aid",
    overview_hi: "ठीक है, स्वास्थ्य अनुभाग। आप प्राथमिक उपचार, ओआरएस घोल, बुखार, या आयुष्मान भारत के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਸਿਹਤ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਮੁੱਢਲੀ ਸਹਾਇਤਾ, ਓਆਰਐਸ, ਬੁਖ਼ਾਰ, ਜਾਂ ਆਯੁਸ਼ਮਾਨ ਭਾਰਤ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Health section. You can ask about first aid, ORS fluids, fever care, or Ayushman Bharat. What would you like to know?",
    helpline: "108",
    helpline_name: "National Emergency Ambulance",
  },
  farming: {
    name_hi: "खेती और फसल सलाह",
    name_pa: "ਖੇਤੀਬਾੜੀ ਅਤੇ ਫ਼ਸਲ ਸਲਾਹ",
    name_en: "Farming & Crop Advisories",
    overview_hi: "ठीक है, खेती-बाड़ी अनुभाग। आप फसल कीट रोकथाम, प्राकृतिक खाद, या मौसम आधारित बुवाई के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਖੇਤੀਬਾੜੀ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਕੀੜੇ-ਮਕੌੜੇ ਰੋਕਥਾਮ, ਕੁਦਰਤੀ ਖਾਦ, ਜਾਂ ਬਿਜਾਈ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Farming section. You can ask about pest control, natural bio-fertilizers, or seasonal sowing. What would you like to know?",
    helpline: "1800-180-1551",
    helpline_name: "Kisan Call Center",
  },
  jobs: {
    name_hi: "रोजगार और नौकरी",
    name_pa: "ਰੋਜ਼ਗਾਰ ਅਤੇ ਨੌਕਰੀਆਂ",
    name_en: "Jobs & Employment",
    overview_hi: "ठीक है, रोजगार अनुभाग। आप मनरेगा जॉब कार्ड, कौशल विकास, या अप्रेंटिसशिप भर्ती के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਰੋਜ਼ਗਾਰ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਮਨਰੇਗਾ ਜੌਬ ਕਾਰਡ, ਹੁਨਰ ਵਿਕਾਸ, ਜਾਂ ਭਰਤੀਆਂ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Jobs section. You can ask about MGNREGA Job Cards, Skill Development, or apprenticeships. What would you like to know?",
    helpline: "1800-425-1514",
    helpline_name: "National Career Service",
  },
  education: {
    name_hi: "शिक्षा और छात्रवृत्ति",
    name_pa: "ਸਿੱਖਿਆ ਅਤੇ ਵਜ਼ੀਫੇ",
    name_en: "Education & Scholarships",
    overview_hi: "ठीक है, शिक्षा अनुभाग। आप राष्ट्रीय छात्रवृत्ति (NSP), आरटीई मुफ्त दाखिला, या विद्यालक्ष्मी लोन के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਸਿੱਖਿਆ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਰਾਸ਼ਟਰੀ ਸਕਾਲਰਸ਼ਿਪ (NSP), ਮੁਫ਼ਤ ਦਾਖਲੇ, ਜਾਂ ਵਿਦਿਆਲਕਸ਼ਮੀ ਕਰਜ਼ੇ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Education section. You can ask about National Scholarships (NSP), RTE free admissions, or education loans. What would you like to know?",
    helpline: "0120-6619540",
    helpline_name: "National Scholarship Portal Helpline",
  },
  finance: {
    name_hi: "बैंकिंग और वित्तीय सुरक्षा",
    name_pa: "ਬੈਂਕਿੰਗ ਅਤੇ ਵਿੱਤੀ ਸੁਰੱਖਿਆ",
    name_en: "Banking & Financial Security",
    overview_hi: "ठीक है, बैंकिंग अनुभाग। आप जन धन योजना, अटल पेंशन, या साइबर धोखाधड़ी शिकायत के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਬੈਂਕਿੰਗ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਜਨ ਧਨ ਯੋਜਨਾ, ਅਟਲ ਪੈਨਸ਼ਨ, ਜਾਂ ਸਾਈਬਰ ਧੋਖਾਧੜੀ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Banking section. You can ask about Jan Dhan accounts, Atal Pension, or reporting cyber fraud. What would you like to know?",
    helpline: "1930",
    helpline_name: "National Cyber Crime Helpline",
  },
  legal: {
    name_hi: "मुफ्त कानूनी सहायता",
    name_pa: "ਮੁਫ਼ਤ ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ",
    name_en: "Free Legal Aid",
    overview_hi: "ठीक है, कानूनी सहायता अनुभाग। आप नालसा मुफ्त वकील, टेली-लॉ, या महिला अधिकारों के बारे में पूछ सकते हैं। आप क्या जानना चाहते हैं?",
    overview_pa: "ਠੀਕ ਹੈ, ਕਾਨੂੰਨੀ ਸਹਾਇਤਾ ਸੈਕਸ਼ਨ। ਤੁਸੀਂ ਨਾਲਸਾ ਮੁਫ਼ਤ ਵਕੀਲ, ਟੈਲੀ-ਲਾਅ, ਜਾਂ ਔਰਤਾਂ ਦੇ ਹੱਕਾਂ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    overview_en: "Okay, Legal Aid section. You can ask about NALSA free lawyers, Tele-Law, or legal rights. What would you like to know?",
    helpline: "15100",
    helpline_name: "National Legal Services Helpline",
  },
};

export function checkNavigationIntent(
  rawTranscript: string,
  context?: {
    currentTopic?: string;
    pendingAction?: { type: string; helpline: string; name: string };
    lastSpokenAnswer?: string;
  }
): NavigationMatch | null {
  const text = (rawTranscript || "").trim().toLowerCase();
  if (!text) return null;

  // 1. Language Change Command
  if (
    /^(change language|switch language|choose language|भाषा बदलो|भाषा बदलें|ਭਾਸ਼ਾ ਬਦਲੋ|ਬੋਲੀ ਬਦਲੋ|language badlo|bhasha badlo)$/i.test(
      text
    ) ||
    text.includes("change language") ||
    text.includes("भाषा बदलो") ||
    text.includes("ਭਾਸ਼ਾ ਬਦਲੋ")
  ) {
    return {
      isNavigation: true,
      commandType: "change_language",
      spokenResponse: {
        hi: "भाषा चयन शुरू किया जा रहा है।",
        pa: "ਭਾਸ਼ਾ ਦੀ ਚੋਣ ਸ਼ੁਰੂ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ।",
        en: "Starting spoken language selection.",
      },
    };
  }

  // 2. Pending Action Confirmation (Yes / No)
  if (context?.pendingAction) {
    const isYes =
      /^(yes|yeah|yep|sure|proceed|ok|okay|confirm|call|हाँ|हां|जी हाँ|जी हां|ਹਾਂ|ਹਾਂਜੀ|ਕਰੋ|कॉल करो|call now)$/i.test(
        text
      ) ||
      text.includes("yes") ||
      text.includes("हां") ||
      text.includes("हाँ") ||
      text.includes("ਹਾਂ");

    const isNo =
      /^(no|nope|cancel|stop|dont|don't|नहीं|ना|मत करो|ਕੈਂਸਲ|ਨਹੀਂ|ਨਾ)$/i.test(
        text
      ) ||
      text.includes("no") ||
      text.includes("नहीं") ||
      text.includes("ਨਹੀਂ");

    if (isYes) {
      return {
        isNavigation: true,
        commandType: "confirm_yes",
        targetHelpline: {
          number: context.pendingAction.helpline,
          name: context.pendingAction.name,
        },
        spokenResponse: {
          hi: `अभी ${context.pendingAction.name}, नंबर ${context.pendingAction.helpline} पर कॉल मिला रही हूँ।`,
          pa: `ਹੁਣੇ ${context.pendingAction.name}, ਨੰਬਰ ${context.pendingAction.helpline} 'ਤੇ ਕਾਲ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ।`,
          en: `Connecting call now to ${context.pendingAction.name} on ${context.pendingAction.helpline}.`,
        },
      };
    }

    if (isNo) {
      return {
        isNavigation: true,
        commandType: "confirm_no",
        spokenResponse: {
          hi: "कॉल रद्द कर दी गई है। आप कोई अन्य सवाल पूछ सकते हैं।",
          pa: "ਕਾਲ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਤੁਸੀਂ ਕੋਈ ਹੋਰ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
          en: "Call cancelled. You can ask any other question.",
        },
      };
    }
  }

  // 3. Helpline Call Request
  if (
    /^(call|call helpline|dial helpline|call the helpline|call kisan|call ambulance|call police|call for scheme|call for health|हेल्पलाइन पर कॉल करो|कॉल करो|हेल्पलाइन मिलाओ|ਨੰਬਰ ਮਿਲਾਓ|ਕਾਲ ਕਰੋ|ਫੋਨ ਕਰੋ)$/i.test(
      text
    ) ||
    text.includes("call helpline") ||
    text.includes("call the helpline") ||
    text.includes("कॉल करो") ||
    text.includes("हेल्पलाइन मिलाओ") ||
    text.includes("ਕਾਲ ਕਰੋ")
  ) {
    // Determine which helpline based on context or current topic
    const topicKey = context?.currentTopic || "scheme";
    const topic = TOPIC_DETAILS[topicKey] || TOPIC_DETAILS.scheme;

    return {
      isNavigation: true,
      commandType: "call_helpline",
      targetHelpline: {
        number: topic.helpline,
        name: topic.helpline_name,
      },
      spokenResponse: {
        hi: `यह ${topic.helpline_name} नंबर, ${topic.helpline} पर कॉल करेगा। क्या मैं अभी कॉल करूँ? बोलें 'हाँ' या 'नहीं'।`,
        pa: `ਇਹ ${topic.helpline_name} ਨੰਬਰ, ${topic.helpline} 'ਤੇ ਕਾਲ ਕਰੇਗਾ। ਕੀ ਮੈਂ ਹੁਣੇ ਕਾਲ ਕਰਾਂ? ਬੋਲੋ 'ਹਾਂ' ਜਾਂ 'ਨਹੀਂ'।`,
        en: `This will place a call to ${topic.helpline_name} at ${topic.helpline}. Shall I place the call now? Say 'yes' or 'no'.`,
      },
    };
  }

  // 4. Repeat / Say That Again
  if (
    /^(repeat|say that again|repeat that|replay|speak again|दोबारा बोलो|दोबारा बताएं|फिर से बोलो|ਫਿਰ ਬੋਲੋ|ਦੁਬਾਰਾ ਬੋਲੋ|ek baar fir)$/i.test(
      text
    ) ||
    text.includes("repeat") ||
    text.includes("say that again") ||
    text.includes("दोबारा बोलो") ||
    text.includes("फिर से बोलो") ||
    text.includes("ਫਿਰ ਬੋਲੋ")
  ) {
    return {
      isNavigation: true,
      commandType: "repeat",
      spokenResponse: {
        hi: context?.lastSpokenAnswer || "दोबारा सुनाया जा रहा है।",
        pa: context?.lastSpokenAnswer || "ਦੁਬਾਰਾ ਸੁਣਾਇਆ ਜਾ ਰਿਹਾ ਹੈ।",
        en: context?.lastSpokenAnswer || "Repeating last answer.",
      },
    };
  }

  // 5. Slower / Simplify / I didn't understand
  if (
    /^(slower|speak slower|slow down|i didn't understand|i did not understand|explain simply|simpler|धीरे बोलो|धीमी आवाज|समझ नहीं आया|सरल भाषा में बताओ|ਹੌਲੀ ਬੋਲੋ|ਸਮਝ ਨਹੀਂ ਆਇਆ)$/i.test(
      text
    ) ||
    text.includes("slower") ||
    text.includes("slow down") ||
    text.includes("धीरे बोलो") ||
    text.includes("समझ नहीं आया") ||
    text.includes("ਹੌਲੀ ਬੋਲੋ")
  ) {
    return {
      isNavigation: true,
      commandType: "slower",
      speechRate: 0.8,
      spokenResponse: {
        hi: context?.lastSpokenAnswer
          ? `सरल शब्दों में: ${context.lastSpokenAnswer}`
          : "धीमी गति से बताया जा रहा है। आप क्या जानना चाहते हैं?",
        pa: context?.lastSpokenAnswer
          ? `ਸੌਖੇ ਸ਼ਬਦਾਂ ਵਿੱਚ: ${context.lastSpokenAnswer}`
          : "ਹੌਲੀ ਗਤੀ ਨਾਲ ਸਮਝਾਇਆ ਜਾ ਰਿਹਾ ਹੈ। ਤੁਸੀਂ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
        en: context?.lastSpokenAnswer
          ? `In simpler words: ${context.lastSpokenAnswer}`
          : "Explaining at a slower pace. What would you like to know?",
      },
    };
  }

  // 6. Menu / What can you help with?
  if (
    /^(what can you help with\??|help|menu|options|what can you do\??|options menu|मदद|मेनू|आप क्या कर सकते हैं\??|विकल्प|ਮਦਦ|ਮੈਨੂੰ ਕੀ ਮਦਦ ਮਿਲੇਗੀ\??|ਮੁੱਖ ਮੈਨੂ)$/i.test(
      text
    ) ||
    false
  ) {
    return {
      isNavigation: true,
      commandType: "menu",
      spokenResponse: {
        hi: "मैं 4 मुख्य क्षेत्रों में मदद कर सकती हूँ: 1. सरकारी योजनाएं, 2. स्वास्थ्य और प्राथमिक उपचार, 3. खेती और फसल सलाह, 4. सरकारी हेल्पलाइन पर कॉल। आप किसी भी विषय का नाम बोलें।",
        pa: "ਮੈਂ 4 ਮੁੱਖ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ: 1. ਸਰਕਾਰੀ ਸਕੀਮਾਂ, 2. ਸਿਹਤ ਅਤੇ ਮੁੱਢਲੀ ਸਹਾਇਤਾ, 3. ਖੇਤੀਬਾੜੀ ਸਲਾਹ, 4. ਹੈਲਪਲਾਈਨ 'ਤੇ ਕਾਲ। ਤੁਸੀਂ ਕਿਸੇ ਵੀ ਵਿਸ਼ੇ ਦਾ ਨਾਮ ਬੋਲੋ।",
        en: "I can help with 4 main areas: 1. Government Schemes, 2. Health and First Aid, 3. Farming and Crop Advice, 4. Calling Helplines. Just say the name of a topic.",
      },
    };
  }

  // 7. Go Back / Back
  if (
    /^(go back|back|previous|previous menu|वापस जाओ|पीछे जाओ|वापस|ਪਿੱਛੇ|ਵਾਪਸ ਜਾਓ|ਪਿੱਛੇ ਜਾਓ)$/i.test(
      text
    ) ||
    text === "back" ||
    text === "वापस" ||
    text === "ਪਿੱਛੇ"
  ) {
    return {
      isNavigation: true,
      commandType: "go_back",
      spokenResponse: {
        hi: "ठीक है, मुख्य मेनू पर वापस आ गए हैं। आप योजना, स्वास्थ्य, या खेती के बारे में पूछ सकते हैं।",
        pa: "ਠੀਕ ਹੈ, ਮੁੱਖ ਮੈਨੂ 'ਤੇ ਵਾਪਸ ਆ ਗਏ ਹਾਂ। ਤੁਸੀਂ ਸਕੀਮਾਂ, ਸਿਹਤ, ਜਾਂ ਖੇਤੀ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
        en: "Okay, returned to the main menu. You can ask about schemes, health, or farming.",
      },
    };
  }

  // 8. Start Over / Home
  if (
    /^(start over|home|main menu|restart|reset|शुरू से|होम|मुख्य मेनू|ਮੁੱਖ ਮੈਨੂ|ਸ਼ੁਰੂ ਤੋਂ|ਹੋਮ)$/i.test(
      text
    ) ||
    text === "home" ||
    text === "होम" ||
    text === "restart"
  ) {
    return {
      isNavigation: true,
      commandType: "start_over",
      spokenResponse: {
        hi: "शुरुआत पर वापस आ गए हैं। मैं बोलोसिंक हूँ। आप योजनाओं, स्वास्थ्य, या खेती के बारे में कुछ भी पूछ सकते हैं।",
        pa: "ਸ਼ੁਰੂਆਤ 'ਤੇ ਵਾਪਸ ਆ ਗਏ ਹਾਂ। ਮੈਂ ਬੋਲੋਸਿੰਕ ਹਾਂ। ਤੁਸੀਂ ਸਕੀਮਾਂ, ਸਿਹਤ, ਜਾਂ ਖੇਤੀ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
        en: "Started over. I am BoloSync. You can ask about schemes, health, or farming anytime.",
      },
    };
  }

  // 9. Stop / Quiet
  if (
    /^(stop|quiet|silence|cancel|bye|रुक जाओ|रुकिए|बस|शांत|ਰੁਕੋ|ਬੱਸ|ਰੁਕ ਜਾਓ)$/i.test(
      text
    ) ||
    text === "stop" ||
    text === "बस" ||
    text === "रुक जाओ"
  ) {
    return {
      isNavigation: true,
      commandType: "stop",
      spokenResponse: {
        hi: "ठीक है, जब भी मदद चाहिए हो, माइक दबाकर बोलें।",
        pa: "ਠੀਕ ਹੈ, ਜਦੋਂ ਵੀ ਮਦਦ ਚਾਹੀਦੀ ਹੋਵੇ, ਮਾਈਕ ਦਬਾ ਕੇ ਬੋਲੋ।",
        en: "Understood. Tap the mic whenever you need assistance.",
      },
    };
  }

  // 10. Topic Navigation (e.g., "schemes", "health", "farming", "jobs", "education", "finance", "legal")
  for (const [topicKey, info] of Object.entries(TOPIC_DETAILS)) {
    const isTopicMatch =
      (topicKey === "scheme" && /^(schemes?|yojana|yojanaye|योजना|योजनाएं|ਸਕੀਮਾਂ|ਸਕੀਮ|सरकारी योजना)$/i.test(text)) ||
      (topicKey === "health" && /^(health|doctor|swasthya|ilaj|स्वास्थ्य|इलाज|ਸਿਹਤ|ਡਾਕਟਰ|ਬਿਮਾਰੀ)$/i.test(text)) ||
      (topicKey === "farming" && /^(farming|kheti|agriculture|crops?|खेती|फसल|ਕਿਸਾਨੀ|ਖੇਤੀ|ਫ਼ਸਲ)$/i.test(text)) ||
      (topicKey === "jobs" && /^(jobs?|employment|naukri|rozgar|नौकरी|रोजगार|ਨੌਕਰੀ|ਰੋਜ਼ਗਾਰ)$/i.test(text)) ||
      (topicKey === "education" && /^(education|scholarship|shiksha|padhai|शिक्षा|पढ़ाई|ਵਜ਼ੀਫ਼ਾ|ਸਿੱਖਿਆ)$/i.test(text)) ||
      (topicKey === "finance" && /^(finance|banking|bank|paisa|बैंकिंग|पैसा|बैंक|ਬੈਂਕਿੰਗ)$/i.test(text)) ||
      (topicKey === "legal" && /^(legal|law|kanoon|nyay|कानून|न्याय|ਵਕੀਲ|ਕਾਨੂੰਨ)$/i.test(text));

    if (isTopicMatch) {
      return {
        isNavigation: true,
        commandType: "topic",
        topic: topicKey,
        targetHelpline: {
          number: info.helpline,
          name: info.helpline_name,
        },
        spokenResponse: {
          hi: info.overview_hi,
          pa: info.overview_pa,
          en: info.overview_en,
        },
      };
    }
  }

  return null;
}
