// i18n.js: the 11 languages and the interface words in each script.
// code = API language code, tag = HTML lang attribute, speech = Web Speech locale.

const MATH1 = '$3x + 7 = 22$';
const FRAC = '$\\frac{3}{4}$';
const FRAC2 = '$\\frac{2}{3}$';

export const LANGS = [
  {
    code: 'hi-IN', tag: 'hi', speech: 'hi-IN', name: 'Hindi', native: 'हिन्दी', font: 'Noto Sans Devanagari',
    ui: {
      greet: 'नमस्ते', title: 'अपना सवाल बोलो, फ़ोटो लो या लिखो', sub: 'मैं एक-एक संकेत देकर तुम्हें जवाब तक ले चलूँगी।',
      ask: 'अपना सवाल यहाँ लिखो…', hint: 'संकेत', show: 'दिखाओ', pad: 'हल लिखो', teach: 'मुझे समझाओ', parent: 'माता-पिता के लिए वॉइस नोट',
      practice: '3 और अभ्यास', solution: 'तुम्हारा हल', words: 'सीखने वाले शब्द', ladder: 'संकेत की सीढ़ी', solved: 'हल हो गया!',
      solvedSelf: 'मैंने खुद हल किया', listen: 'सुनो', again: 'फिर सुनो', newp: 'नया सवाल', thinking: 'सोच रही हूँ…', listening: 'सुन रही हूँ…',
      start: 'सीखना शुरू करो', chooseLang: 'अपनी भाषा चुनो', yourClass: 'तुम्हारी कक्षा', check: 'मेरा चरण जाँचो', call: 'क्रिस्टीना से बात करो',
      offline: 'सोचने के लिए मुझे इंटरनेट चाहिए। सहेजी आवाज़ें अब भी चलेंगी।', keepGoing: 'गलतियों से ही हम सीखते हैं। चलो, एक छोटा कदम उठाएँ।',
      switchTo: '{x} में बदलें?', writeBigger: 'थोड़ा बड़ा लिखो, प्लीज़।', levels: ['आसान', 'वैसा ही', 'कठिन'],
      explain: 'अब तुम टीचर बनो। बताओ, तुमने कैसे हल किया।', sky: 'मेरा आसमान', problem: 'सवाल', you: 'तुम', tryAlone: 'अगला कदम बिना संकेत के आज़माओ!',
    },
    rungs: ['इशारा', 'अवधारणा', 'उदाहरण', 'अगला कदम'], mixes: ['शुद्ध', 'मिश्रित', '+ English'],
    examples: [`हल करो: ${MATH1}`, 'पौधों को धूप क्यों चाहिए?', `${FRAC} और ${FRAC2} में कौन बड़ा है?`],
  },
  {
    code: 'kn-IN', tag: 'kn', speech: 'kn-IN', name: 'Kannada', native: 'ಕನ್ನಡ', font: 'Noto Sans Kannada',
    ui: {
      greet: 'ನಮಸ್ಕಾರ', title: 'ನಿನ್ನ ಸಂದೇಹ ಹೇಳು, ಫೋಟೋ ತೆಗೆ ಅಥವಾ ಬರೆ', sub: 'ಒಂದೊಂದೇ ಸುಳಿವು ಕೊಡುತ್ತಾ ನಾನು ನಿನ್ನನ್ನು ಉತ್ತರದತ್ತ ಕರೆದೊಯ್ಯುತ್ತೇನೆ.',
      ask: 'ನಿನ್ನ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆ…', hint: 'ಸುಳಿವು', show: 'ತೋರಿಸು', pad: 'ಲೆಕ್ಕ ಬರೆ', teach: 'ನನಗೆ ವಿವರಿಸು', parent: 'ಪೋಷಕರಿಗೆ ಧ್ವನಿ ಸಂದೇಶ',
      practice: 'ಇನ್ನೂ 3 ಅಭ್ಯಾಸ', solution: 'ನಿನ್ನ ಪರಿಹಾರ', words: 'ಕಲಿಯಬೇಕಾದ ಪದಗಳು', ladder: 'ಸುಳಿವಿನ ಏಣಿ', solved: 'ಬಿಡಿಸಿದೆ!',
      solvedSelf: 'ನಾನೇ ಬಿಡಿಸಿದೆ', listen: 'ಕೇಳು', again: 'ಮತ್ತೆ ಕೇಳು', newp: 'ಹೊಸ ಪ್ರಶ್ನೆ', thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ…', listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ…',
      start: 'ಕಲಿಯಲು ಶುರು ಮಾಡು', chooseLang: 'ನಿನ್ನ ಭಾಷೆ ಆರಿಸು', yourClass: 'ನಿನ್ನ ತರಗತಿ', check: 'ನನ್ನ ಹಂತ ಪರಿಶೀಲಿಸು', call: 'ಕ್ರಿಸ್ಟಿನಾ ಜೊತೆ ಮಾತಾಡು',
      offline: 'ಯೋಚಿಸಲು ನನಗೆ ಇಂಟರ್ನೆಟ್ ಬೇಕು. ಉಳಿಸಿದ ಧ್ವನಿಗಳು ಇನ್ನೂ ಕೇಳುತ್ತವೆ.', keepGoing: 'ತಪ್ಪುಗಳಿಂದಲೇ ನಾವು ಕಲಿಯುತ್ತೇವೆ. ಒಂದು ಸಣ್ಣ ಹೆಜ್ಜೆ ಇಡೋಣ.',
      switchTo: '{x} ಗೆ ಬದಲಿಸಲೇ?', writeBigger: 'ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ದೊಡ್ಡದಾಗಿ ಬರೆ.', levels: ['ಸುಲಭ', 'ಅದೇ ರೀತಿ', 'ಕಠಿಣ'],
      explain: 'ಈಗ ನೀನೇ ಶಿಕ್ಷಕ. ಹೇಗೆ ಬಿಡಿಸಿದೆ ಎಂದು ನನಗೆ ವಿವರಿಸು.', sky: 'ನನ್ನ ಆಕಾಶ', problem: 'ಪ್ರಶ್ನೆ', you: 'ನೀನು', tryAlone: 'ಮುಂದಿನ ಹಂತವನ್ನು ಸುಳಿವಿಲ್ಲದೆ ಪ್ರಯತ್ನಿಸು!',
    },
    rungs: ['ಸೂಚನೆ', 'ಪರಿಕಲ್ಪನೆ', 'ಉದಾಹರಣೆ', 'ಮುಂದಿನ ಹಂತ'], mixes: ['ಶುದ್ಧ', 'ಮಿಶ್ರ', '+ English'],
    examples: [`ಬಿಡಿಸು: ${MATH1}`, 'ಸಸ್ಯಗಳಿಗೆ ಸೂರ್ಯನ ಬೆಳಕು ಏಕೆ ಬೇಕು?', `${FRAC} ಮತ್ತು ${FRAC2} ರಲ್ಲಿ ಯಾವುದು ದೊಡ್ಡದು?`],
  },
  {
    code: 'ta-IN', tag: 'ta', speech: 'ta-IN', name: 'Tamil', native: 'தமிழ்', font: 'Noto Sans Tamil',
    ui: {
      greet: 'வணக்கம்', title: 'உன் சந்தேகத்தைச் சொல், படம் எடு அல்லது எழுது', sub: 'ஒவ்வொரு குறிப்பாகக் கொடுத்து உன்னை விடைக்கு அழைத்துச் செல்வேன்.',
      ask: 'உன் கேள்வியை இங்கே எழுது…', hint: 'குறிப்பு', show: 'காட்டு', pad: 'வழிமுறை எழுது', teach: 'எனக்கு விளக்கு', parent: 'பெற்றோருக்கு குரல் செய்தி',
      practice: 'இன்னும் 3 பயிற்சி', solution: 'உன் தீர்வு', words: 'கற்க வேண்டிய சொற்கள்', ladder: 'குறிப்பு ஏணி', solved: 'தீர்த்துவிட்டாய்!',
      solvedSelf: 'நானே தீர்த்தேன்', listen: 'கேள்', again: 'மீண்டும் கேள்', newp: 'புதிய கேள்வி', thinking: 'யோசிக்கிறேன்…', listening: 'கேட்கிறேன்…',
      start: 'கற்கத் தொடங்கு', chooseLang: 'உன் மொழியைத் தேர்ந்தெடு', yourClass: 'உன் வகுப்பு', check: 'என் படியைச் சரிபார்', call: 'கிறிஸ்டினாவுடன் பேசு',
      offline: 'யோசிக்க எனக்கு இணையம் வேண்டும். சேமித்த குரல்கள் இன்னும் ஒலிக்கும்.', keepGoing: 'தவறுகளிலிருந்துதான் கற்கிறோம். ஒரு சிறிய படி எடுப்போம்.',
      switchTo: '{x} க்கு மாற்றவா?', writeBigger: 'கொஞ்சம் பெரிதாக எழுது.', levels: ['எளிது', 'அதே அளவு', 'கடினம்'],
      explain: 'இப்போது நீதான் ஆசிரியர். எப்படித் தீர்த்தாய் என்று விளக்கு.', sky: 'என் வானம்', problem: 'கேள்வி', you: 'நீ', tryAlone: 'அடுத்த படியைக் குறிப்பு இல்லாமல் முயற்சி செய்!',
    },
    rungs: ['தூண்டல்', 'கருத்து', 'உதாரணம்', 'அடுத்த படி'], mixes: ['தூய', 'கலப்பு', '+ English'],
    examples: [`தீர்: ${MATH1}`, 'தாவரங்களுக்கு சூரிய ஒளி ஏன் தேவை?', `${FRAC}, ${FRAC2} இல் எது பெரியது?`],
  },
  {
    code: 'te-IN', tag: 'te', speech: 'te-IN', name: 'Telugu', native: 'తెలుగు', font: 'Noto Sans Telugu',
    ui: {
      greet: 'నమస్కారం', title: 'నీ సందేహం చెప్పు, ఫోటో తీయి లేదా రాయి', sub: 'ఒక్కో సూచనతో నిన్ను జవాబు వరకు తీసుకెళ్తాను.',
      ask: 'నీ ప్రశ్న ఇక్కడ రాయి…', hint: 'సూచన', show: 'చూపించు', pad: 'సాధన రాయి', teach: 'నాకు వివరించు', parent: 'తల్లిదండ్రులకు వాయిస్ నోట్',
      practice: 'మరో 3 అభ్యాసాలు', solution: 'నీ సాధన', words: 'నేర్చుకోవాల్సిన పదాలు', ladder: 'సూచనల నిచ్చెన', solved: 'సాధించావు!',
      solvedSelf: 'నేనే సాధించాను', listen: 'విను', again: 'మళ్ళీ విను', newp: 'కొత్త ప్రశ్న', thinking: 'ఆలోచిస్తున్నాను…', listening: 'వింటున్నాను…',
      start: 'నేర్చుకోవడం మొదలుపెట్టు', chooseLang: 'నీ భాష ఎంచుకో', yourClass: 'నీ తరగతి', check: 'నా అడుగు సరిచూడు', call: 'క్రిస్టీనాతో మాట్లాడు',
      offline: 'ఆలోచించడానికి నాకు ఇంటర్నెట్ కావాలి. సేవ్ చేసిన వాయిస్‌లు ఇంకా వినిపిస్తాయి.', keepGoing: 'తప్పుల నుంచే మనం నేర్చుకుంటాం. ఒక చిన్న అడుగు వేద్దాం.',
      switchTo: '{x} కి మార్చనా?', writeBigger: 'కొంచెం పెద్దగా రాయి.', levels: ['సులభం', 'అదే స్థాయి', 'కష్టం'],
      explain: 'ఇప్పుడు నువ్వే టీచర్. ఎలా సాధించావో నాకు వివరించు.', sky: 'నా ఆకాశం', problem: 'ప్రశ్న', you: 'నువ్వు', tryAlone: 'తదుపరి అడుగును సూచన లేకుండా ప్రయత్నించు!',
    },
    rungs: ['సంకేతం', 'భావన', 'ఉదాహరణ', 'తదుపరి అడుగు'], mixes: ['శుద్ధ', 'మిశ్రమ', '+ English'],
    examples: [`సాధించు: ${MATH1}`, 'మొక్కలకు సూర్యరశ్మి ఎందుకు అవసరం?', `${FRAC}, ${FRAC2} లలో ఏది పెద్దది?`],
  },
  {
    code: 'ml-IN', tag: 'ml', speech: 'ml-IN', name: 'Malayalam', native: 'മലയാളം', font: 'Noto Sans Malayalam',
    ui: {
      greet: 'നമസ്കാരം', title: 'നിന്റെ സംശയം പറയൂ, ഫോട്ടോ എടുക്കൂ, അല്ലെങ്കിൽ എഴുതൂ', sub: 'ഓരോ സൂചനയായി ഞാൻ നിന്നെ ഉത്തരത്തിലേക്ക് നയിക്കാം.',
      ask: 'നിന്റെ ചോദ്യം ഇവിടെ എഴുതൂ…', hint: 'സൂചന', show: 'കാണിക്കൂ', pad: 'ക്രിയ എഴുതൂ', teach: 'എനിക്ക് വിശദീകരിക്കൂ', parent: 'രക്ഷിതാക്കൾക്ക് വോയ്സ് നോട്ട്',
      practice: '3 പരിശീലനം കൂടി', solution: 'നിന്റെ പരിഹാരം', words: 'പഠിക്കേണ്ട വാക്കുകൾ', ladder: 'സൂചനാ ഏണി', solved: 'ചെയ്തു തീർത്തു!',
      solvedSelf: 'ഞാൻ സ്വയം ചെയ്തു', listen: 'കേൾക്കൂ', again: 'വീണ്ടും കേൾക്കൂ', newp: 'പുതിയ ചോദ്യം', thinking: 'ആലോചിക്കുന്നു…', listening: 'കേൾക്കുന്നു…',
      start: 'പഠിക്കാൻ തുടങ്ങൂ', chooseLang: 'നിന്റെ ഭാഷ തിരഞ്ഞെടുക്കൂ', yourClass: 'നിന്റെ ക്ലാസ്', check: 'എന്റെ ഘട്ടം പരിശോധിക്കൂ', call: 'ക്രിസ്റ്റീനയോട് സംസാരിക്കൂ',
      offline: 'ചിന്തിക്കാൻ എനിക്ക് ഇന്റർനെറ്റ് വേണം. സേവ് ചെയ്ത ശബ്ദങ്ങൾ ഇപ്പോഴും കേൾക്കാം.', keepGoing: 'തെറ്റുകളിൽ നിന്നാണ് നാം പഠിക്കുന്നത്. ഒരു ചെറിയ ചുവട് വയ്ക്കാം.',
      switchTo: '{x} ലേക്ക് മാറ്റണോ?', writeBigger: 'കുറച്ചുകൂടി വലുതായി എഴുതൂ.', levels: ['എളുപ്പം', 'അതേ നില', 'കഠിനം'],
      explain: 'ഇനി നീയാണ് ടീച്ചർ. എങ്ങനെ ചെയ്തു എന്ന് എനിക്ക് വിശദീകരിക്കൂ.', sky: 'എന്റെ ആകാശം', problem: 'ചോദ്യം', you: 'നീ', tryAlone: 'അടുത്ത ഘട്ടം സൂചനയില്ലാതെ ശ്രമിക്കൂ!',
    },
    rungs: ['തുടക്കം', 'ആശയം', 'ഉദാഹരണം', 'അടുത്ത ഘട്ടം'], mixes: ['ശുദ്ധം', 'മിശ്രം', '+ English'],
    examples: [`പരിഹരിക്കൂ: ${MATH1}`, 'ചെടികൾക്ക് സൂര്യപ്രകാശം എന്തിന്?', `${FRAC}, ${FRAC2} ഇവയിൽ ഏതാണ് വലുത്?`],
  },
  {
    code: 'mr-IN', tag: 'mr', speech: 'mr-IN', name: 'Marathi', native: 'मराठी', font: 'Noto Sans Devanagari',
    ui: {
      greet: 'नमस्कार', title: 'तुझी शंका बोल, फोटो काढ किंवा लिही', sub: 'एकेक संकेत देत मी तुला उत्तरापर्यंत नेईन.',
      ask: 'तुझा प्रश्न इथे लिही…', hint: 'संकेत', show: 'दाखव', pad: 'पायऱ्या लिही', teach: 'मला समजावून सांग', parent: 'पालकांसाठी व्हॉइस नोट',
      practice: 'आणखी 3 सराव', solution: 'तुझी उकल', words: 'शिकायचे शब्द', ladder: 'संकेतांची शिडी', solved: 'सुटले!',
      solvedSelf: 'मी स्वतः सोडवले', listen: 'ऐक', again: 'पुन्हा ऐक', newp: 'नवीन प्रश्न', thinking: 'विचार करतेय…', listening: 'ऐकतेय…',
      start: 'शिकायला सुरुवात कर', chooseLang: 'तुझी भाषा निवड', yourClass: 'तुझा वर्ग', check: 'माझी पायरी तपास', call: 'क्रिस्टीनाशी बोल',
      offline: 'विचार करायला मला इंटरनेट हवे. जतन केलेले आवाज अजूनही ऐकू येतील.', keepGoing: 'चुकांमधूनच आपण शिकतो. चल, एक छोटे पाऊल टाकू.',
      switchTo: '{x} मध्ये बदलू का?', writeBigger: 'जरा मोठे लिही.', levels: ['सोपे', 'तसेच', 'कठीण'],
      explain: 'आता तू शिक्षक. कसे सोडवलेस ते मला समजावून सांग.', sky: 'माझे आकाश', problem: 'प्रश्न', you: 'तू', tryAlone: 'पुढची पायरी संकेताशिवाय करून बघ!',
    },
    rungs: ['इशारा', 'संकल्पना', 'उदाहरण', 'पुढची पायरी'], mixes: ['शुद्ध', 'मिश्र', '+ English'],
    examples: [`सोडव: ${MATH1}`, 'झाडांना सूर्यप्रकाश का लागतो?', `${FRAC} आणि ${FRAC2} मध्ये मोठा कोणता?`],
  },
  {
    code: 'bn-IN', tag: 'bn', speech: 'bn-IN', name: 'Bengali', native: 'বাংলা', font: 'Noto Sans Bengali',
    ui: {
      greet: 'নমস্কার', title: 'তোমার প্রশ্ন বলো, ছবি তোলো বা লেখো', sub: 'একটা একটা সংকেত দিয়ে আমি তোমাকে উত্তরে পৌঁছে দেব।',
      ask: 'তোমার প্রশ্ন এখানে লেখো…', hint: 'সংকেত', show: 'দেখাও', pad: 'কষে দেখাও', teach: 'আমাকে বোঝাও', parent: 'অভিভাবকদের জন্য ভয়েস নোট',
      practice: 'আরও ৩টি অনুশীলন', solution: 'তোমার সমাধান', words: 'শেখার শব্দ', ladder: 'সংকেতের সিঁড়ি', solved: 'সমাধান হয়েছে!',
      solvedSelf: 'আমি নিজেই সমাধান করেছি', listen: 'শোনো', again: 'আবার শোনো', newp: 'নতুন প্রশ্ন', thinking: 'ভাবছি…', listening: 'শুনছি…',
      start: 'শেখা শুরু করো', chooseLang: 'তোমার ভাষা বেছে নাও', yourClass: 'তোমার শ্রেণি', check: 'আমার ধাপ দেখো', call: 'ক্রিস্টিনার সাথে কথা বলো',
      offline: 'ভাবতে আমার ইন্টারনেট লাগবে। সংরক্ষিত কণ্ঠ এখনও শোনা যাবে।', keepGoing: 'ভুল থেকেই আমরা শিখি। চলো, ছোট্ট একটা ধাপ নিই।',
      switchTo: '{x}-এ বদলাবে?', writeBigger: 'একটু বড় করে লেখো।', levels: ['সহজ', 'একই রকম', 'কঠিন'],
      explain: 'এবার তুমি শিক্ষক। কীভাবে সমাধান করলে আমাকে বোঝাও।', sky: 'আমার আকাশ', problem: 'প্রশ্ন', you: 'তুমি', tryAlone: 'পরের ধাপটা সংকেত ছাড়াই চেষ্টা করো!',
    },
    rungs: ['ইঙ্গিত', 'ধারণা', 'উদাহরণ', 'পরের ধাপ'], mixes: ['বিশুদ্ধ', 'মিশ্র', '+ English'],
    examples: [`সমাধান করো: ${MATH1}`, 'গাছের সূর্যালোক কেন দরকার?', `${FRAC} আর ${FRAC2}-এর মধ্যে কোনটি বড়?`],
  },
  {
    code: 'gu-IN', tag: 'gu', speech: 'gu-IN', name: 'Gujarati', native: 'ગુજરાતી', font: 'Noto Sans Gujarati',
    ui: {
      greet: 'નમસ્તે', title: 'તારો સવાલ બોલ, ફોટો પાડ અથવા લખ', sub: 'એક-એક સંકેત આપીને હું તને જવાબ સુધી લઈ જઈશ.',
      ask: 'તારો સવાલ અહીં લખ…', hint: 'સંકેત', show: 'બતાવ', pad: 'રીત લખ', teach: 'મને સમજાવ', parent: 'વાલીઓ માટે વૉઇસ નોટ',
      practice: 'વધુ 3 મહાવરો', solution: 'તારો ઉકેલ', words: 'શીખવાના શબ્દો', ladder: 'સંકેતની સીડી', solved: 'ઉકેલાઈ ગયું!',
      solvedSelf: 'મેં જાતે ઉકેલ્યું', listen: 'સાંભળ', again: 'ફરી સાંભળ', newp: 'નવો સવાલ', thinking: 'વિચારું છું…', listening: 'સાંભળું છું…',
      start: 'શીખવાનું શરૂ કર', chooseLang: 'તારી ભાષા પસંદ કર', yourClass: 'તારું ધોરણ', check: 'મારું પગલું તપાસ', call: 'ક્રિસ્ટીના સાથે વાત કર',
      offline: 'વિચારવા માટે મને ઇન્ટરનેટ જોઈએ. સાચવેલા અવાજ હજી સંભળાશે.', keepGoing: 'ભૂલોમાંથી જ આપણે શીખીએ છીએ. ચાલ, એક નાનું પગલું ભરીએ.',
      switchTo: '{x} માં બદલું?', writeBigger: 'થોડું મોટું લખ.', levels: ['સરળ', 'એવું જ', 'અઘરું'],
      explain: 'હવે તું શિક્ષક. તેં કેવી રીતે ઉકેલ્યું તે મને સમજાવ.', sky: 'મારું આકાશ', problem: 'સવાલ', you: 'તું', tryAlone: 'આગળનું પગલું સંકેત વગર અજમાવ!',
    },
    rungs: ['ઇશારો', 'ખ્યાલ', 'ઉદાહરણ', 'આગળનું પગલું'], mixes: ['શુદ્ધ', 'મિશ્ર', '+ English'],
    examples: [`ઉકેલ: ${MATH1}`, 'છોડને સૂર્યપ્રકાશ કેમ જોઈએ?', `${FRAC} અને ${FRAC2} માં મોટું કયું?`],
  },
  {
    code: 'pa-IN', tag: 'pa', speech: 'pa-IN', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', font: 'Noto Sans Gurmukhi',
    ui: {
      greet: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', title: 'ਆਪਣਾ ਸਵਾਲ ਬੋਲੋ, ਫ਼ੋਟੋ ਖਿੱਚੋ ਜਾਂ ਲਿਖੋ', sub: 'ਇੱਕ-ਇੱਕ ਇਸ਼ਾਰਾ ਦੇ ਕੇ ਮੈਂ ਤੁਹਾਨੂੰ ਜਵਾਬ ਤੱਕ ਲੈ ਜਾਵਾਂਗੀ।',
      ask: 'ਆਪਣਾ ਸਵਾਲ ਇੱਥੇ ਲਿਖੋ…', hint: 'ਇਸ਼ਾਰਾ', show: 'ਦਿਖਾਓ', pad: 'ਹੱਲ ਲਿਖੋ', teach: 'ਮੈਨੂੰ ਸਮਝਾਓ', parent: 'ਮਾਪਿਆਂ ਲਈ ਵੌਇਸ ਨੋਟ',
      practice: '3 ਹੋਰ ਅਭਿਆਸ', solution: 'ਤੁਹਾਡਾ ਹੱਲ', words: 'ਸਿੱਖਣ ਵਾਲੇ ਸ਼ਬਦ', ladder: 'ਇਸ਼ਾਰਿਆਂ ਦੀ ਪੌੜੀ', solved: 'ਹੱਲ ਹੋ ਗਿਆ!',
      solvedSelf: 'ਮੈਂ ਆਪ ਹੱਲ ਕੀਤਾ', listen: 'ਸੁਣੋ', again: 'ਫਿਰ ਸੁਣੋ', newp: 'ਨਵਾਂ ਸਵਾਲ', thinking: 'ਸੋਚ ਰਹੀ ਹਾਂ…', listening: 'ਸੁਣ ਰਹੀ ਹਾਂ…',
      start: 'ਸਿੱਖਣਾ ਸ਼ੁਰੂ ਕਰੋ', chooseLang: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ', yourClass: 'ਤੁਹਾਡੀ ਜਮਾਤ', check: 'ਮੇਰਾ ਕਦਮ ਜਾਂਚੋ', call: 'ਕ੍ਰਿਸਟੀਨਾ ਨਾਲ ਗੱਲ ਕਰੋ',
      offline: 'ਸੋਚਣ ਲਈ ਮੈਨੂੰ ਇੰਟਰਨੈੱਟ ਚਾਹੀਦਾ ਹੈ। ਸੰਭਾਲੀਆਂ ਆਵਾਜ਼ਾਂ ਹਾਲੇ ਵੀ ਚੱਲਣਗੀਆਂ।', keepGoing: 'ਗ਼ਲਤੀਆਂ ਤੋਂ ਹੀ ਅਸੀਂ ਸਿੱਖਦੇ ਹਾਂ। ਆਓ, ਇੱਕ ਛੋਟਾ ਕਦਮ ਚੁੱਕੀਏ।',
      switchTo: '{x} ਵਿੱਚ ਬਦਲਾਂ?', writeBigger: 'ਥੋੜ੍ਹਾ ਵੱਡਾ ਲਿਖੋ।', levels: ['ਸੌਖਾ', 'ਉਸੇ ਤਰ੍ਹਾਂ', 'ਔਖਾ'],
      explain: 'ਹੁਣ ਤੁਸੀਂ ਅਧਿਆਪਕ ਹੋ। ਦੱਸੋ ਤੁਸੀਂ ਕਿਵੇਂ ਹੱਲ ਕੀਤਾ।', sky: 'ਮੇਰਾ ਅਸਮਾਨ', problem: 'ਸਵਾਲ', you: 'ਤੁਸੀਂ', tryAlone: 'ਅਗਲਾ ਕਦਮ ਬਿਨਾਂ ਇਸ਼ਾਰੇ ਦੇ ਅਜ਼ਮਾਓ!',
    },
    rungs: ['ਸੰਕੇਤ', 'ਸੰਕਲਪ', 'ਉਦਾਹਰਨ', 'ਅਗਲਾ ਕਦਮ'], mixes: ['ਸ਼ੁੱਧ', 'ਮਿਲੀ-ਜੁਲੀ', '+ English'],
    examples: [`ਹੱਲ ਕਰੋ: ${MATH1}`, 'ਪੌਦਿਆਂ ਨੂੰ ਧੁੱਪ ਕਿਉਂ ਚਾਹੀਦੀ ਹੈ?', `${FRAC} ਅਤੇ ${FRAC2} ਵਿੱਚੋਂ ਵੱਡਾ ਕਿਹੜਾ ਹੈ?`],
  },
  {
    code: 'od-IN', tag: 'or', speech: 'or-IN', name: 'Odia', native: 'ଓଡ଼ିଆ', font: 'Noto Sans Oriya',
    ui: {
      greet: 'ନମସ୍କାର', title: 'ତୁମ ପ୍ରଶ୍ନ କୁହ, ଫଟୋ ଉଠାଅ କିମ୍ବା ଲେଖ', sub: 'ଗୋଟିଏ ଗୋଟିଏ ସୂଚନା ଦେଇ ମୁଁ ତୁମକୁ ଉତ୍ତର ପର୍ଯ୍ୟନ୍ତ ନେଇଯିବି।',
      ask: 'ତୁମ ପ୍ରଶ୍ନ ଏଠାରେ ଲେଖ…', hint: 'ସୂଚନା', show: 'ଦେଖାଅ', pad: 'ସମାଧାନ ଲେଖ', teach: 'ମୋତେ ବୁଝାଅ', parent: 'ଅଭିଭାବକଙ୍କ ପାଇଁ ଭଏସ୍ ନୋଟ୍',
      practice: 'ଆଉ 3ଟି ଅଭ୍ୟାସ', solution: 'ତୁମ ସମାଧାନ', words: 'ଶିଖିବା ଶବ୍ଦ', ladder: 'ସୂଚନାର ସିଡ଼ି', solved: 'ସମାଧାନ ହେଲା!',
      solvedSelf: 'ମୁଁ ନିଜେ ସମାଧାନ କଲି', listen: 'ଶୁଣ', again: 'ପୁଣି ଶୁଣ', newp: 'ନୂଆ ପ୍ରଶ୍ନ', thinking: 'ଭାବୁଛି…', listening: 'ଶୁଣୁଛି…',
      start: 'ଶିଖିବା ଆରମ୍ଭ କର', chooseLang: 'ତୁମ ଭାଷା ବାଛ', yourClass: 'ତୁମ ଶ୍ରେଣୀ', check: 'ମୋ ପଦକ୍ଷେପ ଯାଞ୍ଚ କର', call: 'କ୍ରିଷ୍ଟିନା ସହ କଥା ହୁଅ',
      offline: 'ଭାବିବା ପାଇଁ ମୋତେ ଇଣ୍ଟରନେଟ୍ ଦରକାର। ସଞ୍ଚିତ ସ୍ୱର ଏବେ ବି ଶୁଣାଯିବ।', keepGoing: 'ଭୁଲରୁ ହିଁ ଆମେ ଶିଖୁ। ଆସ, ଗୋଟିଏ ଛୋଟ ପାଦ ପକାଇବା।',
      switchTo: '{x}କୁ ବଦଳାଇବି?', writeBigger: 'ଟିକେ ବଡ଼ କରି ଲେଖ।', levels: ['ସହଜ', 'ସମାନ', 'କଠିନ'],
      explain: 'ଏବେ ତୁମେ ଶିକ୍ଷକ। କେମିତି ସମାଧାନ କଲ ମୋତେ ବୁଝାଅ।', sky: 'ମୋ ଆକାଶ', problem: 'ପ୍ରଶ୍ନ', you: 'ତୁମେ', tryAlone: 'ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ ସୂଚନା ବିନା ଚେଷ୍ଟା କର!',
    },
    rungs: ['ଇଙ୍ଗିତ', 'ଧାରଣା', 'ଉଦାହରଣ', 'ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପ'], mixes: ['ଶୁଦ୍ଧ', 'ମିଶ୍ର', '+ English'],
    examples: [`ସମାଧାନ କର: ${MATH1}`, 'ଗଛକୁ ସୂର୍ଯ୍ୟାଲୋକ କାହିଁକି ଦରକାର?', `${FRAC} ଓ ${FRAC2} ମଧ୍ୟରୁ କେଉଁଟି ବଡ଼?`],
  },
  {
    code: 'en-IN', tag: 'en', speech: 'en-IN', name: 'English', native: 'English', font: 'Manrope',
    ui: {
      greet: 'Hello', title: 'Speak, snap or type your doubt', sub: "I'll guide you to the answer, one hint at a time.",
      ask: 'Type your doubt…', hint: 'Hint', show: 'Show me', pad: 'Show working', teach: 'Explain it back', parent: 'Voice note for parents',
      practice: 'Practice 3 more', solution: 'Your solution', words: 'Words to know', ladder: 'Hint ladder', solved: 'Solved!',
      solvedSelf: 'I solved it myself', listen: 'Listen', again: 'Listen again', newp: 'New problem', thinking: 'Thinking…', listening: 'Listening…',
      start: 'Start learning', chooseLang: 'Choose your language', yourClass: 'Your class', check: 'Check my step', call: 'Talk to Christina',
      offline: 'I need the internet to think. Your saved voice notes still play.', keepGoing: "Mistakes are how we learn. Let's take one small step.",
      switchTo: 'Switch to {x}?', writeBigger: 'Please write a bit bigger.', levels: ['Easier', 'Same', 'Harder'],
      explain: 'Now you be the teacher. Explain how you solved it.', sky: 'My Sky', problem: 'Problem', you: 'You', tryAlone: 'Try the next step without a hint!',
    },
    rungs: ['Nudge', 'Concept', 'Example', 'Next step'], mixes: ['Pure', 'Mixed', '+ English'],
    examples: [`Solve ${MATH1}`, 'Why do plants need sunlight?', `Which is bigger, ${FRAC} or ${FRAC2}?`],
  },
];

