import React, { useContext } from "react";
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import axios from "axios";
import SearchNavbar from "../components/SearchNavbar";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../helpers/AuthContext";

function Home() {
  const [listOfCourts, setListOfCourts] = useState([]);
  const [favoritedCourts, setFavoritedCourts] = useState([]);
  const { authState } = useContext(AuthContext);
  const [nearbyCourts, setNearbyCourts] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [bookedCourts, setBookedCourts] = useState([]);
  const [showBooked, setShowBooked] = useState(false);
  let navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authState.status && !authState.isAuthLoading) {
      navigate("/login");
      return;
    }
    if (authState.status) {
      fetchCourts();
    }
  }, [authState.status, authState.isAuthLoading, navigate, location]);

  const fetchCourts = async (q = "") => {
    try {
      const response = await axios.get(`http://localhost:3001/courts?q=${q}`, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      setListOfCourts(response.data.listOfCourts);
      setFavoritedCourts(
        response.data.favoritedCourts.map((fav) => fav.courtId)
      );
      setShowFavorites(false);
      setShowBooked(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (query) => {
    fetchCourts(query);
  };

  const handleShowFavorites = async () => {
    if (showFavorites) {
      fetchCourts();
      setShowFavorites(false);
    } else {
      try {
        const response = await axios.get("http://localhost:3001/favorites", {
          headers: { accessToken: localStorage.getItem("accessToken") },
        });
        setListOfCourts(response.data);
        setShowFavorites(true);
      } catch (err) {
        console.error(err);
        alert("Không thể lấy danh sách yêu thích");
      }
    }
  };

  const handleShowBooked = async () => {
    if (showBooked) {
      // Nếu đang hiển thị → quay lại danh sách tất cả
      fetchCourts();
      setShowBooked(false);
    } else {
      try {
        const response = await axios.get(
          "http://localhost:3001/booking-details/booked-courts",
          {
            headers: { accessToken: localStorage.getItem("accessToken") },
          }
        );

        // response.data là mảng các Court đã đặt (không trùng)
        setListOfCourts(response.data);
        setShowBooked(true);
        setShowFavorites(false); // Ẩn yêu thích nếu đang bật
        setNearbyCourts([]); // Ẩn gần đây nếu có
      } catch (err) {
        console.error("Lỗi lấy sân đã đặt:", err);
        alert("Không thể tải danh sách sân đã đặt!");
      }
    }
  };

  const handleNearbyCourtsFound = (courts) => {
    setNearbyCourts(courts);
  };

  const toggleFavorite = (courtId) => {
    axios
      .post(
        "http://localhost:3001/favorites",
        { courtId },
        { headers: { accessToken: localStorage.getItem("accessToken") } }
      )
      .then((response) => {
        if (response.data.isFavorite) {
          setFavoritedCourts([...favoritedCourts, courtId]);
        } else {
          setFavoritedCourts(favoritedCourts.filter((id) => id !== courtId));
        }
      });
  };

  // Hàm mới: Cắt địa chỉ nếu dài quá 18 ký tự
  const truncateAddress = (address) => {
    if (!address) return "Chưa có địa chỉ";
    return address.length > 18 ? `${address.substring(0, 18)}...` : address;
  };

  return (
    <div className="container-fluid p-3">
      <SearchNavbar
        onNearbyCourtsFound={handleNearbyCourtsFound}
        onSearch={handleSearch}
        onShowFavorites={handleShowFavorites}
        onShowBooked={handleShowBooked}
      />

      {showFavorites && (
        <h5 className="text-success mb-3">
          Danh sách sân yêu thích ({listOfCourts.length})
        </h5>
      )}

      {showBooked && (
        <div className="mt-4">
          <h5 className="text-success mb-3">
            Sân đã đặt ({bookedCourts.length})
          </h5>
          <div className="ps-5 pe-5 pt-4 row">
            {bookedCourts.map((value) => (
              <div className="col-md-12 col-lg-6 pb-5" key={value.id}>
                <div
                  className="card shadow rounded-3 overflow-hidden"
                  onClick={() => navigate(`/courtDetail/${value.id}`)}
                >
                  <div
                    className="card-img-top position-relative"
                    style={{
                      backgroundImage: `url('/pickelball-courtField.png')`,
                      height: "200px",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="position-absolute top-0 start-0 m-2">
                      <span className="text-dark bg-white rounded-start-3 px-2 py-1">
                        <i className="bi bi-star-fill"></i> {value.rating}
                      </span>
                      <span className="text-bg-success ps-2 pe-1 py-1">
                        Đơn ngày
                      </span>
                      <span className="text-bg-primary ps-1 pe-1 py-1">
                        Đơn tháng
                      </span>
                      <span className="text-bg-danger rounded-end-3 pe-2 py-1 ps-1">
                        Sự kiện
                      </span>
                    </div>
                    <div
                      className="d-flex justify-content-center align-items-center position-absolute top-0 end-0 text-success m-2 me-5 bg-white rounded-circle"
                      style={{ width: "40px", height: "40px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(value.id);
                      }}
                    >
                      <i
                        className={`bi ${
                          favoritedCourts.includes(value.id)
                            ? "bi-heart-fill text-success"
                            : "bi-heart"
                        }`}
                        style={{ fontSize: "20px", fontWeight: "bold" }}
                      ></i>
                    </div>
                  </div>
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="rounded-circle overflow-hidden border border-2 border-white"
                      style={{
                        width: "70px",
                        height: "70px",
                        backgroundImage: `url(${
                          value.avatarUrl ||
                          localStorage.getItem("courtAvatar_" + value.id) ||
                          "/icon_pickelball.png"
                        })`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    ></div>
                    <div className="d-flex flex-column ms-1 justify-content-center align-items-start">
                      <div
                        className="title fw-bold"
                        style={{ fontSize: "20px" }}
                      >
                        {value.courtName}
                      </div>
                      <div className="address text-muted ">
                        {truncateAddress(value.address)}
                      </div>
                      <div className="time text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {value.openTime.slice(0, 5)} -{" "}
                        {value.closeTime.slice(0, 5)}
                        <span>
                          <a
                            href={`tel:${value.phoneNumber}`}
                            className="text-decoration-none"
                          >
                            <i className="bi bi-telephone-fill ms-3 me-1"></i>
                            Liên hệ
                          </a>
                        </span>
                      </div>
                    </div>
                    <button
                      className="position-absolute end-0 bottom-0 text-bg-warning rounded-2 text-white border px-3 py-2 mb-3 me-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/BookingDetail/${value.id}`);
                      }}
                    >
                      Đặt lịch
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nearbyCourts.length > 0 && (
        <div className="mt-4">
          <h5 className="text-success mb-3">
            Tìm thấy {nearbyCourts.length} sân gần bạn
          </h5>
          <div className="ps-5 pe-5 pt-4 row">
            {nearbyCourts.map((value) => (
              <div className="col-md-12 col-lg-6 pb-5" key={value.id}>
                <div
                  className="card shadow rounded-3 overflow-hidden"
                  onClick={() => navigate(`/courtDetail/${value.id}`)}
                >
                  <div
                    className="card-img-top position-relative"
                    style={{
                      backgroundImage: `url('/pickelball-courtField.png')`,
                      height: "200px",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="position-absolute top-0 start-0 m-2">
                      <span className="text-dark bg-white rounded-start-3 px-2 py-1">
                        <i className="bi bi-star-fill"></i> {value.rating}
                      </span>
                      <span className="text-bg-success ps-2 pe-1 py-1">
                        Đơn ngày
                      </span>
                      <span className="text-bg-primary ps-1 pe-1 py-1">
                        Đơn tháng
                      </span>
                      <span className="text-bg-danger rounded-end-3 pe-2 py-1 ps-1">
                        Sự kiện
                      </span>
                    </div>
                    <div
                      className="d-flex justify-content-center align-items-center position-absolute top-0 end-0 text-success m-2 me-5 bg-white rounded-circle"
                      style={{ width: "40px", height: "40px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(value.id);
                      }}
                    >
                      <i
                        className={`bi ${
                          favoritedCourts.includes(value.id)
                            ? "bi-heart-fill text-success"
                            : "bi-heart"
                        }`}
                        style={{ fontSize: "20px", fontWeight: "bold" }}
                      ></i>
                    </div>
                  </div>
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="rounded-circle overflow-hidden border border-2 border-white"
                      style={{
                        width: "70px",
                        height: "70px",
                        backgroundImage: `url(${
                          value.avatarUrl ||
                          localStorage.getItem("courtAvatar_" + value.id) ||
                          "/icon_pickelball.png"
                        })`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    ></div>
                    <div className="d-flex flex-column ms-1 justify-content-center align-items-start">
                      <div
                        className="title fw-bold"
                        style={{ fontSize: "20px" }}
                      >
                        {value.courtName}
                      </div>
                      <div className="address text-muted">
                        {truncateAddress(value.address)}
                      </div>
                      <div className="time text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {value.openTime?.slice(0, 5) || "N/A"} -{" "}
                        {value.closeTime?.slice(0, 5) || "N/A"}
                      </div>
                    </div>
                    <button
                      className="position-absolute end-0 bottom-0 text-bg-warning rounded-2 text-white border px-3 py-2 mb-3 me-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/BookingDetail/${value.id}`);
                      }}
                    >
                      Đặt lịch
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {nearbyCourts.length === 0 && (
        <div className="ps-5 pe-5 pt-4 row">
          {listOfCourts.map((value, key) => {
            return (
              <div className="col-md-12 col-lg-6 pb-5" key={value.id}>
                <div
                  className="card shadow rounded-3 overflow-hidden"
                  onClick={() => {
                    navigate(`/courtDetail/${value.id}`);
                  }}
                >
                  <div
                    className="card-img-top position-relative"
                    style={{
                      backgroundImage: `url('/pickelball-courtField.png')`,
                      height: "200px",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="position-absolute top-0 start-0 m-2">
                      <span className="text-dark bg-white rounded-start-3 px-2 py-1">
                        <i className="bi bi-star-fill"></i> {value.rating}
                      </span>
                      <span className="text-bg-success ps-2 pe-1 py-1">
                        Đơn ngày
                      </span>
                      <span className="text-bg-primary ps-1 pe-1 py-1">
                        Đơn tháng
                      </span>
                      <span className="text-bg-danger rounded-end-3 pe-2 py-1 ps-1">
                        Sự kiện
                      </span>
                    </div>
                    <div
                      className="d-flex justify-content-center align-items-center position-absolute top-0 end-0 text-success m-2 me-5 bg-white rounded-circle"
                      style={{ width: "40px", height: "40px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(value.id);
                      }}
                    >
                      <i
                        className={`bi ${
                          favoritedCourts.includes(value.id)
                            ? "bi-heart-fill text-success"
                            : "bi-heart"
                        }`}
                        style={{ fontSize: "20px", fontWeight: "bold" }}
                      ></i>
                    </div>
                  </div>
                  <div className="card-body d-flex align-items-center">
                    <div
                      className="rounded-circle overflow-hidden border border-2 border-white"
                      style={{
                        width: "70px",
                        height: "70px",
                        backgroundImage: `url(${
                          value.avatarUrl ||
                          localStorage.getItem("courtAvatar_" + value.id) ||
                          "/icon_pickelball.png"
                        })`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    ></div>
                    <div className="d-flex flex-column ms-1 justify-content-center align-items-start">
                      <div
                        className="title fw-bold"
                        style={{ fontSize: "20px" }}
                      >
                        {value.courtName}
                      </div>
                      <div className="address text-muted ">
                        {truncateAddress(value.address)}
                      </div>
                      <div className="time text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {value.openTime.slice(0, 5)} -{" "}
                        {value.closeTime.slice(0, 5)}
                        <span>
                          <a
                            href={`tel:${value.phoneNumber}`}
                            className="text-decoration-none"
                          >
                            <i className="bi bi-telephone-fill ms-3 me-1"></i>
                            Liên hệ
                          </a>
                        </span>
                      </div>
                    </div>
                    <button
                      className="position-absolute end-0 bottom-0 text-bg-warning rounded-2 text-white border px-3 py-2 mb-3 me-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/BookingDetail/${value.id}`);
                      }}
                    >
                      Đặt lịch
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Home;