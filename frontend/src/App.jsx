import React, { useState, useRef, useEffect } from 'react'; // 1. Thêm useRef, useEffect
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import MapView from './MapView';
import './App.css';
import fansipanData from './data/fansipan.json';
import introVideo from './assets/video.mp4'; 

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

// --- Component Video Overlay (Tách ra để dễ quản lý useRef) ---
const VideoOverlay = ({ onEnded }) => {
  const videoRef = useRef(null); // 2. Tạo ref cho thẻ video

  useEffect(() => {
    // 3. Khi component này được mount (hiển thị), ép buộc phát video
    if (videoRef.current) {
      const playPromise = videoRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video đang phát mượt mà
            console.log("Video started playing successfully");
          })
          .catch((error) => {
            // Trình duyệt chặn autoplay hoặc có lỗi file
            console.error("Video autoplay failed:", error);
            // Có thể hiện 1 nút "Play" to ở giữa nếu bị chặn, hoặc skip luôn
            // videoRef.current.controls = true; // Hiện controls để user tự bấm play nếu cần
          });
      }
    }
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'black', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <video 
        ref={videoRef} // 4. Gán ref vào đây
        src={introVideo} 
        muted // Giữ muted để tăng khả năng được cho phép autoplay
        playsInline
        webkit-playsinline="true"
        onEnded={onEnded} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <button 
        onClick={onEnded}
        style={{
          position: 'absolute', top: '20px', right: '20px', padding: '10px 20px',
          backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid white',
          borderRadius: '8px', cursor: 'pointer', fontFamily: '"Segoe UI", sans-serif',
          zIndex: 10000, fontSize: '16px'
        }}
      >
        Skip ❯
      </button>
    </div>
  );
};
// ------------------------------------------------------------------

const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [error, setError] = useState(null);

  const handleVideoEnd = () => {
    setShowVideo(false);
    navigate('/map', { state: mapData }); 
  };

  const handleStart = () => {
    if (isLoading) return; 
    setIsLoading(true);
    setError(null);

    const sapaSample = `Tọa độ: Fansipan View (Mặc định)`; 
    const defaultArea = "Khu vực Mường Hoa"; 

    const handleReady = (locationData, finalAreaData) => {
      setMapData({ gpsInfo: locationData, areaData: finalAreaData });
      setIsLoading(false);
      setShowVideo(true); // Hiển thị VideoOverlay
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
    <>
      {/* Sử dụng component VideoOverlay đã tách riêng */}
      {showVideo && <VideoOverlay onEnded={handleVideoEnd} />}

      {!showVideo && (
        <div className="landing-page" style={{ position: 'relative' }}>
          {error && (
            <div style={{
              position: 'absolute', top: 10, left: 10, right: 10, 
              padding: '10px', backgroundColor: '#ffcccc', color: '#990000', 
              borderRadius: '5px', textAlign: 'center', zIndex: 10
            }}>
              {error}
            </div>
          )}
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
              color: '#1a2b49',
              marginBottom: '30px'
            }}>
              Sunworld Fansipan Legend
            </h1>

            <button 
              className="btn-start" 
              onClick={handleStart} 
              disabled={isLoading}
              style={{ 
                fontFamily: '"Segoe UI", sans-serif', 
                fontWeight: 600,
                cursor: isLoading ? 'wait' : 'pointer', 
                opacity: isLoading ? 0.7 : 1,
                padding: '15px 40px',
                fontSize: '18px'
              }}
            >
              {isLoading ? "Đang định vị..." : "Khám Phá Bản Đồ"} 
              {!isLoading && <span style={{ marginLeft: '10px' }}>→</span>}
            </button>
          </div>
        </div>
      )}
    </>
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