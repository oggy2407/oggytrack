import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SUPPORTED_INLINE_MIMES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function redactServerError(rawMessage: string): string {
  return rawMessage
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(
      /\b(GEMINI_API_KEY|API_KEY|apiKey|password|secret|token)\s*([:=])\s*([^\s"',;]+)/gi,
      '$1$2[REDACTED]'
    );
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  app.use(express.json({ limit: '35mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, documentAnalyzerConfigured: Boolean(createGenAIClient()) });
  });

  app.post('/api/extract-academic-file', async (req, res) => {
    try {
      const {
        fileName = 'document',
        mimeType = 'application/octet-stream',
        base64Data,
        extractedText,
        currentDateISO,
      } = req.body || {};

      const ai = createGenAIClient();
      if (!ai) {
        res.status(503).json({
          error: 'Document vision parser is not configured on this server.',
          fallbackOnly: true,
        });
        return;
      }

      const parts: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = [];

      if (base64Data && typeof base64Data === 'string' && SUPPORTED_INLINE_MIMES.has(mimeType)) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      const safeFileName = String(fileName || 'document')
        .replace(/[^\w.\- ()]/g, '_')
        .slice(0, 120);

      if (extractedText && typeof extractedText === 'string' && extractedText.trim().length > 0) {
        parts.push({
          text: `Extracted content from uploaded file "${safeFileName}":\n\n${extractedText.slice(0, 120000)}`,
        });
      }

      if (parts.length === 0) {
        res.status(400).json({
          error: 'No readable content or supported media stream found in uploaded file.',
        });
        return;
      }

      const referenceDate = typeof currentDateISO === 'string' && currentDateISO ? currentDateISO : new Date().toISOString().slice(0, 10);

      parts.push({
        text: `Analyze this uploaded academic file ("${safeFileName}"). Reference current date: ${referenceDate}.
Return ONLY a valid JSON object with these exact keys:
{
  "documentSummary": "Brief summary of what academic records were found",
  "subjects": [{ "code": "MATH201", "name": "Linear Algebra", "credits": 3, "faculty": "Dr. Lee", "room": "Rm 204", "targetAttendance": 75 }],
  "timetable": [{ "code": "MATH201", "subjectName": "Linear Algebra", "day": "Monday", "startTime": "09:00", "endTime": "10:00", "room": "Rm 204", "faculty": "Dr. Lee", "type": "Lecture" }],
  "attendanceRecords": [{ "code": "MATH201", "subjectName": "Linear Algebra", "date": "2026-10-15", "status": "present", "note": "" }],
  "attendanceSummaries": [{ "code": "MATH201", "subjectName": "Linear Algebra", "attended": 18, "missed": 4, "cancelled": 0 }],
  "assignments": [{ "subjectCode": "MATH201", "subjectName": "Linear Algebra", "title": "Problem Set 1", "dueDate": "2026-11-05", "dueTime": "23:59", "priority": "medium", "type": "Homework" }],
  "holidays": [{ "title": "Diwali Break", "startDate": "2026-11-08", "endDate": "2026-11-12", "type": "National", "description": "University closed", "cancelsClasses": true }]
}

CRITICAL EXTRACTION RULES:
- Extract ONLY real data actually present in the file. Never invent sample courses or holidays if they are not in the file; use [] for any empty category.
- Generate a concise uppercase course code ONLY if a subject name has no explicit code.
- Convert times to 24-hour "HH:MM" format (afternoon timetable slots like "1:00 - 2:00" become "13:00" - "14:00").
- Map weekday names to full names ("Monday" through "Sunday"). Ignore daily lunch/tea breaks inside a class timetable grid.
- For aggregate past attendance (e.g. "Attended: 9 / Total: 10"), set attended: 9, missed: 1, cancelled: 0 in "attendanceSummaries".
- For holiday circulars, academic calendars, festival lists, recesses, reading weeks, and semester breaks: extract EVERY holiday or multi-day break into "holidays" with "YYYY-MM-DD" for both "startDate" and "endDate" (for single-day holidays, set endDate equal to startDate; if year is omitted, infer from the document's academic year or ${referenceDate.slice(0, 4)}).
- Set each holiday "type" to one of: "National", "Institutional", "Semester Break", "Exam Preparation", or "Personal". Set "cancelsClasses" to false ONLY if explicitly marked optional/restricted or classes remain active; otherwise true.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts },
        config: {
          temperature: 0.1,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
        },
      });

      const rawJson = (response.text || '{}')
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(rawJson);
      res.json({
        documentSummary: parsed.documentSummary || `Extracted records from ${safeFileName}`,
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
        timetable: Array.isArray(parsed.timetable) ? parsed.timetable : [],
        attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : [],
        attendanceSummaries: Array.isArray(parsed.attendanceSummaries) ? parsed.attendanceSummaries : [],
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        holidays: Array.isArray(parsed.holidays) ? parsed.holidays : [],
      });
    } catch (error: unknown) {
      const rawMsg =
        error instanceof Error ? error.message : 'Failed to analyze academic document.';
      res.status(500).json({ error: redactServerError(rawMsg) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
