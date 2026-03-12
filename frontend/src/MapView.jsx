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
  const mapRef = useRef(null); // THÊM DÒNG NÀY

  const myLocationCoords = useMemo(() => [22.3371665, 103.824208], []);
  const centerPosition = [22.303246, 103.777648];
  
  const gpsInfo = location.state?.gpsInfo || "Đang xác định vị trí của bạn...";
  const currentArea = location.state?.areaData || "Khu vực Sun Plaza - Mường Hoa"; 

  const [routeSegments, setRouteSegments] = useState(null);

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

  // HÀM XỬ LÝ CHỈ ĐƯỜNG MỚI: Tự động chèn Waypoint khi di chuyển liên khu vực
  const handleGetDirections = () => {
    if (!selectedPlace) return;

    const feature = fansipanData.features.find(f => f.properties.name === selectedPlace.name);
    if (!feature) return;

    const destination = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
    const destinationArea = feature.properties.area;
    
    // Toạ độ các trạm giao thông cố định (Gateways)
    const p_GaSapa = [22.334254, 103.840374];
    const p_GaMuongHoa = [22.336618, 103.825004];
    const p_GaHoangLien = [22.336944, 103.824194];
    const p_GaFansipan = [22.306694, 103.774694];

  if (currentArea === destinationArea) {
      // Cùng khu vực: Server tự xử lý từ A đến B
      setRouteSegments([ [myLocationCoords, destination] ]);
    } else {
      // Khác khu vực: Chia 2 chặng Server xử lý qua Trạm Trung Chuyển
      const segments = [];
      
      // 1. XUẤT PHÁT TỪ: MƯỜNG HOA
      if (currentArea === "Khu vực Sun Plaza - Mường Hoa") {
        if (destinationArea === "Khu vực Fansipan") {
          segments.push([myLocationCoords, p_GaHoangLien]);
          if (selectedPlace.name !== "Ga Fansipan") {
            segments.push([p_GaFansipan, destination]);
          }
        } else if (destinationArea === "Khu vực Sapa") {
          segments.push([myLocationCoords, p_GaMuongHoa]);
          if (selectedPlace.name !== "Ga Sapa") {
            segments.push([p_GaSapa, destination]);
          }
        }
      } 
      
      // 2. XUẤT PHÁT TỪ: FANSIPAN
      else if (currentArea === "Khu vực Fansipan") {
        // Chặng 1: Từ vị trí hiện tại ra Ga Fansipan
        segments.push([myLocationCoords, p_GaFansipan]); 

        if (destinationArea === "Khu vực Sun Plaza - Mường Hoa") {
          if (selectedPlace.name !== "Ga Hoàng Liên") {
            segments.push([p_GaHoangLien, destination]);
          }
        } else if (destinationArea === "Khu vực Sapa") {
          // THIẾU Ở ĐÂY ĐÃ ĐƯỢC THÊM: Đi bộ nối chuyến từ Hoàng Liên sang Mường Hoa
          segments.push([p_GaHoangLien, p_GaMuongHoa]);
          
          // Chặng cuối: Từ Ga Sapa về đích
          if (selectedPlace.name !== "Ga Sapa") {
            segments.push([p_GaSapa, destination]);
          }
        }
      }

      // 3. XUẤT PHÁT TỪ: SAPA
      else if (currentArea === "Khu vực Sapa") {
        // Chặng 1: Từ vị trí hiện tại ra Ga Sapa
        segments.push([myLocationCoords, p_GaSapa]);

        if (destinationArea === "Khu vực Sun Plaza - Mường Hoa") {
          if (selectedPlace.name !== "Ga Mường Hoa") {
            segments.push([p_GaMuongHoa, destination]);
          }
        } else if (destinationArea === "Khu vực Fansipan") {
          // THIẾU Ở ĐÂY ĐÃ ĐƯỢC THÊM: Đi bộ nối chuyến từ Mường Hoa sang Hoàng Liên
          segments.push([p_GaMuongHoa, p_GaHoangLien]);
          
          // Chặng cuối: Từ Ga Fansipan lên đích
          if (selectedPlace.name !== "Ga Fansipan") {
            segments.push([p_GaFansipan, destination]);
          }
        }
      } 
      
      // Trường hợp dự phòng 
      else {
        segments.push([myLocationCoords, destination]);
      }

      setRouteSegments(segments);
    }
  };

  return (
    <div className="map-wrapper" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div className="map-header" style={{ 
        position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 1000,
        background: 'white', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', padding: '15px 0', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.1)' 
      }}>
        <button onClick={() => navigate('/')} style={{position: 'absolute', left: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white' , border: 'none', cursor: 'pointer', color: '#ffffff', fontFamily: '"Segoe UI", sans-serif', fontWeight: '600', fontSize: '16px' }}>
          <FiHome style={{ fontSize: '20px' ,color: 'white'}} /> <span>Trang chủ </span>
        </button>
        <span style={{ fontWeight: '900', letterSpacing: '-1.5px', fontSize: '1.6rem', color: '#000000' }}>Sunworld Fansipan Legend</span>
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
          // Bấm vào thanh tìm kiếm là mở danh sách ra luôn
          onClick={() => setShowList(true)} 
          onChange={(e) => {
            setSearchTerm(e.target.value);
            // Gõ chữ là tự động mở danh sách để thấy kết quả lọc
            setShowList(true); 
          }}
        />
        <HiSearch className="search-icon-right" />
      </div>

      <MapContainer ref={mapRef} center={centerPosition} zoom={15} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {geoJsonLayer}
        <InitialFlyToUser coords={myLocationCoords} markerRef={redMarkerRef} />

        {/* LOGIC VẼ ĐƯỜNG ĐÃ ĐƯỢC CHIA TRƯỜNG HỢP VÀ DÙNG OSRM */}
        {routeSegments && <RoutingMachine segments={routeSegments} />}
        
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
          <button onClick={() => setShowList(false)}><HiX /></button>
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

      {/* NÚT VỀ VỊ TRÍ HIỆN TẠI (Góc dưới bên trái) */}
      <button 
        onClick={handleReturnToMyLocation}
        style={{
          position: 'absolute',
          bottom: '20px', // Cách đáy 40px
          left: '20px',   // Cách trái 20px
          zIndex: 1000   // Nổi lên trên bản đồ
        }}
        title="Vị trí của tôi"
      >
        {/* Xoay icon 45 độ để thành hình mũi tên định vị GPS */}
       <HiLocationMarker style={{ color: '#ffffff', fontSize: '24px' }} className="icon-item-react" />
      </button>

      {/* SIDEBAR THÔNG TIN CHI TIẾT */}
      {selectedPlace && !showList && (
        <div className="info-sidebar">
          <div className="sidebar-header">
            <span>Thông tin địa điểm</span>
            <button className="close-btn" onClick={() => setSelectedPlace(null)}>✕</button>
          </div>
          <div className="sidebar-content">
            <img src={selectedPlace.images[0]} alt={selectedPlace.name} className="place-img" onError={(e) => {e.target.src='https://placehold.co/600x400?text=No+Image'}} />
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
            
            <button className="direction-btn" style={{ background: '#1d61ff', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '15px', fontWeight: 'bold' }} onClick={handleGetDirections}>
              <FiNavigation style={{ fontSize: '20px', marginRight: '10px' }} /> Chỉ đường đến đây
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;