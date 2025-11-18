// src/pages/MapPage.js
import React, { useState, useEffect } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import axios from "axios";
import { useLocation } from "react-router-dom";

const containerStyle = { width: "100%", height: "100vh" };
const libraries = ["places"];

function MapPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [courts, setCourts] = useState([]);
  const [center, setCenter] = useState({ lat: 10.762622, lng: 106.660172 });
  const [userLocation, setUserLocation] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
    id: "google-maps-script",
  });

  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");

    if (lat && lng) {
      const userLoc = { lat: parseFloat(lat), lng: parseFloat(lng) };
      setUserLocation(userLoc);
      setCenter(userLoc);
    }

    axios
      .get("http://localhost:3001/courts/all")
      .then((res) => {
        let data = res.data;

        // ĐẢM BẢO data là mảng
        if (!Array.isArray(data)) {
          console.warn("Dữ liệu courts không phải mảng:", data);
          data = [];
        }

        // Lọc theo khoảng cách
        if (lat && lng && radius) {
          const R = 6371;
          data = data.filter((court) => {
            if (!court.lat || !court.lng) return false;
            const dLat = ((court.lat - lat) * Math.PI) / 180;
            const dLon = ((court.lng - lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((lat * Math.PI) / 180) *
                Math.cos((court.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return distance <= parseFloat(radius);
          });
        }

        setCourts(data);
        if (data.length > 0) {
          setCenter({
            lat: parseFloat(data[0].lat) || 10.762622,
            lng: parseFloat(data[0].lng) || 106.660172,
          });
        }
      })
      .catch((err) => {
        console.error("Lỗi lấy courts:", err);
        setCourts([]); // Luôn là mảng
      });
  }, [location.search]);

  if (loadError) return <div>Lỗi tải bản đồ: {loadError.message}</div>;
  if (!isLoaded) return <div>Đang tải bản đồ...</div>;

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
      {userLocation && (
        <MarkerF
          position={userLocation}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          }}
          title="Vị trí của bạn"
        />
      )}
      {courts.map((court) => {
        if (!court.lat || !court.lng) return null;
        return (
          <MarkerF
            key={court.id}
            position={{
              lat: parseFloat(court.lat),
              lng: parseFloat(court.lng),
            }}
            title={court.courtName}
          />
        );
      })}
    </GoogleMap>
  );
}

export default React.memo(MapPage);
