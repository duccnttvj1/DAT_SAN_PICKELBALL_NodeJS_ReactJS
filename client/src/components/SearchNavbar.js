import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // IMPORT useNavigate
import "bootstrap-icons/font/bootstrap-icons.css";
import "./SearchNavbar.css";
import axios from "axios";

function SearchNavbar({
  onNearbyCourtsFound,
  onSearch,
  onShowFavorites,
  onShowBooked,
}) {
  const navigate = useNavigate();
  const [showFilter, setShowFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    sports: [],
    scheduleType: "",
    province: "",
    district: "",
    distance: false, // Tìm sân gần tôi
  });

  const [userLocation, setUserLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setIsGettingLocation(false);
        },
        (err) => {
          console.log("Không lấy được vị trí:", err);
          setIsGettingLocation(false);
          alert("Không thể lấy vị trí. Vui lòng bật GPS và cấp quyền.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Trình duyệt không hỗ trợ định vị.");
    }
  }, []);

  const handleMapNavigation = (isNearby = false) => {
    if (isNearby && !userLocation) {
      alert("Vui lòng bật vị trí để tìm sân gần bạn!");
      return;
    }

    const params = new URLSearchParams();

    if (isNearby && userLocation) {
      params.append("lat", userLocation.lat);
      params.append("lng", userLocation.lng);
      params.append("radius", 2);
    }

    if (searchQuery) {
      params.append("q", searchQuery);
    }
    if (filters.sports.length > 0) {
      params.append("sports", filters.sports.join(","));
    }

    navigate(`/map?${params.toString()}`);
  };

  const findNearbyCourts = () => {
    handleMapNavigation(true);
  };

  const applyFilters = () => {
    console.log("Lọc với:", { searchQuery, filters });
    setShowFilter(false);

    if (filters.distance) {
      handleMapNavigation(true);
    } else {
      // Nếu có searchQuery, trigger onSearch
      if (searchQuery) onSearch(searchQuery);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery) {
      onSearch(searchQuery);
    }
  };

  const handleShowBooked = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/booking-details/booked-courts",
        {
          headers: { accessToken: localStorage.getItem("accessToken") },
        }
      );
      onShowBooked(response.data); // Truyền danh sách sân đã đặt lên Home
    } catch (err) {
      console.error(err);
      alert("Không thể lấy danh sách sân đã đặt");
    }
  };

  const isLoadingLocation = isGettingLocation;

  return (
    <>
      {/* THANH TÌM KIẾM */}
      <div className="search-navbar bg-white shadow-sm p-3 rounded-pill d-flex align-items-center mb-4">
        <i
          className="bi bi-search text-success me-2"
          style={{ cursor: "pointer" }} // Làm icon clickable
          onClick={() => searchQuery && onSearch(searchQuery)} // Trigger search khi click kính lúp
        ></i>
        <input
          type="text"
          placeholder="Tìm kiếm sân, địa chỉ..."
          className="border-0 flex-grow-1"
          style={{ outline: "none" }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown} // THÊM: Enter để search
        />

        <div className="vr mx-3"></div>
        <button
          className="btn btn-link text-success p-0 text-decoration-none"
          onClick={() => setShowFilter(true)}
        >
          <i className="bi bi-sliders2"></i> Lọc
        </button>

        <div className="vr mx-3"></div>
        <button
          className="btn btn-link text-success p-0 text-decoration-none"
          onClick={() => handleMapNavigation(false)} // Bản đồ chung
          disabled={isLoadingLocation}
        >
          <i className="bi bi-geo-alt-fill"></i> Bản đồ
        </button>

        <div className="vr mx-3"></div>
        <button
          className="btn btn-link text-success p-0 text-decoration-none"
          onClick={handleShowBooked} // Trigger hiển thị sân đã đặt trên Home
        >
          <i className="bi bi-calendar-check"></i> Sân đã đặt
        </button>

        <div className="vr mx-3"></div>
        <button
          className="btn btn-link text-success p-0 text-decoration-none"
          onClick={onShowFavorites} // Trigger hiển thị yêu thích
        >
          <i className="bi bi-heart-fill"></i> Yêu thích
        </button>
      </div>

      {/* MODAL LỌC */}
      {showFilter && (
        <div
          className="filter-modal-backdrop"
          onClick={() => setShowFilter(false)}
        >
          <div
            className="filter-modal bg-white p-4 shadow"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MÔN THỂ THAO */}
            <div className="mb-4">
              <h6>Môn thể thao</h6>
              <div className="d-flex flex-wrap gap-2">
                {[
                  "Pickleball",
                  "Cầu lông",
                  "Bóng đá",
                  "Tennis",
                  "Bóng chuyền",
                ].map((sport) => (
                  <button
                    key={sport}
                    className={`btn btn-sm ${
                      filters.sports.includes(sport)
                        ? "btn-success"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => {
                      setFilters((f) => {
                        const sports = f.sports.includes(sport)
                          ? f.sports.filter((s) => s !== sport)
                          : [...f.sports, sport];
                        return { ...f, sports };
                      });
                    }}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>

            {/* LOẠI LỊCH */}
            <div className="mb-4">
              <h6>Loại lịch</h6>
              <div className="d-flex flex-wrap gap-2">
                {["Đơn ngày", "Đơn tháng", "Sự kiện"].map((type) => (
                  <button
                    key={type}
                    className={`btn btn-sm ${
                      filters.scheduleType === type
                        ? "btn-success"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        scheduleType: f.scheduleType === type ? "" : type,
                      }))
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* KHU VỰC */}
            <div className="mb-4">
              <h6>Khu vực</h6>
              <div className="row g-2">
                <div className="col-6">
                  <select
                    className="form-select form-select-sm"
                    value={filters.province}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, province: e.target.value }))
                    }
                  >
                    <option value="">Tỉnh/TP</option>
                    <option value="hcm">TP.HCM</option>
                    <option value="hn">Hà Nội</option>
                  </select>
                </div>
                <div className="col-6">
                  <select
                    className="form-select form-select-sm"
                    value={filters.district}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, district: e.target.value }))
                    }
                  >
                    <option value="">Quận/Huyện</option>
                    {filters.province === "hcm" && (
                      <>
                        <option value="q1">Quận 1</option>
                        <option value="q3">Quận 3</option>
                        <option value="binhthanh">Bình Thạnh</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* KHOẢNG CÁCH */}
            <div className="form-check mb-4">
              <input
                type="checkbox"
                className="form-check-input"
                id="nearby"
                checked={filters.distance}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, distance: e.target.checked }))
                }
              />
              <label className="form-check-label" htmlFor="nearby">
                Tìm sân gần tôi
              </label>
            </div>

            {/* NÚT */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary flex-grow-1"
                onClick={() => setShowFilter(false)}
              >
                Hủy
              </button>
              <button
                className="btn btn-success flex-grow-1"
                onClick={applyFilters}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoadingLocation && (
        <div className="text-center text-muted mt-2">
          <small>Đang lấy vị trí của bạn...</small>
        </div>
      )}
    </>
  );
}

export default SearchNavbar;
