import React, { useState, useEffect, useContext, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate, Link, useParams } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../helpers/AuthContext";
import "../styles/CourtDetail.css";
import { FaMapMarkerAlt } from "react-icons/fa";

function CourtDetail() {
  let { id } = useParams();
  const [courtDetail, setCourtDetail] = useState({});
  const [courtFields, setCourtFields] = useState([]);
  const { authState } = useContext(AuthContext);
  let navigate = useNavigate();

  const bookACourt = () => {};
  const [avatarCourtUrl, setAvatarCourtUrl] = useState(
    localStorage.getItem("avatarCourtUrl") || "/icon_pickelball.png"
  );
  // Trong CourtDetail.js
  const [fieldTypes, setFieldTypes] = useState([]);

  const [backgroundUrl, setBackgroundUrl] = useState("/sanco.png");

  useEffect(() => {
    axios.get(`http://localhost:3001/courts/byId/${id}`).then((response) => {
      setCourtDetail(response.data);
      setCourtFields(response.data.CourtFields || []); // LẤY DANH SÁCH SÂN CON
      console.log(courtFields);

      // Avatar
      const savedAvatar = localStorage.getItem("courtAvatar_" + id);
      setAvatarCourtUrl(
        savedAvatar || response.data.avatarUrl || "/icon_pickelball.png"
      );

      // Background - mới thêm
      const savedBg = localStorage.getItem("courtBackground_" + id);
      setBackgroundUrl(savedBg || response.data.backgroundUrl || "/sanco.png");
    });
  }, [id]);

  // Thêm ref cho ảnh nền
  const fileInputBgRef = useRef(null);

  // Hàm xử lý upload ảnh nền
  const handleBgFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("background", file); // tên field là "background" (sẽ xử lý ở backend)

    try {
      const res = await axios.post(
        `http://localhost:3001/courts/${id}/background`,
        formData,
        {
          headers: {
            accessToken: localStorage.getItem("accessToken"),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newBgUrl = res.data.backgroundUrl;
      setBackgroundUrl(newBgUrl);
      localStorage.setItem("courtBackground_" + id, newBgUrl);
      alert("Cập nhật ảnh nền thành công!");
    } catch (err) {
      alert(
        "Lỗi upload ảnh nền: " + (err.response?.data?.error || err.message)
      );
    }
  };

  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (authState.role === "admin") {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await axios.post(
        `http://localhost:3001/courts/${id}/avatar`,
        formData,
        {
          headers: {
            accessToken: localStorage.getItem("accessToken"),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newAvatarUrl = res.data.avatarUrl;
      setAvatarCourtUrl(newAvatarUrl);
      localStorage.setItem("courtAvatar_" + id, newAvatarUrl); // Lưu riêng cho từng sân
      alert("Cập nhật avatar thành công!");
    } catch (err) {
      alert("Lỗi upload: " + (err.response?.data?.error || err.message));
    }
  };

  const formatPrice = (price) => {
    const p = Number(price) || 0;
    return p > 0 ? p.toLocaleString("vi-VN") + "đ" : "Chưa đặt giá";
  };

  return (
    <div className="fixed top-0 right-0 h-full w-1/2 bg-white shadow-lg z-50 p-4 overflow-auto">
      {/* ==================== THAY THẾ TOÀN BỘ PHẦN NÀY ==================== */}
      <div
        className="card-img-top position-relative"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          height: "200px",
          width: "100%",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          position: "relative",
        }}
      >
        {/* Nút camera cho ảnh nền - chỉ admin thấy */}
        {authState.role === "admin" && (
          <div
            className="position-absolute bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow"
            style={{
              width: "40px",
              height: "40px",
              bottom: "12px",
              right: "12px",
              cursor: "pointer",
              fontSize: "18px",
              zIndex: 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              fileInputBgRef.current?.click();
            }}
          >
            <i className="bi bi-camera-fill"></i>
          </div>
        )}

        {/* Các nút cũ giữ nguyên */}
        <div className="position-absolute top-0 start-0 m-2">
          <button
            className="border-2 rounded-1 bg-transparent text-warning fw-bold fs-5 px-3 py-2 mt-2 hover-button"
            onClick={() => navigate("/")}
          >
            Close
          </button>
        </div>
        <div
          className="d-flex justify-content-center align-items-center position-absolute text-success m-2 me-5 bg-white rounded-circle"
          style={{ width: "40px", height: "40px", top: "8px", right: "80px" }}
        >
          <i
            className="bi bi-heart-fill"
            style={{ fontSize: "20px", fontWeight: "bold" }}
          ></i>
        </div>
        <button
          className="position-absolute text-bg-warning rounded-2 text-white border-0 px-3 py-2 mt-2 me-3"
          style={{ top: "7px", right: "8px" }}
          onClick={() => navigate(`/BookingDetail/${id}`)}
        >
          Đặt lịch
        </button>
      </div>

      {/* Input file ẩn cho ảnh nền */}
      <input
        type="file"
        ref={fileInputBgRef}
        accept="image/*"
        onChange={handleBgFileChange}
        style={{ display: "none" }}
      />
      {/* ================================================================== */}
      <div className="card-body d-flex flex-column align-items-start mt-4 infoCourt">
        <div className="d-flex">
          <div className="position-relative d-inline-block">
            {/* Avatar + Nút camera */}
            <div
              className="rounded-circle text-bg-primary avatarCourt position-relative"
              style={{
                width: "150px",
                height: "150px",
                backgroundImage: `url(${avatarCourtUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: authState.role === "admin" ? "pointer" : "default",
              }}
              onClick={handleAvatarClick}
            >
              {/* Nút camera nhỏ tròn góc dưới phải - chỉ admin thấy */}
              {authState.role === "admin" && (
                <div
                  className="position-absolute bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow"
                  style={{
                    width: "40px",
                    height: "40px",
                    bottom: "8px",
                    right: "8px",
                    cursor: "pointer",
                    fontSize: "18px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <i className="bi bi-camera-fill"></i>
                </div>
              )}
            </div>

            {/* Input file ẩn */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </div>

          <div>
            <div className="title ms-3 mt-3" style={{ fontSize: "45px" }}>
              {courtDetail.courtName}
            </div>
            <div className="ms-3 mt-2">
              {fieldTypes.map((field, index) => (
                <div className="fieldType me-2 py-2 px-3 fw-bold">
                  {field.fieldType}
                </div>
              ))}
              {fieldTypes.length === 0 && (
                <span className="text-warning fs-5">
                  Chưa có thông tin loại sân nào
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="d-flex flex-column mt-3 ms-1 justify-content-center align-items-start">
          <div className="address text-muted d-flex fs-4 mb-2">
            {" "}
            <FaMapMarkerAlt className="direction me-3" />
            <div>{courtDetail.address}</div>
          </div>
          <div className="time d-flex text-muted fs-4 mb-2">
            <i className="bi bi-clock me-3 mt-2 text-primary courtDetail"></i>
            <div className="mt-2">
              {courtDetail.openTime
                ? courtDetail.openTime.slice(0, 5)
                : "--:--"}{" "}
              -{" "}
              {courtDetail.closeTime
                ? courtDetail.closeTime.slice(0, 5)
                : "--:--"}
            </div>
          </div>
          <div className="d-flex fs-4">
            <div className="mt-2">
              <i className="telephone bi bi-telephone-fill me-3"></i>
            </div>
            <div className="text-muted mt-2">
              Liên hệ - {courtDetail.phoneNumber}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <ul className="nav nav-tabs" id="myTab" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className="nav-link active" // Chỉ tab đầu có active
              id="tab1-tab"
              data-bs-toggle="tab"
              data-bs-target="#tab1"
              type="button"
              role="tab"
              aria-controls="tab1"
              aria-selected="true"
            >
              Thông tin
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className="nav-link"
              id="tab2-tab"
              data-bs-toggle="tab"
              data-bs-target="#tab2"
              type="button"
              role="tab"
              aria-controls="tab2"
              aria-selected="false"
            >
              Dịch vụ
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className="nav-link"
              id="tab3-tab"
              data-bs-toggle="tab"
              data-bs-target="#tab3"
              type="button"
              role="tab"
              aria-controls="tab3"
              aria-selected="false"
            >
              Hình ảnh
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className="nav-link"
              id="tab4-tab"
              data-bs-toggle="tab"
              data-bs-target="#tab4"
              type="button"
              role="tab"
              aria-controls="tab4"
              aria-selected="false"
            >
              Điều khoản & quy định
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className="nav-link"
              id="tab5-tab"
              data-bs-toggle="tab"
              data-bs-target="#tab5"
              type="button"
              role="tab"
              aria-controls="tab5"
              aria-selected="false"
            >
              Đánh giá
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className="nav-link" // ĐÃ SỬA: bỏ "active"
              id="tab6-tab"
              data-bs-toggle="tab"
              data-bs-target="#tab6"
              type="button"
              role="tab"
              aria-controls="tab6"
              aria-selected="false"
            >
              Sân con
            </button>
          </li>
        </ul>
        <div className="tab-content mt-3" id="myTabContent">
          {/* TAB 1: THÔNG TIN */}
          <div
            className="tab-pane fade show active"
            id="tab1"
            role="tabpanel"
            aria-labelledby="tab1-tab"
          >
            <div className="info-text">
              {courtDetail.information || "Chưa có thông tin chi tiết về sân."}
            </div>
          </div>

          {/* TAB 2: DỊCH VỤ */}
          <div
            className="tab-pane fade"
            id="tab2"
            role="tabpanel"
            aria-labelledby="tab2-tab"
          >
            {courtDetail.service ? (
              <div className="service-container">
                <ul className="service-list">
                  {courtDetail.service.split("\n").map((item, index) => (
                    <li key={index} className="service-item">
                      {item.trim()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted">Chưa có thông tin dịch vụ.</p>
            )}
          </div>

          {/* TAB 3: HÌNH ẢNH */}
          <div
            className="tab-pane fade"
            id="tab3"
            role="tabpanel"
            aria-labelledby="tab3-tab"
          >
            {(() => {
              const raw = courtDetail.image || "";
              let imgPath = "";
              if (!raw) {
                imgPath = "/TuktukPickelball.png";
              } else if (/^https?:\/\//i.test(raw)) {
                imgPath = raw;
              } else {
                imgPath = raw.replace(/^.*client[\\/]public/, "");
                if (!imgPath.startsWith("/")) imgPath = "/" + imgPath;
              }

              const API_BASE =
                process.env.REACT_APP_API_URL ||
                `${window.location.protocol}//${window.location.hostname}:3001`;

              if (
                imgPath.startsWith("/uploads") ||
                imgPath.match(/server[\\/]uploads/i) ||
                raw.startsWith("uploads/")
              ) {
                imgPath = `${API_BASE}${imgPath}`;
              }

              return (
                <img
                  src={imgPath}
                  alt={courtDetail.courtName || "court image"}
                  className="img-fluid ms-3 mt-2 rounded booking-image"
                  onError={(e) => {
                    e.target.src = "/TuktukPickelball.png";
                  }}
                />
              );
            })()}
          </div>

          {/* TAB 4: ĐIỀU KHOẢN */}
          <div
            className="tab-pane fade"
            id="tab4"
            role="tabpanel"
            aria-labelledby="tab4-tab"
          >
            <div className="terms-text">
              {courtDetail.termsAndConditions
                ? courtDetail.termsAndConditions.split("\n").map((line, i) => (
                    <p key={i} className="mb-2">
                      {line}
                    </p>
                  ))
                : "Chưa có điều khoản & quy định."}
            </div>
          </div>

          {/* TAB 5: ĐÁNH GIÁ */}
          <div
            className="tab-pane fade"
            id="tab5"
            role="tabpanel"
            aria-labelledby="tab5-tab"
          >
            <div className="rating-container">
              <div className="rating-value">{courtDetail.rating || "0.0"}</div>
              <div className="rating-stars">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className="star"
                    style={{
                      color:
                        i < Math.floor(courtDetail.rating || 0)
                          ? "#ffc107"
                          : "#e9ecef",
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <p className="text-muted mt-2">Dựa trên đánh giá người dùng</p>
          </div>

          <div
            className="tab-pane fade"
            id="tab6"
            role="tabpanel"
            aria-labelledby="tab6-tab"
          >
            <div className="field-types-grid p-3">
              {courtFields.length > 0 ? (
                courtFields.map((field) => (
                  <div
                    key={field.id}
                    className="field-card border rounded p-3 mb-3 shadow-sm"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0 text-primary">
                        {field.fieldName}{" "}
                        <small className="text-muted">
                          ({field.fieldType})
                        </small>
                      </h5>
                    </div>

                    <div className="price-list mt-2">
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">Sáng (5h-12h)</span>
                        <strong className="text-success">
                          {formatPrice(field.pricePerMorning)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1 border-bottom">
                        <span className="text-muted">Trưa (12h-18h)</span>
                        <strong className="text-warning">
                          {formatPrice(field.pricePerLunch)}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between py-1">
                        <span className="text-muted">Tối (18h-22h)</span>
                        <strong className="text-danger">
                          {formatPrice(field.pricePerAfternoon)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox fs-1"></i>
                  <p className="mt-2">Chưa có thông tin sân con</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourtDetail;
