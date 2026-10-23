import JSZip from 'jszip';

export async function downloadProjectZip() {
  const zip = new JSZip();

  // Root config files
  zip.file('.gitignore', `node_modules
dist
.env
*.local
.DS_Store
`);

  zip.file('.env.example', `# oggytrack Environment Variables
GEMINI_API_KEY="your-gemini-api-key-here"
APP_URL="http://localhost:3000"
`);

  zip.file('metadata.json', JSON.stringify({
    name: "oggytrack",
    description: "Your academics, perfectly on track. oggytrack helps college students organize timetables, track attendance, manage assignments, and stay on top of classes.",
    requestFramePermissions: [],
    majorCapabilities: ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"]
  }, null, 2));

  zip.file('package.json', JSON.stringify({
    name: "oggytrack",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      "dev": "vite --port=3000 --host=0.0.0.0",
      "build": "vite build",
      "preview": "vite preview",
      "test": "tsx --test src/utils/academicCalculations.test.ts"
    },
    dependencies: {
      "@tailwindcss/vite": "^4.3.3",
      "@vitejs/plugin-react": "^6.1.1",
      "jszip": "^3.10.1",
      "lucide-react": "^0.546.0",
      "motion": "^12.23.24",
      "react": "^19.0.1",
      "react-dom": "^19.0.1",
      "tailwindcss": "^4.3.3",
      "vite": "^8.3.0"
    },
    devDependencies: {
      "@types/jszip": "^3.4.1",
      "@types/node": "^22.14.0",
      "@types/react": "^19.3.0",
      "@types/react-dom": "^19.3.0",
      "tsx": "^4.21.0",
      "typescript": "^7.0.2"
    }
  }, null, 2));

  zip.file('tsconfig.json', JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      "useDefineForClassFields": false,
      module: "ESNext",
      types: ["vite/client"],
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      skipLibCheck: true,
      moduleResolution: "bundler",
      isolatedModules: true,
      moduleDetection: "force",
      jsx: "react-jsx",
      paths: {
        "@/*": ["./src/*"]
      },
      allowImportingTsExtensions: true,
      noEmit: true
    },
    include: ["src"]
  }, null, 2));

  zip.file('vite.config.ts', `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
`);

  zip.file('index.html', `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>oggytrack — Your academics, perfectly on track</title>
    <meta name="description" content="Your academics, perfectly on track. oggytrack helps college students organize timetables, track attendance, manage assignments, and stay on top of classes." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

  zip.file('README.md', `# oggytrack — Your Academics, Perfectly On Track

oggytrack is a modern, student-centric academic management platform designed to help university and college students take full control over their academic life: class schedules, attendance percentages, assignment deadlines, holidays, and performance forecasting.

## 🚀 Features

- **Interactive Timetable Manager**: Daily, weekly, and monthly views with recurring schedules and conflict detection.
- **Precision Attendance Tracker**: Subject-wise percentage, attendance thresholds, and safe bunk / consecutive class recovery predictions.
- **Assignment & Task Tracker**: Priority tags, due date countdowns, status tracking, and progress indicators.
- **Holiday & Event Hub**: Tracks national breaks, campus holidays, and exam dates with schedule conflict warnings.
- **Design System Customizer**: 6 switchable visual themes (Minimal & Professional, Dark Tech, Modern SaaS Linear, Colorful Planner, Glassmorphism, and Custom Studio).

## 🛠️ Quick Local Setup

1. Clone or extract this repository:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit for oggytrack"
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`
   Visit http://localhost:3000 in your browser!

4. Build for production:
   \`\`\`bash
   npm run build
   \`\`\`

## 🌐 Deploy to GitHub & Free Web Hosting

### Deploying to GitHub:
\`\`\`bash
git remote add origin https://github.com/<your-username>/oggytrack.git
git branch -M main
git push -u origin main
\`\`\`

### One-Click Deployment:
- **Vercel**: Import the GitHub repository, select framework **Vite**, and click Deploy!
- **Netlify**: Link the repository, set build command \`npm run build\` and publish directory \`dist\`.
- **Cloudflare Pages**: Connect repo and build with \`npm run build\`!
`);

  zip.file('DEPLOYMENT_GUIDE.md', `# Step-by-Step GitHub & Hosting Deployment Guide

### Option 1: Vercel (Recommended, 2 Minutes)
1. Push this folder to a new GitHub repo.
2. Sign in to [Vercel](https://vercel.com).
3. Click **Add New Project** and select your \`oggytrack\` GitHub repo.
4. Framework preset will automatically detect **Vite**.
5. Click **Deploy**. Your live URL will be ready immediately!

### Option 2: Netlify
1. Log in to [Netlify](https://netlify.com).
2. Click **Import from Git**.
3. Choose your \`oggytrack\` repo.
4. Build command: \`npm run build\`
5. Publish directory: \`dist\`
6. Click **Deploy site**.

### Option 3: GitHub Pages
1. Install gh-pages: \`npm install --save-dev gh-pages\`
2. Add base in \`vite.config.ts\`: \`base: '/oggytrack/'\`
3. Add script: \`"deploy": "gh-pages -d dist"\`
4. Run \`npm run build && npm run deploy\`.
`);

  // Generate ZIP blob and trigger browser download
  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = 'oggytrack-project-source.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}
