import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import MapView from './MapView';
import './App.css';
// IMPORT THÊM FILE DATA ĐỂ TÍNH TOÁN ĐIỂM GẦN NHẤT
import fansipanData from './data/fansipan.json';

// 1. Công thức tính khoảng cách Haversine (km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính Trái Đất
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Home = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    const sapaSample = `Vị trí số 2 Fansipan, thị trấn Sa Pa...`; 
    const defaultArea = "Khu vực Sun Plaza - Mường Hoa"; 

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // TÌM ĐIỂM GẦN NHẤT TRONG DỮ LIỆU
          let minDistance = Infinity;
          let nearestArea = defaultArea;

          // Duyệt qua tất cả các điểm để tìm điểm gần người dùng nhất
          fansipanData.features.forEach(feature => {
            const fLat = feature.geometry.coordinates[1];
            const fLng = feature.geometry.coordinates[0];
            const dist = calculateDistance(latitude, longitude, fLat, fLng);
            
            if (dist < minDistance) {
              minDistance = dist;
              nearestArea = feature.properties.area;
            }
          });

          let locationData = "";
          let finalAreaData = "";

          // NẾU ĐIỂM GẦN NHẤT LỚN HƠN 100KM (Người dùng đang ở ngoài Sapa)
          if (minDistance > 100) {
            locationData = sapaSample;
            finalAreaData = defaultArea;
          } else {
            // NẾU Ở GẦN (Dưới 100km): Lấy area của điểm gần nhất
            locationData = `Tọa độ hiện tại của bạn: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}...`;
            finalAreaData = nearestArea; 
          }

          navigate('/map', { 
            state: { 
              gpsInfo: locationData, 
              areaData: finalAreaData // Gửi areaData qua MapView
            } 
          });
        },
        (error) => {
          // Lỗi GPS: Dùng vị trí mẫu
          navigate('/map', { 
            state: { 
              gpsInfo: sapaSample, 
              areaData: defaultArea 
            } 
          });
        }
      );
    } else {
      // Trình duyệt không hỗ trợ GPS
      navigate('/map', { 
        state: { 
          gpsInfo: sapaSample, 
          areaData: defaultArea 
        } 
      });
    }
  };

  return (
    <div className="landing-page">
      <div className="content-container">
        <div className="map-icon-circle">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
            <line x1="8" y1="2" x2="8" y2="18"></line>
            <line x1="16" y1="6" x2="16" y2="22"></line>
          </svg>
        </div>

        {/* Font Segoe UI ép mập tròn */}
        <h1 className="brand-name" style={{ 
          fontFamily: '"Segoe UI", sans-serif', 
          fontWeight: 900, 
          letterSpacing: '-2px',
          color: '#1a2b49'
        }}>
          Sunworld Fansipan Legend
        </h1>

        <button className="btn-start" onClick={handleStart} style={{ 
          fontFamily: '"Segoe UI", sans-serif', 
          fontWeight: 600,
          cursor: 'pointer'
        }}>
          Khám Phá Bản Đồ <span style={{ marginLeft: '10px' }}>→</span>
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapView />} />
      </Routes>
    </Router>
  );
}

export default App;