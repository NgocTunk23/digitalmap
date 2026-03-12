import React, { useState } from 'react'; // THÊM useState Ở ĐÂY
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import MapView from './MapView';
import './App.css';
import fansipanData from './data/fansipan.json';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
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
  const [isLoading, setIsLoading] = useState(false); // STATE: Quản lý trạng thái loading

  const handleStart = () => {
    if (isLoading) return; // Nếu đang loading rồi thì không cho bấm nữa
    setIsLoading(true); // Bật trạng thái đang tải

    const sapaSample = `Fansipan View`; 
    const defaultArea = "Khu vực Mường Hoa"; 

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          let minDistance = Infinity;
          let nearestArea = defaultArea;

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

          if (minDistance > 100) {
            locationData = sapaSample;
            finalAreaData = defaultArea;
          } else {
            locationData = `Tọa độ hiện tại của bạn: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}...`;
            finalAreaData = nearestArea; 
          }

          setIsLoading(false); // Tắt loading
          navigate('/map', { 
            state: { gpsInfo: locationData, areaData: finalAreaData } 
          });
        },
        (error) => {
          setIsLoading(false); // Tắt loading
          navigate('/map', { 
            state: { gpsInfo: sapaSample, areaData: defaultArea } 
          });
        }
      );
    } else {
      setIsLoading(false);
      navigate('/map', { 
        state: { gpsInfo: sapaSample, areaData: defaultArea } 
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

        <h1 className="brand-name" style={{ 
          fontFamily: '"Segoe UI", sans-serif', 
          fontWeight: 900, 
          letterSpacing: '-2px',
          color: '#1a2b49'
        }}>
          Sunworld Fansipan Legend
        </h1>

        <button 
          className="btn-start" 
          onClick={handleStart} 
          disabled={isLoading} // Vô hiệu hoá nút khi đang tải
          style={{ 
            fontFamily: '"Segoe UI", sans-serif', 
            fontWeight: 600,
            cursor: isLoading ? 'wait' : 'pointer', // Đổi con trỏ chuột thành hình xoay xoay
            opacity: isLoading ? 0.7 : 1 // Làm mờ nhẹ nút bấm khi đang tải
          }}
        >
          {/* Đổi chữ nếu đang lấy GPS */}
          {isLoading ? "Đang định vị..." : "Khám Phá Bản Đồ"} 
          {!isLoading && <span style={{ marginLeft: '10px' }}>→</span>}
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