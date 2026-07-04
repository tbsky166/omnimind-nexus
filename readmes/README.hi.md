# OmniMind Nexus（हिन्दी）

> 32 एजेंट A2A मल्टी-एजेंट सहयोग प्लेटफ़ॉर्म — AI को मानव टीम की तरह सहयोग करने दें

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## त्वरित शुरुआत

```bash
# 1. निर्भरताएँ स्थापित करें
npm install

# 2. OpenAI API Key कॉन्फ़िगर करें
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (वैकल्पिक) कस्टम API एंडपॉइंट
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. डेव सर्वर शुरू करें
npm run dev
```

[http://localhost:3000](http://localhost:3000) खोलें, **Live** टैब पर स्विच करें और एक कार्य दर्ज करें।

## विशेषताएँ

- **32 विशेषज्ञ एजेंट** — Router स्वचालित मिलान करता है, Planner योजनाएँ बनाता है, A2A 7-स्तरीय प्रोटोकॉल के माध्यम से सहयोग
- **2D पिक्सेल गेम पाइपलाइन** — प्रत्येक एजेंट का एक अद्वितीय पिक्सेल अवतार, पाइपों से जुड़ा, रीयल-टाइम स्थिति दृश्यीकरण
- **स्ट्रीमिंग आउटपुट** — SSE टोकन-दर-टोकन पुश, कोई अंतराल नहीं, 90-सेकंड टाइमआउट सुरक्षा
- **टूल कॉलिंग** — docx/xlsx दस्तावेज़ निर्माण, कार्यक्षेत्र फ़ाइलें पढ़ना/लिखना, एजेंटों के बीच फ़ाइल स्थानांतरण
- **सत्र इतिहास** — स्वचालित सहेजें/लोड/हटाएँ, स्थायी भंडारण

## परियोजना संरचना

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # मुख्य चैट API (7-चरण पाइपलाइन)
│   │   ├── generate/route.ts   # दस्तावेज़ निर्माण
│   │   ├── sessions/route.ts   # सत्र स्थायित्व
│   │   └── upload/route.ts     # फ़ाइल अपलोड और पार्सिंग
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # चैट सिस्टम + पाइपलाइन UI
│   ├── AgentNetwork.tsx        # एजेंट नेटवर्क प्रदर्शन
│   ├── ProtocolLayers.tsx      # A2A प्रोटोकॉल स्तर प्रदर्शन
│   └── ...                     # अन्य लैंडिंग पेज घटक
├── data/
│   └── agents.ts              # 32 एजेंट परिभाषाएँ
└── lib/
    ├── prompt.ts              # प्रॉम्प्ट और LLM कॉल
    └── document.ts            # दस्तावेज़ निर्माण और कार्यक्षेत्र फ़ाइल संचालन
```

## तकनीकी स्टैक

| तकनीक | उद्देश्य |
|--------|----------|
| Next.js 15 | फुल-स्टैक फ्रेमवर्क |
| React 19 | UI रेंडरिंग |
| Tailwind CSS 4 | पिक्सेल-शैली थीमिंग |
| Framer Motion 11 | एनिमेशन |
| OpenAI API | LLM बैकएंड |
| docx / xlsx | दस्तावेज़ निर्माण |
| mammoth | दस्तावेज़ पार्सिंग |

## लाइसेंस

MIT