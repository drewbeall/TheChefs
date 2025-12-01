# TikTok Transcript Service

Backend + simple frontend to fetch TikTok video transcripts using SupaData.

## Prerequisites
- Node.js 18+
- npm
- SupaData API key (server-side only)

## Folder Structure
```
Tiktok/
	backend/     # Express server (port 3001)
	frontend/    # Static HTML/JS served by backend
	README.md
```

## 1. Install Dependencies
From the root `nodeproject` folder (uses shared package.json):
```powershell
npm install @supadata/js cors dotenv
```

If you prefer isolation, create a `package.json` inside `backend/` and run the same install there.

## 2. Environment Variables
Create `nodeproject/Tiktok/backend/.env`:
```
SUPADATA_API_KEY=sd_your_real_key_here
PORT=3001
```
Never commit real API keys.

## 3. Start the Server
```powershell
cd nodeproject/Tiktok/backend
node server.js
```
Console should show: `Server running at http://localhost:3001`.

## 4. Test Endpoints
Health check:
```powershell
curl http://localhost:3001/health
```

Request a transcript (replace URL as needed):
```powershell
curl -X POST http://localhost:3001/transcript -H "Content-Type: application/json" -d "{\"url\":\"https://www.tiktok.com/@cookingwithlynja/video/7322531619825257771\"}"
```

If successful, JSON with transcript metadata/text returns.

## 5. Frontend Access
Open in browser:
```
http://localhost:3001/
```
The fallback route serves `frontend/index.html` for any path.

## 6. Common Errors
- `Missing parameter name at index 1: *` → Fixed by using `app.use(...)` instead of `app.get("*")` in Express 5.
- `SUPADATA_API_KEY undefined` → Check `.env` file and that `dotenv.config()` is present.

## 7. Docker (Optional)
Create `backend/Dockerfile` (example):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY ../frontend ./frontend
COPY server.js package*.json /.
RUN npm install @supadata/js cors dotenv express
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
```
Build & run:
```powershell
cd nodeproject/Tiktok/backend
docker build -t tiktok-backend .
docker run -d -p 3001:3001 -e SUPADATA_API_KEY=sd_your_real_key_here tiktok-backend
```

## 8. Next Improvements
- Add rate limiting.
- Add caching layer for transcripts.
- Add validation and URL normalization.
- Add a frontend form to POST `/transcript`.

---
Made for local development; do not expose the API key in client code.
