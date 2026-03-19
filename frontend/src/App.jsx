import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import MapView from './MapView';
import './App.css';
import fansipanData from './data/fansipan.json';
import introVideo from './assets/video.mp4';
import logoImg from './assets/logo.png';

import { PiSuitcaseFill } from "react-icons/pi";
// Hàm tính khoảng cách để dùng gps
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleStart = () => {
    if (isLoading) return; 
    setIsLoading(true);
    setError(null);
    const sapaSample = `Tọa độ: Fansipan View (Mặc định)`; 
    const defaultArea = "Khu vực Mường Hoa"; 
    const handleReady = (locationData, finalAreaData) => {
      setIsLoading(false);
      navigate('/map', { state: { gpsInfo: locationData, areaData: finalAreaData } }); 
    };

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
            locationData = `Tọa độ: Fansipan View`;
            finalAreaData = defaultArea;
          } else {
            locationData = `Tọa độ của bạn: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            finalAreaData = nearestArea; 
          }
          handleReady(locationData, finalAreaData);
        },
        (error) => {
          setError("Không thể lấy vị trí. Sử dụng dữ liệu mặc định.");
          handleReady(sapaSample, defaultArea);
        },
        { timeout: 10000 }
      );
    } else {
      setError("Trình duyệt không hỗ trợ định vị.");
      handleReady(sapaSample, defaultArea);
    }
  };

  return (
    <div className="landing-page" style={{ 
      position: 'relative',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'flex-start',
      paddingTop: '20px', // Đẩy nội dung lên sát mép trên
      minHeight: '100vh',
      textAlign: 'center',
      backgroundColor: '#ffffff' 
    }}>
      
      {/* Hiển thị lỗi định vị (nếu có) */}
      {error && (
        <div style={{
          position: 'absolute', top: 10, left: 10, right: 10, 
          padding: '10px', backgroundColor: '#ffcccc', color: '#990000', 
          borderRadius: '5px', textAlign: 'center', zIndex: 10
        }}>
          {error}
        </div>
      )}

      {/* 1. Header Logo */}
      <div className="header-logo" style={{ 
        width: '100%', 
        padding: '10px 0', 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        borderBottom: '1px solid #eaeaea' // Đường viền mỏng ngăn cách header giống web thực
      }}>
        <img 
          src={logoImg} 
          alt="Sunworld Fansipan Legend Logo" 
          style={{ width: '150px', height: 'auto' }} 
        />
      </div>

      {/* 2. Khung Video thu nhỏ */}
      <div className="video-preview-container" style={{
        width: '90%',
        maxWidth: '450px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        marginBottom: '30px'
      }}>
        <video 
          src={introVideo} 
          autoPlay 
          muted 
          loop 
          playsInline // Rất quan trọng để video tự chạy trên iOS
          webkit-playsinline="true"
          style={{ width: '100%', display: 'block', objectFit: 'cover' }}
        />
      </div>
      {/* 3. Lời chúc */}
      <div className="rounded-box">
        <p style={{ 
          display: 'flex', 
          alignItems: 'center', // Căn giữa icon và chữ theo chiều dọc
          justifyContent: 'center', 
          gap: '12px', // Khoảng cách giữa icon và chữ
          margin: 0,
          textAlign: 'left'
        }}>
          {/* Icon Vali với kích thước và màu sắc tùy chỉnh */}
          <PiSuitcaseFill size={32} color="#d82b2b" style={{ flexShrink: 0 }} />
          
          <span>
            Chúc bạn có trải nghiệm thật thú vị và một chuyến tham quan tuyệt vời tại đây!
          </span>
        </p>
      </div>

      {/* 4. Nút Khám Phá */}
      <button 
        className="btn-start" 
        onClick={handleStart} 
        disabled={isLoading}
        style={{ 
          fontFamily: '"Segoe UI", sans-serif', 
          fontWeight: 'bold',
          cursor: isLoading ? 'wait' : 'pointer', 
          opacity: isLoading ? 0.7 : 1,
          padding: '15px 45px',
          fontSize: '18px',
          backgroundColor: '#d82b2b', // Màu đỏ tone Sunworld
          color: 'white',
          border: 'none',
          borderRadius: '30px',
          boxShadow: '0 4px 12px rgba(216, 43, 43, 0.4)'
        }}
      >
        {isLoading ? "Đang định vị..." : "Khám Phá Bản Đồ"}
      </button>

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