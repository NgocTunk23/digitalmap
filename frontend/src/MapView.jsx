import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import { HiLocationMarker, HiInformationCircle, HiClock, HiMenu, HiSearch, HiX } from "react-icons/hi"; 
import 'leaflet/dist/leaflet.css';
import fansipanData from './data/fansipan.json';
import './MapView.css'; 
import React, { useState, useEffect, useRef, useMemo } from 'react'; 
import { FiNavigation, FiHome } from "react-icons/fi"; 
import { useNavigate, useLocation } from "react-router-dom"; 

import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ==========================================
// COMPONENT: BỘ SƯU TẬP ẢNH CÓ NÚT BẤM CHUYỂN (Nền nút trong suốt)
// ==========================================
const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Quan trọng: Khi người dùng chọn địa điểm khác, tự động reset về ảnh đầu tiên
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  if (!images || images.length === 0) {
    return <img src="https://placehold.co/600x400?text=No+Image" alt="Không có ảnh" className="place-img" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }}/>;
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '15px' }}>
      <img 
        src={images[currentIndex]} 
        alt={`Ảnh ${currentIndex + 1}`} 
        className="place-img" 
        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
        onError={(e) => {e.target.src='https://placehold.co/600x400?text=No+Image'}}
      />

      {images.length > 1 && (
        <>
         {/* Nút TRÁI */}
          <button 
            className="carousel-btn carousel-btn-left" 
            onClick={prevImage}
          >
            ❮
          </button>

          {/* Nút PHẢI */}
          <button 
            className="carousel-btn carousel-btn-right" 
            onClick={nextImage}
          >
            ❯
          </button>
          <div style={{
            position: 'absolute', bottom: '10px', right: '10px',
            background: 'rgba(0, 0, 0, 0.6)', color: 'white', padding: '2px 8px',
            borderRadius: '12px', fontSize: '12px', zIndex: 10
          }}>
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};


// Component vẽ đường OSRM nhận nhiều toạ độ điểm mù (waypoints)
const RoutingMachine = ({ segments }) => {
  const map = useMap();
  const routingControlsRef = useRef([]);

  useEffect(() => {
    if (!map || !segments || segments.length === 0) return;

    routingControlsRef.current.forEach(control => {
      map.removeControl(control);
    });
    routingControlsRef.current = [];

    segments.forEach(segment => {
      // Nhận mảng segment có thể có 2, 3 hoặc 4 điểm và vẽ liền mạch qua tất cả
      const control = L.Routing.control({
        waypoints: segment.map(p => L.latLng(p[0], p[1])),
        lineOptions: { 
          styles: [{ color: '#1d61ff', weight: 6, opacity: 0.8 }] 
        },
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        createMarker: () => null,
      }).addTo(map);
      
      routingControlsRef.current.push(control);
    });

    return () => {
      routingControlsRef.current.forEach(control => {
        if (map) map.removeControl(control);
      });
      routingControlsRef.current = [];
    };
  }, [map, segments]);

  return null;
};

// Component chạy song song: Chuyên vẽ đường chim bay cáp treo
const StraightLineMachine = ({ routes }) => {
  const map = useMap();
  const linesRef = useRef([]);

  useEffect(() => {
    // 1. Xóa các đường thẳng cũ trước khi vẽ đường mới
    linesRef.current.forEach(line => {
      if (map) map.removeLayer(line);
    });
    linesRef.current = [];

    // 2. Lặp qua mảng routes (được tạo từ hàm addLine) để vẽ
    if (map && routes && routes.length > 0) {
      routes.forEach(routePoints => {
        // Vẽ thẳng bằng L.polyline của Leaflet, không xài thẻ <Polyline>
        const line = L.polyline(routePoints, {
          color: '#1d61ff', 
          weight: 4, 
          dashArray: '8, 8', // Nét đứt
          opacity: 0.9
        }).addTo(map);
        linesRef.current.push(line);
      });
    }

    return () => {
      linesRef.current.forEach(line => {
        if (map) map.removeLayer(line);
      });
      linesRef.current = [];
    };
  }, [map, routes]);

  return null;
};

const InitialFlyToUser = ({ coords, markerRef }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && markerRef.current) {
      map.flyTo(coords, 18, { duration: 1, easeLinearity: 1 });
      const timer = setTimeout(() => { markerRef.current.openPopup(); }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [map, coords, markerRef]);
  return null;
};

const FlyToLocation = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords[1], coords[0]], 18, { duration: 0.25, easeLinearity: 1 });
    }
  }, [map, coords]);
  return null;
};

