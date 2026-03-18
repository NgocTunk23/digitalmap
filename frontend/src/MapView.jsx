import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import { HiLocationMarker, HiInformationCircle, HiClock, HiMenu, HiSearch, HiX } from "react-icons/hi"; 
import 'leaflet/dist/leaflet.css';
import fansipanData from './data/fansipan.json';
import './MapView.css'; 
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { useNavigate, useLocation } from "react-router-dom"; 




import { FiNavigation, FiHome, FiClock, FiArrowUp } from "react-icons/fi"; 
import { FaWalking } from 'react-icons/fa';
import { MdTurnRight } from 'react-icons/md';
import { BiCheckDouble } from 'react-icons/bi';
import { IoClose } from 'react-icons/io5';

import fansipanPaths from "./data/fansipan-paths.json";
import { Polyline } from "react-leaflet";




import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

















const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getPathLength = (coords) => {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    total += calculateDistance(p1[1], p1[0], p2[1], p2[0]);
  }
  return total;
};

const findShortestPath = (startNode, endNode) => {
  if (!startNode || !endNode || startNode === endNode) return null;
  let distances = {};
  let prev = {};
  let nodes = new Set();
  let segmentsData = {};

  fansipanPaths.features.forEach((f) => {
    const { from, to, isTrain } = f.properties;
    const coords = f.geometry.coordinates;
    const weight = getPathLength(coords);

    if (!distances[from]) distances[from] = Infinity;
    if (!distances[to]) distances[to] = Infinity;
    nodes.add(from);
    nodes.add(to);

    if (!segmentsData[from]) segmentsData[from] = [];
    segmentsData[from].push({ to, weight, coords, isTrain });
    if (!segmentsData[to]) segmentsData[to] = [];
    segmentsData[to].push({
      to: from,
      weight,
      coords,
      isTrain: isTrain || false,
      reverse: true,
    });
  });

  if (!nodes.has(startNode) || !nodes.has(endNode)) return null;

  distances[startNode] = 0;
  let pq = [startNode];

  while (pq.length > 0) {
    pq.sort((a, b) => distances[a] - distances[b]);
    let u = pq.shift();
    if (u === endNode) break;

    (segmentsData[u] || []).forEach((edge) => {
      let alt = distances[u] + edge.weight;
      if (alt < distances[edge.to]) {
        distances[edge.to] = alt;
        prev[edge.to] = {
          from: u,
          coords: edge.coords,
          isTrain: edge.isTrain,
          reverse: edge.reverse,
        };
        if (!pq.includes(edge.to)) pq.push(edge.to);
      }
    });
  }

  let resultSegments = [];
  let curr = endNode;
  while (prev[curr]) {
    let edge = prev[curr];
    let finalCoords = edge.coords.map((c) => [c[1], c[0]]);
    if (edge.reverse) finalCoords.reverse();
    resultSegments.unshift({
      coords: finalCoords,
      isTrain: edge.isTrain || false,
    });
    curr = edge.from;
  }
  return resultSegments.length > 0 ? { segments: resultSegments } : null;
};












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


