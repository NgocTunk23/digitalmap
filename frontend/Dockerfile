# Giai đoạn 1: Build
FROM node:22-alpine AS build_stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Giai đoạn 2: Production
FROM nginx:stable-alpine
# Chép kết quả build từ Giai đoạn 1 sang Nginx
COPY --from=build_stage /app/dist /usr/share/nginx/html

# --- QUAN TRỌNG: BỎ DẤU # Ở DÒNG DƯỚI ĐÂY ---
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]