const MapView = () => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showList, setShowList] = useState(false); 
  const [searchTerm, setSearchTerm] = useState(""); 
  const navigate = useNavigate(); 
  const location = useLocation();
  const redMarkerRef = useRef(null);
  const mapRef = useRef(null); 
  const [myLocationCoords, setMyLocationCoords] = useState([22.3371665, 103.824208]);
  const centerPosition = [22.303246, 103.777648];
  
  const [gpsInfo, setGpsInfo] = useState(location.state?.gpsInfo || "Vị trí mặc định (Ga Mường Hoa)");
  const [currentArea, setCurrentArea] = useState(location.state?.areaData || "Khu vực Mường Hoa");

  const [routeSegments, setRouteSegments] = useState(null);
  const [isRouting, setIsRouting] = useState(false); 
  const [cableCarRoute, setCableCarRoute] = useState(null);

  // HÀM: Đưa camera về lại vị trí hiện tại của user
  const handleReturnToMyLocation = () => {
    if (mapRef.current) {
      mapRef.current.stop(); // Dừng mọi animation đang có
      
      // Bay về vị trí hiện tại
      mapRef.current.flyTo(myLocationCoords, 18, { duration: 1.2 });
      
      // Mở lại popup vị trí
      setTimeout(() => {
        if (redMarkerRef.current) {
          redMarkerRef.current.openPopup();
        }
      }, 1300);
    }
  };

  // Hàm chạy song song: Chỉ bắt các chặng đi qua cáp treo để vẽ thẳng
  const handleGetCableCarLine = () => {
    if (!selectedPlace) return;

    const destinationArea = fansipanData.features.find(f => f.properties.name === selectedPlace.name)?.properties.area;
    if (!destinationArea) return;

    // Toạ độ đường cáp treo Fansipan (Ga Hoàng Liên - Ga Fansipan)
    const p_GaHoangLien = [22.3370, 103.824194];
    const p_GaFansipan = [22.30655, 103.774694];
    const straightPoints = [p_GaHoangLien, p_GaFansipan];

    const p_GaSapa = [22.334254, 103.840374];
    const p_GaMuongHoa = [22.336618, 103.825004];
    const straightPointsSapa = [p_GaMuongHoa,[22.33486, 103.8308],  [22.3345, 103.832], [22.3339, 103.8338], [22.33319, 103.836], [22.33307, 103.837] ,[22.3331, 103.838], [22.33345, 103.839], [22.333797, 103.8399], [22.3340, 103.84028], p_GaSapa];

    const linesToDraw = []; // Mảng chứa các đường chim bay

    // HÀM addLine ĐỂ PUSH DỮ LIỆU
    const addLine = (points) => {
      linesToDraw.push(points);
    };

    // Kiểm tra nếu đi qua lại giữa khu vực có cáp treo thì gọi addLine
    if (currentArea !== destinationArea) {
      if (
        (currentArea === "Khu vực Fansipan" && destinationArea !== "Khu vực Fansipan") || (currentArea !== "Khu vực Fansipan" && destinationArea === "Khu vực Fansipan")
      ) {
        addLine(straightPoints); // Gọi hàm addLine
      }
      else if (
         (currentArea === "Khu vực Sun Plaza - Sapa" && destinationArea !== "Khu vực Sun Plaza - Sapa") || (currentArea !== "Khu vực Sun Plaza - Sapa" && destinationArea === "Khu vực Sun Plaza - Sapa")
      ){
        addLine(straightPointsSapa); // Gọi hàm addLine
      }
    }
    
    // Ném mảng cho Component StraightLineMachine vẽ
    setCableCarRoute(linesToDraw);
  };

  const redPinIcon = useMemo(() => L.divIcon({
    className: 'custom-red-pin',
    iconSize: [35, 35],
    iconAnchor: [17, 35],
    popupAnchor: [1, -34],
    html: `<div class="pin-marker-red"><div class="pin-marker-head-red"></div><div class="pin-marker-point-red"></div></div>`,
  }), []);