const RoutingMachine = ({ segments, onRouteCalculated }) => {
  const map = useMap();
  const routingControlsRef = useRef([]);

  useEffect(() => {
    if (!map || !segments || segments.length === 0) return;

    // Dọn dẹp các control cũ
    routingControlsRef.current.forEach(control => map.removeControl(control));
    routingControlsRef.current = [];

    let segmentResults = []; // Mảng lưu kết quả chi tiết từng chặng
    let completedRequests = 0;

    segments.forEach((segment, index) => {
      const control = L.Routing.control({
        waypoints: segment.map(p => L.latLng(p[0], p[1])),
        lineOptions: { styles: [{ color: '#1d61ff', weight: 6, opacity: 0.8 }] },
        addWaypoints: false, 
        draggableWaypoints: false,
        fitSelectedRoutes: index === 0, // Chỉ fit khung hình cho chặng đầu hoặc tùy chỉnh
        showAlternatives: false,
        createMarker: () => null,
      }).addTo(map);

      control.on('routesfound', function(e) {
        const routes = e.routes;
        if (routes && routes[0]) {
           const summary = routes[0].summary; 
           // Lưu đúng vị trí của chặng trong mảng kết quả
           segmentResults[index] = {
             distance: summary.totalDistance,
             time: summary.totalTime
           };
        }
        
        completedRequests++;
        // Khi tất cả các chặng (ví dụ: 2 chặng) đã gọi server xong
        if (completedRequests === segments.length && onRouteCalculated) {
          onRouteCalculated(segmentResults);
        }
      });
      
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
      map.flyTo(coords, 18, { duration: 0.25, easeLinearity: 1 });
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
  const [showDropdown, setShowDropdown] = useState(false); // THÊM DÒNG NÀY: Công tắc bật/tắt bảng tìm kiếm nhỏ
  const navigate = useNavigate(); 
  const location = useLocation();
  const redMarkerRef = useRef(null);
  const mapRef = useRef(null); 
  const [myLocationCoords, setMyLocationCoords] = useState([22.3371665, 103.824208]);
  const centerPosition = [22.303246, 103.777648];
  
  const [gpsInfo, setGpsInfo] = useState(location.state?.gpsInfo || "Fansipan View");
  const [currentArea, setCurrentArea] = useState(location.state?.areaData || "Khu vực Mường Hoa");

  const [routeSegments, setRouteSegments] = useState(null);
  const [isRouting, setIsRouting] = useState(false); 
  const [cableCarRoute, setCableCarRoute] = useState(null);


  // === STATE MỚI CHO BẢNG CHI TIẾT ===
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [routeSteps, setRouteSteps] = useState([]); // State chứa danh sách các bước
  const [routeSummary, setRouteSummary] = useState({ dist: '0m', time: '0 phút' }); // State chứa tổng quan
  const [walkRoute, setWalkRoute] = useState(null);



  const handleRouteCalculated = useCallback((allSegmentsData) => {
  const formatDist = (d) => d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
  const formatTime = (t) => Math.max(1, Math.round(t / 60)) + ' phút';

  const totalDist = allSegmentsData.reduce((sum, seg) => sum + (seg?.distance || 0), 0);
  const totalTime = allSegmentsData.reduce((sum, seg) => sum + (seg?.time || 0), 0);
  
  // --- BẮT ĐẦU CHỈNH SỬA: Nếu d=0 và t=0 (do mảng rỗng trên Fansipan) thì mới set '--' ---
    if (totalDist === 0 && totalTime === 0) {
      setRouteSummary({ dist: '--', time: '--' });
    } else {
      setRouteSummary({ dist: formatDist(totalDist), time: formatTime(totalTime) });
    }
  // --- KẾT THÚC CHỈNH SỬA ---

  setRouteSteps(prevSteps => {
    return prevSteps.map(step => {
      // Kiểm tra nếu bước này có yêu cầu dữ liệu từ server qua serverIdx
      if (step.type === 'walking' && step.serverIdx !== undefined && step.serverIdx !== null) {
        const segmentData = allSegmentsData[step.serverIdx];
        if (segmentData) {

          if (segmentData.distance === 0) {
            return {
              ...step,
              dist: '--' // Ghi đè mô tả để user hiểu
            };
          }

          return {
            ...step,
            dist: formatDist(segmentData.distance)
          };
        }
      }
      return step;
    });
  });

  setIsRouting(false);
  setShowRouteDetails(true);
}, []);

  const generateRouteDetails = (destination) => {
  const steps = [];
  const startArea = currentArea;
  const endArea = destination.area;
  let stepId = 1;
  let currentServerIdx = 0; // Biến đánh dấu chỉ số chặng từ Server

  const stations = ["Ga Fansipan", "Ga Hoàng Liên", "Ga tàu hỏa leo núi Mường Hoa", "Ga Sapa"];
  const isStartAtStation = stations.some(s => gpsInfo.includes(s));
  const isEndAtStation = stations.some(s => destination.name.includes(s));
  const isSameArea = startArea === endArea;

  // 1. Vị trí xuất phát
  steps.push({ id: stepId++, icon: <FiArrowUp />, title: 'Vị trí của bạn', desc: gpsInfo.replace('Điểm xuất phát: ', ''), dist: '' });

  // 2. TRƯỜNG HỢP 5 CHẶNG (Fansipan <-> Sapa)
  const isCrossComplex = ((startArea === "Khu vực Fansipan" && endArea === "Khu vực Sun Plaza - Sapa") || (startArea === "Khu vực Sun Plaza - Sapa" && endArea === "Khu vực Fansipan"));

  if (isCrossComplex) {
    // Chặng đi bộ 1: Ra ga đầu
    if (!isStartAtStation) {
      // --- BẮT ĐẦU CHỈNH SỬA (Chặn tính đường bộ TỪ khu vực Fansipan ra Ga) ---
      const isWalkingInFansipan = startArea === "Khu vực Fansipan";
      steps.push({ 
        id: stepId++, type: 'walking', icon: <FaWalking />, 
        title: 'Đi bộ đến', desc: (startArea === "Khu vực Sun Plaza - Sapa") ? 'Ga Sapa' : 'Ga Fansipan',
        dist: isWalkingInFansipan ? 'Đường bậc thang' : '...', // Hiện chữ thay vì ...
        serverIdx: isWalkingInFansipan ? null : currentServerIdx // Note: Gán null để bỏ qua server
      });
      // --- KẾT THÚC CHỈNH SỬA ---
    }
    currentServerIdx++; // QUAN TRỌNG: Dù có push vào UI hay không, index của server vẫn tăng

    // Chặng cáp 1
    steps.push({ id: stepId++, icon: <MdTurnRight />, 
      title: (startArea === "Khu vực Sun Plaza - Sapa")?'Tàu hỏa leo núi':'Tuyến cáp treo', 
      desc:  (startArea === "Khu vực Sun Plaza - Sapa")?'Di chuyển bằng Tàu hỏa leo núi Mường Hoa':'Di chuyển bằng Cáp treo Fansipan', 
      dist:  (startArea === "Khu vực Sun Plaza - Sapa")?'2000 m':'6292,5 m'});

    // Chặng đi bộ 2: Chuyển ga
    steps.push({ 
      id: stepId++, type: 'walking', icon: <FaWalking />, 
      title: 'Đi bộ đến', desc: (startArea === "Khu vực Sun Plaza - Sapa")? 'Ga Hoàng Liên': 'Ga Mường Hoa', 
      dist: '...', serverIdx: currentServerIdx 
    });
    currentServerIdx++;

    // Chặng cáp 2
    steps.push({ id: stepId++, icon: <MdTurnRight />, 
      title:  (startArea === "Khu vực Sun Plaza - Sapa")?'Tuyến cáp treo':'Tàu hỏa leo núi', 
      desc:   (startArea === "Khu vực Sun Plaza - Sapa")?'Di chuyển bằng Cáp treo Fansipan':'Di chuyển bằng Tàu hỏa leo núi Mường Hoa', 
      dist:   (startArea === "Khu vực Sun Plaza - Sapa")?'6292,5 m':'2000 m' 
    });

  } 
  // 3. TRƯỜNG HỢP 1 CHẶNG CÁP
  else if (!isSameArea) {
    if (!isStartAtStation) {
      // --- BẮT ĐẦU CHỈNH SỬA (Chặn tính đường bộ TỪ khu vực Fansipan ra Ga) ---
      const isWalkingInFansipan = startArea === "Khu vực Fansipan";
      steps.push({ 
        id: stepId++, type: 'walking', icon: <FaWalking />, 
        title: 'Đi bộ ra ga', desc: `Tại ${startArea}`, 
        dist: isWalkingInFansipan ? 'Đường bậc thang' : '...', 
        serverIdx: isWalkingInFansipan ? null : currentServerIdx 
      });
      // --- KẾT THÚC CHỈNH SỬA ---
    }
    currentServerIdx++; 

    steps.push({ id: stepId++, icon: <MdTurnRight />,
      title: (startArea === "Khu vực Sun Plaza - Sapa" || endArea=== "Khu vực Sun Plaza - Sapa")?'Tàu hỏa leo núi':'Tuyến cáp treo', 
      desc: (startArea === "Khu vực Sun Plaza - Sapa" || endArea=== "Khu vực Sun Plaza - Sapa")?'Di chuyển bằng Tàu hỏa leo núi Mường Hoa':'Di chuyển bằng Cáp treo Fansipan', 
      dist: (startArea === "Khu vực Sun Plaza - Sapa" || endArea=== "Khu vực Sun Plaza - Sapa")?'2000 m':'6292,5 m' 
    });
  }

  // 4. CHẶNG CUỐI: Đi bộ đến đích
  const isAtGoal = isEndAtStation && !isSameArea;
  
  // --- BẮT ĐẦU CHỈNH SỬA (Kiểm tra đích đến có nằm trong Fansipan không) ---
  const isEndInFansipan = endArea === "Khu vực Fansipan";

  if (isEndInFansipan && !isAtGoal) {
    // Rơi vào case: (Fansipan -> Fansipan) HOẶC (Nơi khác tới Ga Fansipan -> Điểm ở Fansipan)
    steps.push({ 
      id: stepId++, 
      type: 'walking', 
      icon: <BiCheckDouble />, 
      title: 'Tham quan', 
      desc: destination.name, 
      dist: 'Đường đi bộ trên đỉnh núi', // Text tĩnh
      serverIdx: null // Note: Gán null để không lấy dữ liệu API tính toán nét vẽ
    });
  } else {
    // Trường hợp bình thường ở các khu vực khác
    steps.push({ 
      id: stepId++, 
      type: 'walking', 
      icon: <BiCheckDouble />, 
      title: isAtGoal ? destination.name : 'Đi bộ đến', 
      desc: isAtGoal ? destination.area : destination.name, 
      dist: isAtGoal ? 'Tại ga' : '...',
      serverIdx: isAtGoal ? null : currentServerIdx 
    });
  }
  // --- KẾT THÚC CHỈNH SỬA ---

  setRouteSteps(steps);
};

// HÀM: Đưa camera về lại vị trí xuất phát (hoặc vị trí GPS hiện tại)
  const handleReturnToMyLocation = () => {
    if (mapRef.current) {
      mapRef.current.stop(); // Dừng mọi animation đang có
      
      // 1. Dọn dẹp màn hình: Đóng bảng thông tin và danh sách nếu đang mở
      setSelectedPlace(null);
      setShowList(false);
      
      // 2. Bay về vị trí xuất phát (tọa độ này luôn là mới nhất nhờ State)
      mapRef.current.flyTo(myLocationCoords, 18, { duration: 1.2 });
      
      // 3. Tự động bật cái biển báo (Popup) màu đỏ lên
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
    const p_GaFansipan = [22.306607549827092, 103.77477934814624];
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
      if (
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
      return nameMatch;
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
    // Clear các đường nét cũ
    setRouteSegments(null); 
    setWalkRoute(null);     // --- MỚI CHÈN ---

    const feature = fansipanData.features.find(f => f.properties.name === selectedPlace.name);
    if (!feature) {
        setIsRouting(false);
        return;
    }

    const destination = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];
    const destinationArea = feature.properties.area;

    // --- MỚI CHÈN: Xử lý tên node để khớp với file JSON chứa tọa độ Fansipan ---
    const startNodeName = gpsInfo
      .replace("Điểm xuất phát: ", "")
      .replace("Vị trí mặc định (", "")
      .replace(")", "")
      .trim();
    const endNodeName = selectedPlace.name;
    // ------------------------------------------------------------------------
    
    const p_GaSapa = [22.334254, 103.840374];
    const p_GaMuongHoa = [22.336618, 103.825004];
    const p_GaHoangLien = [22.33707, 103.8243];
    const p_GaFansipan = [22.306607549827092, 103.77477934814624];

    let segments = [];

    // TRƯỜNG HỢP: ĐI LẠI TRONG CÙNG 1 KHU VỰC
    if (currentArea === destinationArea) {
      if (currentArea === "Khu vực Fansipan") {
        // --- MỚI CHÈN: Vẽ đường đi bộ trên đỉnh núi (Fansipan -> Fansipan) ---
        const pathResult = findShortestPath(startNodeName, endNodeName);
        setWalkRoute(pathResult); 
        segments = []; // Ép mảng rỗng để không gọi OSRM vẽ đè
        // ---------------------------------------------------------------------
      } else {
        segments.push([myLocationCoords, destination]);
      }
    } 
    // TRƯỜNG HỢP: ĐI XUYÊN KHU VỰC
    else {
      // MƯỜNG HOA
      if (currentArea === "Khu vực Mường Hoa") {
        if (destinationArea === "Khu vực Fansipan") {
          segments.push([myLocationCoords, p_GaHoangLien]);
          // --- MỚI CHÈN: Vẽ đi bộ từ Ga Fansipan đến đích (Phố -> Núi) ---
          const pathResult = findShortestPath("Ga Fansipan", endNodeName);
          setWalkRoute(pathResult);
          // ---------------------------------------------------------------
        } else if (destinationArea === "Khu vực Sun Plaza - Sapa") {
          segments.push([myLocationCoords, p_GaMuongHoa]);
          if (selectedPlace.name !== "Ga Sapa") {
            segments.push([p_GaSapa, destination]);
          }
        }
      } 
      // FANSIPAN
      else if (currentArea === "Khu vực Fansipan") {
        // --- MỚI CHÈN: Vẽ đi bộ từ điểm hiện tại ra Ga Fansipan (Núi -> Phố) ---
        const pathResult = findShortestPath(startNodeName, "Ga Fansipan");
        setWalkRoute(pathResult);
        // -----------------------------------------------------------------------
        
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
          // --- MỚI CHÈN: Vẽ đi bộ từ Ga Fansipan đến đích (Phố -> Núi) ---
          const pathResult = findShortestPath("Ga Fansipan", endNodeName);
          setWalkRoute(pathResult);
          // ---------------------------------------------------------------
        }
      } 
      // DỰ PHÒNG 
      else {
        segments.push([myLocationCoords, destination]);
      }
    }

    // Gán dữ liệu để render ra map OSRM cho phần đường phố
    setRouteSegments(segments);

    // FIX LỖI KẸT LOADING: 
    if (segments.length === 0) {
      setTimeout(() => {
        handleRouteCalculated([]);
      }, 300); // Đợi 1 chút cho mượt UI
    }
  };

  // --- THÊM ĐOẠN NÀY ĐỂ KIỂM TRA GHI CHÚ THỜI GIAN ĐI DẠO ---
  // 1. Kiểm tra xem điểm đó có nằm ở dưới phố không (Sapa, Mường Hoa)
  const isStartBelow = currentArea !== "Khu vực Fansipan";
  const isEndBelow = selectedPlace?.area !== "Khu vực Fansipan";

  // 2. Kiểm tra xem điểm đó có nằm sâu trong đỉnh núi không (Phải thuộc Fansipan VÀ Không phải Ga)
  const isStartDeepInPeak = currentArea === "Khu vực Fansipan" && !gpsInfo.includes("Ga Fansipan");
  const isEndDeepInPeak = selectedPlace?.area === "Khu vực Fansipan" && selectedPlace?.name !== "Ga Fansipan";

  // 3. CHỐT LOGIC: Chỉ hiện ghi chú khi đi từ Dưới Phố <-> Sâu Trong Đỉnh
  const showWalkingNote = (isStartBelow && isEndDeepInPeak) || (isStartDeepInPeak && isEndBelow);
  // ---------------------------------------------------------

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

     {/* ==========================================
          KHU VỰC TÌM KIẾM VÀ MENU RỚT (DROPDOWN)
          ========================================== */}
      <div className="search-wrapper">
        <div className="floating-search-bar">
          
          {/* Nút 3 gạch: Giữ nguyên chức năng mở Sidebar to */}
          <button className="menu-icon-btn" onClick={() => setShowList(true)} style={{ background: 'none', border: 'none' }}>
            <HiMenu style={{ color: 'black', fontSize: '24px' }} />
          </button>
          
          <div className="search-divider" />
          
          {/* Ô nhập liệu: Chỉ mở bảng nhỏ (dropdown), tắt bảng to */}
          <input 
            type="text" 
            placeholder="Bạn muốn đến?" 
            value={searchTerm}
            onFocus={() => { if(searchTerm) setShowDropdown(true); }} 
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true); // Bật menu rớt
              setShowList(false);    // Tắt bảng sidebar to đi
            }}
          />
          
          {/* Nếu đang có chữ thì hiện nút X màu đỏ để xóa nhanh, không thì hiện kính lúp */}
          {searchTerm ? (
            <HiX className="search-icon-right" style={{ cursor: 'pointer', color: '#ff4d4f' }} onClick={() => { setSearchTerm(''); setShowDropdown(false); }} />
          ) : (
            <HiSearch className="search-icon-right" />
          )}
        </div>

        {/* BẢNG DROPDOWN MENU KẾT QUẢ TÌM KIẾM (Chỉ hiện khi gõ chữ) */}
        {showDropdown && searchTerm && (
          <div className="search-dropdown">
            {filteredPlaces.length > 0 ? (
              filteredPlaces.map((place, index) => (
                <div key={index} className="dropdown-item" onClick={() => {
                  setSelectedPlace(place.properties);
                  setShowDropdown(false); // Đóng menu rớt
                  setSearchTerm('');      // Xóa sạch chữ vừa gõ
                  setRouteSegments(null); // Xóa đường đi cũ
                  setCableCarRoute(null);
                }}>
                  <HiLocationMarker className="dropdown-icon" />
                  <div className="dropdown-info">
                    <strong>{place.properties.name}</strong>
                    <span>{place.properties.area}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dropdown-empty">Không tìm thấy địa điểm "{searchTerm}"</div>
            )}
          </div>
        )}
      </div>

      <MapContainer ref={mapRef} center={centerPosition} zoom={15} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {geoJsonLayer}
        <InitialFlyToUser coords={myLocationCoords} markerRef={redMarkerRef} />

        {/* LOGIC VẼ ĐƯỜNG */}
        {routeSegments && <RoutingMachine segments={routeSegments} onRouteCalculated={handleRouteCalculated} />}
        <StraightLineMachine routes={cableCarRoute} />

        {/* --- CHÈN THÊM ĐOẠN NÀY ĐỂ VẼ ĐƯỜNG ĐI BỘ TRÊN ĐỈNH NÚI --- */}
        {walkRoute && walkRoute.segments && walkRoute.segments.map((seg, idx) => (
          <Polyline
            key={idx}
            positions={seg.coords}
            pathOptions={{
              color: seg.isTrain ? "#2ecc71" : "#ff4d4f", // Xanh lá nếu là tàu, đỏ nếu đi bộ
              weight: 5,
              opacity: 0.9,
              dashArray: seg.isTrain ? "8, 8" : "" // Nét đứt cho tàu, nét liền cho đi bộ
            }}
          />
        ))}
        {/* --------------------------------------------------------- */}
        
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
      
      <button 
        className="my-new-btn" // Bạn có thể giữ nguyên class này để dùng chung style
        onClick={() => setShowRouteDetails(true)} // Thay bằng hàm xử lý của bạn
        title="Hành động khác"
      >
        {/* Thay icon dưới đây bằng icon bạn muốn */}
        <FiNavigation className="my-location-icon" /> 
      </button>

      <button 
        className="my-location-btn"
        onClick={handleReturnToMyLocation}
        title="Vị trí của tôi"
      >
       <HiLocationMarker className="my-location-icon" />
      </button>

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
                    // 1. Cập nhật tọa độ và thông tin ngay lập tức
                    setMyLocationCoords([feature.geometry.coordinates[1], feature.geometry.coordinates[0]]);
                    setCurrentArea(feature.properties.area);
                    setGpsInfo(`Điểm xuất phát: ${selectedPlace.name}`);
                    
                    setRouteSegments(null); 
                    setCableCarRoute(null);
                    
                    // 2. BÍ QUYẾT CHỐNG RUNG MAP: Đợi 0.3 giây (300ms) để map bắt đầu bay rồi mới đóng bảng thông tin
                    setTimeout(() => {
                      setSelectedPlace(null);
                    }, 300);
                  }
                }}
              >
                <HiLocationMarker style={{ fontSize: '18px', marginRight: '5px' }} /> 
                Xuất phát từ đây
              </button>

              {/* NÚT 2: CHỈ ĐƯỜNG ĐẾN ĐÂY */}
              <button 
                className="direction-btn" disabled={isRouting}
                style={{ flex: 1, background: isRouting ? '#88aaff' : '#1d61ff', color: '#ffffff', border: 'none', padding: '12px 10px', borderRadius: '8px', cursor: isRouting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', transition: 'all 0.3s', fontSize: '13px', margin: 0 }} 
                onClick={() => {
                  if (!isRouting) {
                    // 1. Chỉ chuẩn bị sẵn data chữ (Khoảng cách = "Đang tính...")
                    generateRouteDetails(selectedPlace);
                    
                    // 2. Bắt đầu gọi server vẽ đường (Xong nó sẽ tự gọi hàm handleRouteCalculated ở trên)
                    handleGetDirections();     
                    handleGetCableCarLine();   

                    // 3. TỰ ĐỘNG ĐÓNG BẢNG THÔNG TIN (Sau 0.3 giây để UI mượt và không bị lỗi mất data)
                    setTimeout(() => {
                      setSelectedPlace(null);
                    }, 300);
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

      


      {/* ==========================================
          BOTTOM SHEET: CHI TIẾT TUYẾN ĐƯỜNG
          ========================================== */}
      {/* Lớp nền đen mờ (Overlay) */}
      {showRouteDetails && (
        <div className="route-overlay" onClick={() => setShowRouteDetails(false)}></div>
      )}

      {/* Bảng trượt Bottom Sheet (Luôn render để CSS animation trượt lên hoạt động mượt) */}
      <div className={`route-bottom-sheet ${showRouteDetails ? 'open' : ''}`}>
        
        {/* Header: Tiêu đề + Thông tin tổng */}
        <div className="route-header">
          <h2>Chi tiết</h2>
          <div className="route-summary">
            <span className="summary-item"><FaWalking className="text-green"/> {routeSummary.dist}</span>


            {/* --- SỬA LẠI THẺ SPAN THỜI GIAN Ở ĐÂY --- */}
            <span className="summary-item" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FiClock className="text-green"/> {routeSummary.time}
              </span>
              {showWalkingNote && (
                <span style={{ fontSize: '11.5px', color: '#666', fontStyle: 'italic', fontWeight: 'normal' }}>
                  (Chưa bao gồm thời gian đi dạo trên đỉnh núi Fansipan, đi Tàu, đi Cáp treo)
                </span>
              )}
            </span>
            {/* -------------------------------------- */}



          </div>
          <button className="close-sheet-btn" onClick={() => setShowRouteDetails(false)}><IoClose /></button>
        </div>

        {/* Danh sách các bước đi */}
        <div className="route-steps-container">
          {routeSteps.map((step) => (
            <div className="route-step-card" key={step.id}>
              <div className="step-icon-wrapper">
                {step.icon}
              </div>
              <div className="step-info">
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {step.dist && <span className="step-dist">{step.dist}</span>}
              </div>
            </div>
          ))}
        </div>

      </div>



    </div>
  );
};

export default MapView;