export const byCode = (code) => LANGS.find((l) => l.code === code) || LANGS.find((l) => l.code === 'en-IN');

// English labels used alongside native words (rung tooltips, settings, a11y).
export const RUNGS = ['Nudge', 'Concept', 'Example', 'Next step'];
export const MIXES = [
  { id: 'pure', label: 'Fully regional', tip: 'Read and hear textbook language' },
  { id: 'mixed', label: 'Regional + English words', tip: 'Familiar speech with English terms' },
  { id: 'english', label: 'Read English, hear regional', tip: 'English textbook, mother-tongue explanation' },
  { id: 'bilingual', label: 'Both on screen', tip: 'English and regional lines together' },
];
// Setup copy is local and works before any AI connection.
const SETUP = {
 'en-IN': ['How should Christina teach?', 'Fully English', 'English + familiar words', 'Read English, hear English', 'Both on screen', 'An equation is like a balanced scale.', 'Your turn', 'Explain board', 'Transcript', 'Continue learning'],
 'kn-IN': ['ಕ್ರಿಸ್ಟಿನಾ ಹೇಗೆ ಕಲಿಸಬೇಕು?', 'ಸಂಪೂರ್ಣ ಕನ್ನಡ', 'ಕನ್ನಡ + English ಪದಗಳು', 'ಓದಲು English, ಕೇಳಲು ಕನ್ನಡ', 'ಎರಡೂ ಭಾಷೆಗಳಲ್ಲಿ ಓದಿ', 'ಸಮೀಕರಣವು ಸಮತೋಲನದ ತಕ್ಕಡಿಯಂತಿದೆ.', 'ಈಗ ನಿಮ್ಮ ಸರದಿ', 'ಕಲಿಕೆಯ ಫಲಕ', 'ಸಂಭಾಷಣೆ', 'ಕಲಿಕೆ ಮುಂದುವರಿಸಿ'],
 'hi-IN': ['क्रिस्टीना कैसे पढ़ाए?', 'पूरी हिन्दी', 'हिन्दी + English शब्द', 'पढ़ें English, सुनें हिन्दी', 'दोनों भाषाओं में पढ़ें', 'समीकरण एक संतुलित तराजू जैसा है।', 'अब आपकी बारी', 'सीखने का बोर्ड', 'बातचीत', 'सीखना जारी रखें'],
 'ta-IN': ['கிறிஸ்டினா எப்படி கற்பிக்க வேண்டும்?', 'முழுவதும் தமிழ்', 'தமிழ் + English சொற்கள்', 'படிக்க English, கேட்க தமிழ்', 'இரு மொழிகளிலும் படிக்க', 'சமன்பாடு ஒரு சமநிலைத் தராசு போன்றது.', 'இப்போது உங்கள் முறை', 'கற்றல் பலகை', 'உரையாடல்', 'தொடர்ந்து கற்கவும்'],
 'te-IN': ['క్రిస్టినా ఎలా నేర్పాలి?', 'పూర్తిగా తెలుగు', 'తెలుగు + English పదాలు', 'చదవడం English, వినడం తెలుగు', 'రెండు భాషల్లో చదవండి', 'సమీకరణం సమతుల్య త్రాసు వంటిది.', 'ఇప్పుడు మీ వంతు', 'అభ్యాస బోర్డు', 'సంభాషణ', 'నేర్చుకోవడం కొనసాగించండి'],
 'ml-IN': ['ക്രിസ്റ്റീന എങ്ങനെ പഠിപ്പിക്കണം?', 'പൂർണ്ണമായും മലയാളം', 'മലയാളം + English വാക്കുകൾ', 'വായിക്കാൻ English, കേൾക്കാൻ മലയാളം', 'രണ്ടു ഭാഷകളിലും വായിക്കുക', 'സമവാക്യം തുലനത്തിലുള്ള ത്രാസ് പോലെയാണ്.', 'ഇനി നിങ്ങളുടെ ഊഴം', 'പഠന ബോർഡ്', 'സംഭാഷണം', 'പഠനം തുടരുക'],
 'mr-IN': ['क्रिस्टिनाने कसे शिकवावे?', 'पूर्ण मराठी', 'मराठी + English शब्द', 'वाचा English, ऐका मराठी', 'दोन्ही भाषांत वाचा', 'समीकरण म्हणजे संतुलित तराजू.', 'आता तुमची पाळी', 'शिकण्याचा फळा', 'संभाषण', 'शिकत राहा'],
 'bn-IN': ['ক্রিস্টিনা কীভাবে শেখাবে?', 'সম্পূর্ণ বাংলা', 'বাংলা + English শব্দ', 'পড়ুন English, শুনুন বাংলা', 'দুই ভাষায় পড়ুন', 'সমীকরণ একটি ভারসাম্যপূর্ণ দাঁড়িপাল্লার মতো।', 'এবার আপনার পালা', 'শেখার বোর্ড', 'কথোপকথন', 'শেখা চালিয়ে যান'],
 'gu-IN': ['ક્રિસ્ટિનાએ કેવી રીતે શીખવવું?', 'સંપૂર્ણ ગુજરાતી', 'ગુજરાતી + English શબ્દો', 'વાંચો English, સાંભળો ગુજરાતી', 'બંને ભાષામાં વાંચો', 'સમીકરણ સંતુલિત ત્રાજવા જેવું છે.', 'હવે તમારો વારો', 'શીખવાનું બોર્ડ', 'વાતચીત', 'શીખવાનું ચાલુ રાખો'],
 'pa-IN': ['ਕ੍ਰਿਸਟੀਨਾ ਕਿਵੇਂ ਪੜ੍ਹਾਵੇ?', 'ਪੂਰੀ ਪੰਜਾਬੀ', 'ਪੰਜਾਬੀ + English ਸ਼ਬਦ', 'ਪੜ੍ਹੋ English, ਸੁਣੋ ਪੰਜਾਬੀ', 'ਦੋਵੇਂ ਭਾਸ਼ਾਵਾਂ ਵਿੱਚ ਪੜ੍ਹੋ', 'ਸਮੀਕਰਨ ਸੰਤੁਲਿਤ ਤੱਕੜੀ ਵਰਗਾ ਹੈ।', 'ਹੁਣ ਤੁਹਾਡੀ ਵਾਰੀ', 'ਸਿੱਖਣ ਦਾ ਬੋਰਡ', 'ਗੱਲਬਾਤ', 'ਸਿੱਖਣਾ ਜਾਰੀ ਰੱਖੋ'],
 'od-IN': ['କ୍ରିଷ୍ଟିନା କିପରି ଶିଖାଇବେ?', 'ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ', 'ଓଡ଼ିଆ + English ଶବ୍ଦ', 'ପଢ଼ନ୍ତୁ English, ଶୁଣନ୍ତୁ ଓଡ଼ିଆ', 'ଦୁଇ ଭାଷାରେ ପଢ଼ନ୍ତୁ', 'ସମୀକରଣ ଏକ ସନ୍ତୁଳିତ ତରାଜୁ ପରି।', 'ଏବେ ଆପଣଙ୍କ ପାଳି', 'ଶିକ୍ଷା ବୋର୍ଡ', 'କଥାବାର୍ତ୍ତା', 'ଶିଖିବା ଜାରି ରଖନ୍ତୁ'],
};
export function lessonCopy(code) {
 const t = SETUP[code] || SETUP['en-IN'];
 const intro = {
 'en-IN': 'Understand the idea. See it happen. Try it your way.',
 'kn-IN': 'ವಿಷಯವನ್ನು ಅರ್ಥಮಾಡಿಕೋ. ಚಿತ್ರದಲ್ಲಿ ನೋಡು. ನಿನ್ನ ರೀತಿಯಲ್ಲಿ ಪ್ರಯತ್ನಿಸು.',
 'hi-IN': 'बात समझो। चित्र में देखो। अपने तरीके से कोशिश करो।',
 'ta-IN': 'கருத்தைப் புரிந்துகொள். படத்தில் பார். உன் வழியில் முயற்சி செய்.',
 'te-IN': 'భావనను అర్థం చేసుకో. చిత్రంలో చూడు. నీ పద్ధతిలో ప్రయత్నించు.',
 'ml-IN': 'ആശയം മനസ്സിലാക്കൂ. ചിത്രത്തിൽ കാണൂ. സ്വന്തം രീതിയിൽ ശ്രമിക്കൂ.',
 'mr-IN': 'कल्पना समजून घ्या. चित्रात पाहा. स्वतः प्रयत्न करा.',
 'bn-IN': 'ধারণা বুঝুন। ছবিতে দেখুন। নিজের মতো চেষ্টা করুন।',
 'gu-IN': 'વિચાર સમજો. ચિત્રમાં જુઓ. તમારી રીતે પ્રયાસ કરો.',
 'pa-IN': 'ਵਿਚਾਰ ਸਮਝੋ। ਤਸਵੀਰ ਵਿੱਚ ਦੇਖੋ। ਆਪਣੇ ਤਰੀਕੇ ਨਾਲ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
 'od-IN': 'ଧାରଣା ବୁଝନ୍ତୁ। ଚିତ୍ରରେ ଦେଖନ୍ତୁ। ନିଜେ ଚେଷ୍ଟା କରନ୍ତୁ।',
 };
 return { intro: intro[code] || intro['en-IN'], mode: t[0], modes: t.slice(1,5), sample: t[5], turn: t[6], board: t[7], transcript: t[8], next: t[9] };
}
export const EXAMPLE_META = [
  { icon: 'i-equation', subject: 'maths' },
  { icon: 'i-leaf', subject: 'biology' },
  { icon: 'i-pie', subject: 'maths' },
];
export const EXAMPLES = (code) => byCode(code).examples.map((text, i) => ({ text, ...EXAMPLE_META[i] }));

export const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
