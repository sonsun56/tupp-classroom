# ===== Base image =====
FROM node:20-alpine

# ===== Set working dir =====
WORKDIR /app

# ===== Install backend deps =====
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# ===== Copy backend =====
COPY backend ./backend

# ===== Copy frontend build =====
COPY frontend/dist ./frontend/dist

# ===== Cloud Run port =====
ENV PORT=8080
EXPOSE 8080

# ===== Start backend =====
CMD ["node", "backend/server.js"]
