import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import {
  HiLocationMarker,
  HiInformationCircle,
  HiClock,
  HiMenu,
  HiSearch,
  HiX,
} from "react-icons/hi";
import "leaflet/dist/leaflet.css";
import fansipanData from "./data/fansipan.json";
import "./MapView.css";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { FiNavigation, FiHome } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// ################################################################
import fansipanPaths from "./data/fansipan-paths.json";
import { Polyline } from "react-leaflet";

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
// Di chuyển các hàm tính toán này vào trong hoặc ngoài tùy ý,
// nhưng QUAN TRỌNG là xóa các dòng gọi hàm trực tiếp.

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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
    return (
      <img
        src="https://placehold.co/600x400?text=No+Image"
        alt="Không có ảnh"
        className="place-img"
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          borderRadius: "8px",
          marginBottom: "15px",
        }}
      />
    );
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <div style={{ position: "relative", width: "100%", marginBottom: "15px" }}>
      <img
        src={images[currentIndex]}
        alt={`Ảnh ${currentIndex + 1}`}
        className="place-img"
        style={{
          width: "100%",
          height: "200px",
          objectFit: "cover",
          borderRadius: "8px",
          display: "block",
        }}
        onError={(e) => {
          e.target.src = "https://placehold.co/600x400?text=No+Image";
        }}
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
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              background: "rgba(0, 0, 0, 0.6)",
              color: "white",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              zIndex: 10,
            }}
          >
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

    routingControlsRef.current.forEach((control) => {
      map.removeControl(control);
    });
    routingControlsRef.current = [];

    segments.forEach((segment) => {
      // Nhận mảng segment có thể có 2, 3 hoặc 4 điểm và vẽ liền mạch qua tất cả
      const control = L.Routing.control({
        waypoints: segment.map((p) => L.latLng(p[0], p[1])),
        lineOptions: {
          styles: [{ color: "#1d61ff", weight: 6, opacity: 0.8 }],
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
      routingControlsRef.current.forEach((control) => {
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
    linesRef.current.forEach((line) => {
      if (map) map.removeLayer(line);
    });
    linesRef.current = [];

    // 2. Lặp qua mảng routes (được tạo từ hàm addLine) để vẽ
    if (map && routes && routes.length > 0) {
      routes.forEach((routePoints) => {
        // Vẽ thẳng bằng L.polyline của Leaflet, không xài thẻ <Polyline>
        const line = L.polyline(routePoints, {
          color: "#1d61ff",
          weight: 4,
          dashArray: "8, 8", // Nét đứt
          opacity: 0.9,
        }).addTo(map);
        linesRef.current.push(line);
      });
    }

    return () => {
      linesRef.current.forEach((line) => {
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
      const timer = setTimeout(() => {
        markerRef.current.openPopup();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [map, coords, markerRef]);
  return null;
};

const FlyToLocation = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords[1], coords[0]], 18, {
        duration: 0.25,
        easeLinearity: 1,
      });
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
  const [myLocationCoords, setMyLocationCoords] = useState([
    22.3371665, 103.824208,
  ]);
  const centerPosition = [22.303246, 103.777648];

  const [gpsInfo, setGpsInfo] = useState(
    location.state?.gpsInfo || "Vị trí mặc định (Ga Mường Hoa)",
  );
  const [currentArea, setCurrentArea] = useState(
    location.state?.areaData || "Khu vực Mường Hoa",
  );

  const [routeSegments, setRouteSegments] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [cableCarRoute, setCableCarRoute] = useState(null);
  const [walkRoute, setWalkRoute] = useState(null);

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

    const destinationArea = fansipanData.features.find(
      (f) => f.properties.name === selectedPlace.name,
    )?.properties.area;
    if (!destinationArea) return;

    // Toạ độ đường cáp treo Fansipan (Ga Hoàng Liên - Ga Fansipan)
    const p_GaHoangLien = [22.337, 103.824194];
    const p_GaFansipan = [22.30655, 103.774694];
    const straightPoints = [p_GaHoangLien, p_GaFansipan];

    const p_GaSapa = [22.334254, 103.840374];
    const p_GaMuongHoa = [22.336618, 103.825004];
    const straightPointsSapa = [
      p_GaMuongHoa,
      [22.33486, 103.8308],
      [22.3345, 103.832],
      [22.3339, 103.8338],
      [22.33319, 103.836],
      [22.33307, 103.837],
      [22.3331, 103.838],
      [22.33345, 103.839],
      [22.333797, 103.8399],
      [22.334, 103.84028],
      p_GaSapa,
    ];

    const linesToDraw = []; // Mảng chứa các đường chim bay

    // HÀM addLine ĐỂ PUSH DỮ LIỆU
    const addLine = (points) => {
      linesToDraw.push(points);
    };

    // Kiểm tra nếu đi qua lại giữa khu vực có cáp treo thì gọi addLine
    if (currentArea !== destinationArea) {
      if (
        (currentArea === "Khu vực Fansipan" &&
          destinationArea !== "Khu vực Fansipan") ||
        (currentArea !== "Khu vực Fansipan" &&
          destinationArea === "Khu vực Fansipan")
      ) {
        addLine(straightPoints); // Gọi hàm addLine
      } else if (
        (currentArea === "Khu vực Sun Plaza - Sapa" &&
          destinationArea !== "Khu vực Sun Plaza - Sapa") ||
        (currentArea !== "Khu vực Sun Plaza - Sapa" &&
          destinationArea === "Khu vực Sun Plaza - Sapa")
      ) {
        addLine(straightPointsSapa); // Gọi hàm addLine
      }
    }

    // Ném mảng cho Component StraightLineMachine vẽ
    setCableCarRoute(linesToDraw);
  };

  const redPinIcon = useMemo(
    () =>
      L.divIcon({
        className: "custom-red-pin",
        iconSize: [35, 35],
        iconAnchor: [17, 35],
        popupAnchor: [1, -34],
        html: `<div class="pin-marker-red"><div class="pin-marker-head-red"></div><div class="pin-marker-point-red"></div></div>`,
      }),
    [],
  );

  const filteredPlaces = useMemo(() => {
    if (!searchTerm) return fansipanData.features; // Trả về tất cả nếu không gõ gì

    const lowerSearchTerm = searchTerm.toLowerCase();

    return fansipanData.features.filter((f) => {
      const nameMatch = f.properties.name
        ?.toLowerCase()
        .includes(lowerSearchTerm);
      const areaMatch = f.properties.area
        ?.toLowerCase()
        .includes(lowerSearchTerm);

      // Trả về true nếu tên HOẶC khu vực chứa từ khóa tìm kiếm
      return nameMatch || areaMatch;
    });
  }, [searchTerm]);

  const onEachFeature = useMemo(
    () => (feature, layer) => {
      layer.on({
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedPlace(feature.properties);
          setShowList(false);
          setRouteSegments(null);
        },
      });
    },
    [],
  );

  const geoJsonLayer = useMemo(
    () => <GeoJSON data={fansipanData} onEachFeature={onEachFeature} />,
    [onEachFeature],
  );
  const handleGetDirections = () => {
    if (!selectedPlace) return;

    setIsRouting(true);
    setRouteSegments(null);
    setWalkRoute(null);
    setCableCarRoute(null);

    const feature = fansipanData.features.find(
      (f) => f.properties.name === selectedPlace.name,
    );
    const destinationCoords = [
      feature.geometry.coordinates[1],
      feature.geometry.coordinates[0],
    ];
    const destinationArea = feature.properties.area;

    const startNodeName = gpsInfo
      .replace("Điểm xuất phát: ", "")
      .replace("Vị trí mặc định (", "")
      .replace(")", "")
      .trim();
    const endNodeName = selectedPlace.name;

    // Tọa độ các ga mốc
    const p_GaSapa = [22.334254, 103.840374];
    const p_GaMuongHoa = [22.336618, 103.825004];
    const p_GaHoangLien = [22.33707, 103.8243];
    const p_GaFansipan = [22.306694, 103.774694];

    const segments = [];

    // --- LOGIC CHỈ ĐƯỜNG MỚI (CHẶN OSRM Ở CÁC ĐOẠN VẼ TAY) ---

    if (currentArea !== "Khu vực Fansipan") {
      if (destinationArea !== "Khu vực Fansipan") {
        // TRƯỜNG HỢP: SAPA <-> MƯỜNG HOA
        if (currentArea !== destinationArea) {
          // CẤM segments.push() ở đây để triệt tiêu đường nét liền OSRM
          // Chỉ dùng đường vẽ tay nét đứt của bạn bạn qua CableCarRoute
          const pointsSapaToMuongHoa = [
            p_GaMuongHoa,
            [22.33486, 103.8308],
            [22.3345, 103.832],
            [22.3339, 103.8338],
            [22.33319, 103.836],
            [22.33307, 103.837],
            [22.3331, 103.838],
            [22.33345, 103.839],
            [22.333797, 103.8399],
            [22.334, 103.84028],
            p_GaSapa,
          ];
          // Nếu đi ngược lại thì đảo mảng tọa độ
          setCableCarRoute(
            currentArea === "Khu vực Sun Plaza - Sapa"
              ? [pointsSapaToMuongHoa.reverse()]
              : [pointsSapaToMuongHoa],
          );
        } else {
          // Nếu cùng khu vực dưới phố (ví dụ từ KS sang Sun Plaza) -> Dùng OSRM bình thường
          segments.push([myLocationCoords, destinationCoords]);
        }
      } else {
        // TRƯỜNG HỢP: PHỐ LÊN NÚI (Sapa/Mường Hoa -> Fansipan)
        if (currentArea === "Khu vực Sun Plaza - Sapa") {
          // Đoạn 1: Sapa -> Mường Hoa (Dùng nét đứt vẽ tay, KHÔNG push vào segments)
          const pointsSapaToMuongHoa = [
            p_GaMuongHoa,
            [22.33486, 103.8308],
            /*...*/ p_GaSapa,
          ];
          setCableCarRoute([
            pointsSapaToMuongHoa.reverse(),
            [p_GaHoangLien, p_GaFansipan],
          ]);
        } else {
          // Đoạn 1: Đã ở Mường Hoa, chỉ cần vẽ cáp treo lên đỉnh
          setCableCarRoute([[p_GaHoangLien, p_GaFansipan]]);
        }
        // Đoạn 2: Dijkstra trên đỉnh núi
        const pathResult = findShortestPath("Ga Fansipan", endNodeName);
        setWalkRoute(pathResult);
      }
    } else {
      // LOGIC KHU VỰC ĐỈNH (Giữ nguyên như cũ của Trang)
      if (destinationArea === "Khu vực Fansipan") {
        const pathResult = findShortestPath(startNodeName, endNodeName);
        setWalkRoute(pathResult);
      } else {
        const pathResultToGa = findShortestPath(startNodeName, "Ga Fansipan");
        setWalkRoute(pathResultToGa);
        // Vẽ cáp treo đi xuống
        const lines = [[p_GaFansipan, p_GaHoangLien]];
        if (destinationArea === "Khu vực Sun Plaza - Sapa") {
          const pointsSapaToMuongHoa = [p_GaMuongHoa, /*...*/ p_GaSapa];
          lines.push(pointsSapaToMuongHoa);
        }
        setCableCarRoute(lines);
      }
    }

    if (segments.length > 0) setRouteSegments(segments);
    setTimeout(() => {
      setIsRouting(false);
    }, 2500);
  };

  return (
    <div
      className="map-wrapper"
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        className="map-header"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 1000,
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "15px 0",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* Nút Trang chủ đã được gắn class */}
        <button className="home-btn" onClick={() => navigate("/")}>
          <FiHome className="home-icon" /> <span>Trang chủ</span>
        </button>

        <span
          className="header-title"
          style={{
            fontWeight: "900",
            letterSpacing: "-1.5px",
            fontSize: "1.6rem",
            color: "#000000",
          }}
        >
          Sunworld Fansipan Legend
        </span>
      </div>

      {/* ==========================================
          KHU VỰC TÌM KIẾM VÀ MENU RỚT (DROPDOWN)
          ========================================== */}
      <div className="search-wrapper">
        <div className="floating-search-bar">
          {/* Nút 3 gạch: Giữ nguyên chức năng mở Sidebar to */}
          <button
            className="menu-icon-btn"
            onClick={() => setShowList(true)}
            style={{ background: "none", border: "none" }}
          >
            <HiMenu style={{ color: "black", fontSize: "24px" }} />
          </button>

          <div className="search-divider" />

          {/* Ô nhập liệu: Chỉ mở bảng nhỏ (dropdown), tắt bảng to */}
          <input
            type="text"
            placeholder="Bạn muốn đến?"
            value={searchTerm}
            onFocus={() => {
              if (searchTerm) setShowDropdown(true);
            }}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true); // Bật menu rớt
              setShowList(false); // Tắt bảng sidebar to đi
            }}
          />

          {/* Nếu đang có chữ thì hiện nút X màu đỏ để xóa nhanh, không thì hiện kính lúp */}
          {searchTerm ? (
            <HiX
              className="search-icon-right"
              style={{ cursor: "pointer", color: "#ff4d4f" }}
              onClick={() => {
                setSearchTerm("");
                setShowDropdown(false);
              }}
            />
          ) : (
            <HiSearch className="search-icon-right" />
          )}
        </div>

        {/* BẢNG DROPDOWN MENU KẾT QUẢ TÌM KIẾM (Chỉ hiện khi gõ chữ) */}
        {showDropdown && searchTerm && (
          <div className="search-dropdown">
            {filteredPlaces.length > 0 ? (
              filteredPlaces.map((place, index) => (
                <div
                  key={index}
                  className="dropdown-item"
                  onClick={() => {
                    setSelectedPlace(place.properties);
                    setShowDropdown(false); // Đóng menu rớt
                    setSearchTerm(""); // Xóa sạch chữ vừa gõ
                    setRouteSegments(null); // Xóa đường đi cũ
                    setCableCarRoute(null);
                  }}
                >
                  <HiLocationMarker className="dropdown-icon" />
                  <div className="dropdown-info">
                    <strong>{place.properties.name}</strong>
                    <span>{place.properties.area}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dropdown-empty">
                Không tìm thấy địa điểm "{searchTerm}"
              </div>
            )}
          </div>
        )}
      </div>

      <MapContainer
        ref={mapRef}
        center={centerPosition}
        zoom={15}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {geoJsonLayer}
        <InitialFlyToUser coords={myLocationCoords} markerRef={redMarkerRef} />

        {/* LOGIC VẼ ĐƯỜNG */}
        {routeSegments && <RoutingMachine segments={routeSegments} />}
        <StraightLineMachine routes={cableCarRoute} />

        {walkRoute &&
          walkRoute.segments &&
          walkRoute.segments.map((seg, idx) => (
            <Polyline
              key={idx}
              positions={seg.coords}
              pathOptions={{
                color: seg.isTrain ? "#2ecc71" : "#ff4d4f", // Xanh cho tàu, đỏ cho đi bộ
                weight: 2, // Mỏng theo ý Trang
                opacity: 0.8,
                dashArray: seg.isTrain ? "5, 10" : "none",
              }}
            />
          ))}

        <Marker
          position={myLocationCoords}
          icon={redPinIcon}
          ref={redMarkerRef}
        >
          <Popup>
            <div
              style={{
                fontFamily: '"Segoe UI", sans-serif',
                fontSize: "13px",
                width: "230px",
              }}
            >
              <strong
                style={{
                  color: "#ff4d4f",
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "14px",
                }}
              >
                Vị trí của bạn
              </strong>
              <p
                style={{
                  margin: 0,
                  lineHeight: "1.4",
                  whiteSpace: "pre-line",
                  color: "#333",
                }}
              >
                {gpsInfo}
              </p>
            </div>
          </Popup>
        </Marker>

        {selectedPlace && (
          <FlyToLocation
            coords={
              fansipanData.features.find(
                (f) => f.properties.name === selectedPlace.name,
              )?.geometry.coordinates
            }
          />
        )}
      </MapContainer>

      {/* SIDEBAR DANH SÁCH */}
      <div className={`location-list-sidebar ${showList ? "open" : ""}`}>
        <div className="list-header">
          <h3>Danh sách địa điểm</h3>
          {/* Thêm class vào đây để dễ gọi CSS */}
          <button className="close-list-btn" onClick={() => setShowList(false)}>
            <HiX />
          </button>
        </div>
        <div className="list-content">
          {filteredPlaces.map((place, index) => (
            <div
              key={index}
              className="location-item-card"
              onClick={() => {
                setSelectedPlace(place.properties);
                setShowList(false);
                setRouteSegments(null);
              }}
            >
              <div className="loc-icon">
                <HiLocationMarker />
              </div>
              <div className="loc-info">
                <strong>{place.properties.name}</strong>
                <span>{place.properties.area}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
            <button
              className="close-btn"
              onClick={() => setSelectedPlace(null)}
            >
              ✕
            </button>
          </div>
          <div className="sidebar-content">
            {/* COMPONENT HIỂN THỊ LIST ẢNH */}
            <ImageCarousel images={selectedPlace.images} />

            <h2 className="place-name">{selectedPlace.name}</h2>
            <span className="area-badge">{selectedPlace.area}</span>
            <div className="info-card">
              <div className="info-item">
                <div className="icon-container">
                  <HiLocationMarker
                    style={{ color: "#1d61ff", fontSize: "24px" }}
                    className="icon-item-react"
                  />
                </div>
                <div>
                  <strong>Vị trí địa điểm</strong>
                  <p>
                    {fansipanData.features
                      .find((f) => f.properties.name === selectedPlace.name)
                      ?.geometry.coordinates.slice()
                      .reverse()
                      .join(", ")}
                  </p>
                </div>
              </div>
              <div className="info-item">
                <div className="icon-container">
                  <HiInformationCircle
                    style={{ color: "#1d61ff", fontSize: "24px" }}
                    className="icon-item-react"
                  />
                </div>
                <div>
                  <strong>Thông tin</strong>
                  <p>{selectedPlace.description}</p>
                </div>
              </div>
              <div className="info-item">
                <div className="icon-container">
                  <HiClock
                    style={{ color: "#1d61ff", fontSize: "24px" }}
                    className="icon-item-react"
                  />
                </div>
                <div>
                  <strong>Giờ mở cửa</strong>
                  <p>{selectedPlace.operating_hours?.join(" | ")}</p>
                </div>
              </div>
            </div>

            {/* CỤM NÚT ĐIỀU HƯỚNG MỚI (Nằm ngang) */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "15px",
                width: "100%",
              }}
            >
              {/* NÚT 1: CHỌN LÀM ĐIỂM XUẤT PHÁT */}
              <button
                style={{
                  flex: 1,
                  background: "#ffffff",
                  color: "#ffffff",
                  border: "1px solid #1d61ff",
                  padding: "12px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  transition: "all 0.3s",
                  fontSize: "13px",
                }}
                onClick={() => {
                  const feature = fansipanData.features.find(
                    (f) => f.properties.name === selectedPlace.name,
                  );
                  if (feature) {
                    // 1. Cập nhật tọa độ và thông tin ngay lập tức
                    setMyLocationCoords([
                      feature.geometry.coordinates[1],
                      feature.geometry.coordinates[0],
                    ]);
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
                <HiLocationMarker
                  style={{ fontSize: "18px", marginRight: "5px" }}
                />
                Xuất phát từ đây
              </button>

              {/* NÚT 2: CHỈ ĐƯỜNG ĐẾN ĐÂY */}
              <button
                className="direction-btn"
                disabled={isRouting}
                style={{
                  flex: 1,
                  background: isRouting ? "#88aaff" : "#1d61ff",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 10px",
                  borderRadius: "8px",
                  cursor: isRouting ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  transition: "all 0.3s",
                  fontSize: "13px",
                  margin: 0,
                }}
                onClick={() => {
                  if (!isRouting) {
                    handleGetDirections();
                    handleGetCableCarLine();
                    setTimeout(() => {
                      setSelectedPlace(null);
                    }, 3000);
                  }
                }}
              >
                <FiNavigation
                  style={{ fontSize: "18px", marginRight: "5px" }}
                />
                {isRouting ? "Đang dò..." : "Chỉ đường đến đây"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
