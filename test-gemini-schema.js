const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const key = env.match(/VITE_GEMINI_API_KEY=(.*)/)[1].trim();

const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key;
const prompt = "Analyze this mock interview. Treat it as a quick test. Transcript: User: Hi. AI: Hello.";

const schema = {
  type: "OBJECT",
  properties: {
    overallScore: { type: "NUMBER" },
    summary: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "OBJECT", properties: { point: { type: "STRING" }, detail: { type: "STRING" } } } },
    improvements: { type: "ARRAY", items: { type: "OBJECT", properties: { point: { type: "STRING" }, detail: { type: "STRING" } } } },
    questionAnalysis: { type: "ARRAY", items: { type: "OBJECT", properties: { question: { type: "STRING" }, answerQuality: { type: "NUMBER" }, feedback: { type: "STRING" } } } },
    communicationScore: { type: "NUMBER" },
    technicalScore: { type: "NUMBER" },
    confidenceScore: { type: "NUMBER" },
    tip: { type: "STRING" }
  },
  required: ["overallScore", "summary", "strengths", "improvements", "questionAnalysis", "communicationScore", "technicalScore", "confidenceScore", "tip"]
};

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    contents: [{ parts: [{ text: prompt }] }], 
    generationConfig: { 
      temperature: 0.2, 
      responseMimeType: 'application/json',
      responseSchema: schema
    } 
  })
})
.then(r => r.json())
.then(d => {
  if (d.error) {
    console.error('API Error:', d.error);
  } else {
    console.log('API Output Raw Text:');
    console.log(d.candidates[0].content.parts[0].text);
    console.log('\nJSON Parse Test:');
    console.log(JSON.parse(d.candidates[0].content.parts[0].text));
  }
})
.catch(console.error);
