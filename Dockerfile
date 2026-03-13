# 1. Build React App
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build 
# (Lưu ý: Nếu sếp xài Vite thì sửa 'npm run build' thành 'npm run build' và ở dưới đổi /build thành /dist)

# 2. Chạy bằng Nginx
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]