const filteredPlaces = useMemo(() => {
    if (!searchTerm) return fansipanData.features; // Trả về tất cả nếu không gõ gì
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return fansipanData.features.filter(f => {
      const nameMatch = f.properties.name?.toLowerCase().includes(lowerSearchTerm);
      const areaMatch = f.properties.area?.toLowerCase().includes(lowerSearchTerm);
      
      // Trả về true nếu tên HOẶC khu vực chứa từ khóa tìm kiếm
      return nameMatch || areaMatch;
    });
  }, [searchTerm]);

  const onEachFeature = useMemo(() => (feature, layer) => {
    layer.on({
      click: (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPlace(feature.properties);
        setShowList(false);
        setRouteSegments(null); 
      },
    });
  }, []);

  const geoJsonLayer = useMemo(() => (
    <GeoJSON data={fansipanData} onEachFeature={onEachFeature} />
  ), [onEachFeature]);

  // XỬ LÝ CHỈ ĐƯỜNG (Có hiệu ứng Loading)
  const handleGetDirections = () => {
    if (!selectedPlace) return;
    
    setIsRouting(true); // Bật trạng thái Loading

    const feature = fansipanData.features.find(f => f.properties.name === selectedPlace.name);
    if (!feature) {
        setIsRouting(false);
        return;
    }

    const destination = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
    const destinationArea = feature.properties.area;
    
    const p_GaSapa = [22.334254, 103.840374];
    const p_GaMuongHoa = [22.336618, 103.825004];
    const p_GaHoangLien = [22.33707, 103.8243];
    const p_GaFansipan = [22.306694, 103.774694];

    if (currentArea === destinationArea) {
      setRouteSegments([ [myLocationCoords, destination] ]);
    } else {
      const segments = [];
      
      // MƯỜNG HOA
      if (currentArea === "Khu vực Mường Hoa") {
        if (destinationArea === "Khu vực Fansipan") {
          segments.push([myLocationCoords, p_GaHoangLien]);
          if (selectedPlace.name !== "Ga Fansipan") {
            segments.push([p_GaFansipan, destination]);
          }
        } else if (destinationArea === "Khu vực Sun Plaza - Sapa") {
          segments.push([myLocationCoords, p_GaMuongHoa]);
          if (selectedPlace.name !== "Ga Sapa") {
            segments.push([p_GaSapa, destination]);
          }
        }
      } 
      // FANSIPAN
      else if (currentArea === "Khu vực Fansipan") {
        segments.push([myLocationCoords, p_GaFansipan]); 
        if (destinationArea === "Khu vực Mường Hoa") {
          if (selectedPlace.name !== "Ga Hoàng Liên") {
            segments.push([p_GaHoangLien, destination]);
          }
        } else if (destinationArea === "Khu vực Sun Plaza - Sapa") {
          segments.push([p_GaHoangLien, p_GaMuongHoa]);
          if (selectedPlace.name !== "Ga Sapa") {
            segments.push([p_GaSapa, destination]);
          }
        }
      }
      // SAPA
      else if (currentArea === "Khu vực Sun Plaza - Sapa") {
        segments.push([myLocationCoords, p_GaSapa]);
        if (destinationArea === "Khu vực Mường Hoa") {
          if (selectedPlace.name !== "Ga Mường Hoa") {
            segments.push([p_GaMuongHoa, destination]);
          }
        } else if (destinationArea === "Khu vực Fansipan") {
          segments.push([p_GaMuongHoa, p_GaHoangLien]);
          if (selectedPlace.name !== "Ga Fansipan") {
            segments.push([p_GaFansipan, destination]);
          }
        }
      } 
      // DỰ PHÒNG 
      else {
        segments.push([myLocationCoords, destination]);
      }

      setRouteSegments(segments);
    }

    // Tắt Loading sau 2.5s (Giả lập chờ server OSRM phản hồi)
    setTimeout(() => {
        setIsRouting(false);
    }, 2500);
  };

  return (
    <div className="map-wrapper" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div className="map-header" style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 1000,
        background: 'white', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', padding: '15px 0', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' 
      }}>
        {/* Nút Trang chủ đã được gắn class */}
        <button className="home-btn" onClick={() => navigate('/')}>
          <FiHome className="home-icon" /> <span>Trang chủ</span>
        </button>
        
        <span className="header-title" style={{ fontWeight: '900', letterSpacing: '-1.5px', fontSize: '1.6rem', color: '#000000' }}>
          Sunworld Fansipan Legend
        </span>
      </div>

     {/* THANH TÌM KIẾM */}
      <div className="floating-search-bar">
        <button className="menu-icon-btn" onClick={() => setShowList(true)} style={{ background: 'none', border: 'none' }}>
          <HiMenu style={{ color: 'black', fontSize: '24px' }} />
        </button>
        <div className="search-divider" />
        <input 
          type="text" 
          placeholder="Bạn muốn đến?" 
          value={searchTerm}
          onClick={() => setShowList(true)} 
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowList(true); 
          }}
        />
        <HiSearch className="search-icon-right" />
      </div>

      <MapContainer ref={mapRef} center={centerPosition} zoom={15} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {geoJsonLayer}
        <InitialFlyToUser coords={myLocationCoords} markerRef={redMarkerRef} />

        {/* LOGIC VẼ ĐƯỜNG */}
        {routeSegments && <RoutingMachine segments={routeSegments} />}
        <StraightLineMachine routes={cableCarRoute} />
        
        <Marker position={myLocationCoords} icon={redPinIcon} ref={redMarkerRef}>
          <Popup>
            <div style={{ fontFamily: '"Segoe UI", sans-serif', fontSize: '13px', width: '230px' }}>
              <strong style={{ color: '#ff4d4f', display: 'block', marginBottom: '5px', fontSize: '14px' }}>Vị trí của bạn</strong>
              <p style={{ margin: 0, lineHeight: '1.4', whiteSpace: 'pre-line', color: '#333' }}>{gpsInfo}</p>
            </div>
          </Popup>
        </Marker>
        
        {selectedPlace && <FlyToLocation coords={fansipanData.features.find(f => f.properties.name === selectedPlace.name)?.geometry.coordinates} />}
      </MapContainer>

      {/* SIDEBAR DANH SÁCH */}
      <div className={`location-list-sidebar ${showList ? 'open' : ''}`}>
        <div className="list-header">
          <h3>Danh sách địa điểm</h3>
          {/* Thêm class vào đây để dễ gọi CSS */}
          <button className="close-list-btn" onClick={() => setShowList(false)}>
            <HiX />
          </button>
        </div>
        <div className="list-content">
          {filteredPlaces.map((place, index) => (
            <div key={index} className="location-item-card" onClick={() => {
              setSelectedPlace(place.properties);
              setShowList(false);
              setRouteSegments(null);
            }}>
              <div className="loc-icon"><HiLocationMarker /></div>
              <div className="loc-info">
                <strong>{place.properties.name}</strong>
                <span>{place.properties.area}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* <button 
        onClick={handleReturnToMyLocation}
        style={{
          position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000 
        }}
        title="Vị trí của tôi"
      >
       <HiLocationMarker style={{ color: '#ffffff', fontSize: '24px' }} className="icon-item-react" />
      </button> */}

      {/* SIDEBAR THÔNG TIN CHI TIẾT */}
      {selectedPlace && !showList && (
        <div className="info-sidebar">
          <div className="sidebar-header">
            <span>Thông tin địa điểm</span>
            <button className="close-btn" onClick={() => setSelectedPlace(null)}>✕</button>
          </div>
          <div className="sidebar-content">
            
            {/* COMPONENT HIỂN THỊ LIST ẢNH */}
            <ImageCarousel images={selectedPlace.images} />

            <h2 className="place-name">{selectedPlace.name}</h2>
            <span className="area-badge">{selectedPlace.area}</span>
            <div className="info-card">
              <div className="info-item">
                <div className="icon-container"><HiLocationMarker style={{ color: '#1d61ff', fontSize: '24px' }} className="icon-item-react" /></div>
                <div><strong>Vị trí địa điểm</strong><p>{fansipanData.features.find(f => f.properties.name === selectedPlace.name)?.geometry.coordinates.slice().reverse().join(', ')}</p></div>
              </div>
              <div className="info-item">
                <div className="icon-container"><HiInformationCircle style={{ color: '#1d61ff', fontSize: '24px' }} className="icon-item-react" /></div>
                <div><strong>Thông tin</strong><p>{selectedPlace.description}</p></div>
              </div>
              <div className="info-item">
                <div className="icon-container"><HiClock style={{ color: '#1d61ff', fontSize: '24px' }} className="icon-item-react" /></div>
                <div><strong>Giờ mở cửa</strong><p>{selectedPlace.operating_hours?.join(' | ')}</p></div>
              </div>
            </div>
            
            {/* CỤM NÚT ĐIỀU HƯỚNG MỚI (Nằm ngang) */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', width: '100%' }}>
              
              {/* NÚT 1: CHỌN LÀM ĐIỂM XUẤT PHÁT */}
              <button 
                style={{ 
                  flex: 1, background: '#ffffff', color: '#ffffff', border: '1px solid #1d61ff', 
                  padding: '12px 10px', borderRadius: '8px', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontWeight: 'bold', transition: 'all 0.3s', fontSize: '13px'
                }} 
                onClick={() => {
                  const feature = fansipanData.features.find(f => f.properties.name === selectedPlace.name);
                  if (feature) {
                    // Cập nhật tọa độ, khu vực và tên của điểm xuất phát mới
                    setMyLocationCoords([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
                    setCurrentArea(feature.properties.area);
                    setGpsInfo(`Điểm xuất phát: ${selectedPlace.name}`);
                    
                    // Xóa đường vẽ cũ đi cho sạch bản đồ
                    setRouteSegments(null); 
                    setCableCarRoute(null);
                  }
                }}
              >
                <HiLocationMarker style={{ fontSize: '18px', marginRight: '5px' }} /> 
                Xuất phát từ đây
              </button>

              {/* NÚT 2: CHỈ ĐƯỜNG ĐẾN ĐÂY */}
              <button 
                className="direction-btn" 
                disabled={isRouting}
                style={{ 
                  flex: 1, background: isRouting ? '#88aaff' : '#1d61ff', 
                  color: '#ffffff', border: 'none', padding: '12px 10px', 
                  borderRadius: '8px', cursor: isRouting ? 'wait' : 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontWeight: 'bold', transition: 'all 0.3s', fontSize: '13px', margin: 0
                }} 
                onClick={() => {
                  if (!isRouting) {
                    handleGetDirections();     
                    handleGetCableCarLine();   
                  }
                }}
              >
                <FiNavigation style={{ fontSize: '18px', marginRight: '5px' }} /> 
                {isRouting ? 'Đang dò...' : 'Chỉ đường đến đây'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;