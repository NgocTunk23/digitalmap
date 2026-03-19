# 🗺️ Fansipan Digital Map & Navigation System
## 📌 Tổng quan dự án (About The Project)

**Fansipan Digital Map** là một ứng dụng bản đồ tương tác nền nền tảng web, được phát triển nhằm hỗ trợ du khách tra cứu thông tin và tìm kiếm đường đi tại khu du lịch Fansipan. 

Dự án cung cấp cái nhìn trực quan về các địa điểm tham quan, hệ thống ga cáp treo, tàu hỏa leo núi và các tuyến đường đi bộ. Giải pháp này giúp số hóa trải nghiệm du lịch, mang lại sự tiện lợi và tối ưu hóa việc lên kế hoạch di chuyển cho người dùng.

### Tính năng cốt lõi (Key Features)
* **Bản đồ tương tác thời gian thực:** Hiển thị chi tiết địa hình và các khu vực tại Fansipan.
* **Hệ thống tìm đường thông minh (Routing):** Hỗ trợ chỉ đường giữa các trạm cáp treo, đường đi bộ và các địa danh nổi bật. `leaflet-routing-machine`.
* **Hiển thị thông tin địa điểm (POIs):** Tích hợp hình ảnh và mô tả chi tiết cho từng địa điểm.
* **Giao diện đáp ứng (Responsive Design):** Tối ưu hóa trải nghiệm trên cả thiết bị di động và máy tính.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

Dự án được xây dựng với các công nghệ và thư viện hiện đại:

* **Frontend:** ReactJS, Vite
* **Bản đồ & Không gian địa lý:** Leaflet, React-Leaflet, Leaflet-Routing-Machine, OSRM.
* **Giao diện & Biểu tượng:** React Icons, CSS.
* **Triển khai (Deployment):** Docker, Docker Compose, Nginx.

---

## 🚀 Hướng dẫn cài đặt (Getting Started)

Bạn có thể chạy dự án này trên môi trường local thông qua Node.js hoặc sử dụng Docker để triển khai nhanh chóng.

### 1. Chạy với Node.js
Yêu cầu hệ thống: `Node.js >= 16.x`

```bash
# Clone repository
git clone [https://github.com/your-username/digitalmap.git](https://github.com/your-username/digitalmap.git)

# Di chuyển vào thư mục frontend
cd digitalmap/frontend

# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy server phát triển
npm run dev
```
### 2. Chạy với Docker
# Di chuyển vào thư mục gốc của dự án
cd digitalmap

# Build và chạy container
docker-compose up -d --build