# OmniMind Nexus（العربية）

> منصة تعاون متعدد الوكلاء A2A تضم 32 وكيلاً — اجعل الذكاء الاصطناعي يتعاون مثل فريق بشري

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

## بداية سريعة

```bash
# 1. تثبيت التبعيات
npm install

# 2. تكوين مفتاح OpenAI API
echo "OPENAI_API_KEY=sk-xxx" > .env.local

# 3. (اختياري) نقطة نهاية API مخصصة
# echo "OPENAI_BASE_URL=https://api.openai.com/v1" >> .env.local
# echo "OPENAI_MODEL=gpt-4o" >> .env.local

# 4. بدء خادم التطوير
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)، انتقل إلى علامة التبويب **Live** وأدخل مهمة.

## الميزات

- **32 وكيلاً متخصصاً** — Router يطابق تلقائياً، Planner ينشئ الخطط، التعاون عبر بروتوكول A2A ذي 7 طبقات
- **خط أنابيب لعبة بكسل ثنائي الأبعاد** — لكل وكيل صورة رمزية بكسل فريدة، متصلة بأنابيب، تصور الحالة في الوقت الفعلي
- **إخراج متدفق** — SSE دفع رمز برمز، بدون تأخير، حماية مهلة 90 ثانية
- **استدعاء الأدوات** — إنشاء مستندات docx/xlsx، قراءة/كتابة ملفات مساحة العمل، تسليم الملفات بين الوكلاء
- **سجل الجلسات** — حفظ/تحميل/حذف تلقائي مع تخزين دائم

## هيكل المشروع

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # واجهة برمجة تطبيقات الدردشة الرئيسية (خط أنابيب 7 مراحل)
│   │   ├── generate/route.ts   # إنشاء المستندات
│   │   ├── sessions/route.ts   # استمرارية الجلسات
│   │   └── upload/route.ts     # تحميل وتحليل الملفات
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AgentConversation.tsx   # نظام الدردشة + واجهة خط الأنابيب
│   ├── AgentNetwork.tsx        # عرض شبكة الوكلاء
│   ├── ProtocolLayers.tsx      # عرض طبقات بروتوكول A2A
│   └── ...                     # مكونات الصفحة الرئيسية الأخرى
├── data/
│   └── agents.ts              # تعريفات 32 وكيلاً
└── lib/
    ├── prompt.ts              # المطالبات واستدعاءات LLM
    └── document.ts            # إنشاء المستندات وعمليات ملفات مساحة العمل
```

## مجموعة التقنيات

| التقنية | الغرض |
|---------|-------|
| Next.js 15 | إطار عمل متكامل |
| React 19 | عرض واجهة المستخدم |
| Tailwind CSS 4 | تنسيق بأسلوب البكسل |
| Framer Motion 11 | الرسوم المتحركة |
| OpenAI API | خلفية LLM |
| docx / xlsx | إنشاء المستندات |
| mammoth | تحليل المستندات |

## الترخيص

MIT