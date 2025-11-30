// src/pages/admin/BookingsManagement.jsx
import React, { useState, useEffect, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/BookingDetail.css";
import axios from "axios";
import { AuthContext } from "../helpers/AuthContext";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function BookingsManagement() {
  const { authState } = useContext(AuthContext);
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTimeRange, setFilterTimeRange] = useState(""); // LỌC THEO GIỜ
  const [selectedFieldId, setSelectedFieldId] = useState("all"); // Lọc theo sân nhỏ
  const [courtFields, setCourtFields] = useState([]);
  const [availableTimeRanges, setAvailableTimeRanges] = useState([]);
  const [editBooking, setEditBooking] = useState(null);

  // Kiểm tra quyền admin
  useEffect(() => {
    if (
      !authState.status ||
      (authState.role !== "admin" && authState.role !== "owner")
    ) {
      navigate("/login");
    }
  }, [authState, navigate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set("date", filterDate);
      if (filterStatus) params.set("status", filterStatus);
      if (filterTimeRange) params.set("timeRange", filterTimeRange);
      if (selectedFieldId && selectedFieldId !== "all")
        params.set("courtFieldId", selectedFieldId);

      const res = await axios.get(
        `http://localhost:3001/booking-details${
          params.toString() ? "?" + params.toString() : ""
        }`,
        { headers: { accessToken: localStorage.getItem("accessToken") } }
      );

      setBookings(res.data);

      // Lấy danh sách sân nhỏ để hiển thị trong filter
      const uniqueFields = [
        ...new Set(res.data.map((b) => b.courtFieldId)),
      ].map((id) => {
        const b = res.data.find((x) => x.courtFieldId === id);
        return {
          id,
          name: `${b.CourtField?.Court?.courtName || "Sân"} - ${
            b.CourtField?.fieldName || "Không tên"
          }`,
        };
      });
      setCourtFields(uniqueFields);
    } catch (err) {
      alert("Lỗi tải dữ liệu: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterDate, filterStatus, filterTimeRange, selectedFieldId]);

  // Trong fetchBookings() – sau khi lấy bookings xong, tự động sinh danh sách khung giờ có sẵn
  useEffect(() => {
    if (bookings.length > 0) {
      const uniqueTimes = [...new Set(bookings.map((b) => b.timeRange))].sort();
      setAvailableTimeRanges(uniqueTimes);
    } else {
      setAvailableTimeRanges([]);
    }
  }, [bookings]);

  // === BIỂU ĐỒ CỘT: SỐ LƯỢT ĐẶT THEO KHUNG GIỜ ===
  const chartData = () => {
    const timeCount = {};
    bookings.forEach((b) => {
      const time = b.timeRange;
      timeCount[time] = (timeCount[time] || 0) + 1;
    });

    const labels = Object.keys(timeCount).sort();
    const data = labels.map((t) => timeCount[t]);

    return {
      labels,
      datasets: [
        {
          label: "Số lượt đặt",
          data,
          backgroundColor: "rgba(255, 193, 7, 0.8)",
          borderColor: "#ffc107",
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top", labels: { color: "#fff" } },
      title: {
        display: true,
        text: "Thống kê lượt đặt theo khung giờ",
        color: "#fff",
        font: { size: 18 },
      },
    },
    scales: {
      x: { ticks: { color: "#fff" } },
      y: { ticks: { color: "#fff", beginAtZero: true } },
    },
  };

  // 1. HIỂN THỊ TRẠNG THÁI ĐẸP (SUCCESS, CANCELLED, PENDING...)
  const getStatusBadge = (status) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="badge bg-success fs-6">
            <i className="bi bi-check-circle me-1"></i>
            Đã đặt
          </span>
        );
      case "CANCELLED":
        return (
          <span className="badge bg-danger fs-6">
            <i className="bi bi-x-circle me-1"></i>
            Đã hủy
          </span>
        );
      case "PENDING":
        return (
          <span className="badge bg-warning text-dark fs-6">
            <i className="bi bi-hourglass-split me-1"></i>
            Chờ thanh toán
          </span>
        );
      default:
        return (
          <span className="badge bg-secondary fs-6">
            {status || "Không xác định"}
          </span>
        );
    }
  };

  // 2. HỦY LỊCH – CÓ XÁC NHẬN + TỰ ĐỘNG CẬP NHẬT DANH SÁCH
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn HỦY lịch đặt sân này không?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3001/booking-details/${id}`, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });

      alert("Hủy lịch thành công!");
      // Tự động reload danh sách (không cần reload cả trang)
      fetchBookings();
    } catch (err) {
      const msg = err.response?.data?.error || "Lỗi khi hủy lịch";
      alert("Hủy thất bại: " + msg);
    }
  };

  const openEditModal = (booking) => {
    setEditBooking(booking);
  };

  return (
    <div
      className="min-vh-100"
      style={{ background: "#121212", color: "#fff" }}
    >
      <div className="bg-dark py-4 mb-4 shadow">
        <div className="container">
          <h2 className="mb-0 text-warning fw-bold">
            QUẢN LÝ ĐẶT SÂN & THỐNG KÊ
          </h2>
        </div>
      </div>

      <div className="container">
        {/* BỘ LỌC MẠNH MẼ */}
        <div className="row g-3 mb-4 align-items-end">
          <div className="col-md-3">
            <label className="form-label text-white">Ngày</label>
            <input
              type="date"
              className="form-control"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label text-white">Khung giờ</label>
            <select
              className="form-select"
              value={filterTimeRange}
              onChange={(e) => setFilterTimeRange(e.target.value)}
            >
              <option value="">Tất cả khung giờ</option>
              {availableTimeRanges.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label text-white">Trạng thái</label>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="SUCCESS">Đã đặt</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label text-white">Sân nhỏ</label>
            <select
              className="form-select"
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
            >
              <option value="all">Tất cả</option>
              {courtFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-warning w-100" onClick={fetchBookings}>
              <i className="bi bi-search"></i> Tìm kiếm
            </button>
          </div>
        </div>

        {/* BIỂU ĐỒ CỘT */}
        <div className="card bg-dark border-secondary mb-4">
          <div className="card-body">
            <Bar data={chartData()} options={chartOptions} />
          </div>
        </div>

        {/* DANH SÁCH ĐẶT SÂN */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-inbox display-1"></i>
            <p>Chưa có lịch đặt nào</p>
          </div>
        ) : (
          <div className="row g-3">
            {bookings.map((b) => (
              <div key={b.id} className="col-lg-6">
                <div className="card bg-dark text-white border-secondary h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="card-title mb-0 text-warning">
                        {dayjs(b.date).format("DD/MM/YYYY")} • {b.timeRange}
                      </h5>
                      {getStatusBadge(b.status)}
                    </div>
                    <hr className="border-secondary" />
                    <div className="small">
                      <strong>Sân:</strong> {b.CourtField?.Court?.courtName} -{" "}
                      {b.CourtField?.fieldName}
                      <br />
                      <strong>Khách:</strong> {b.User?.fullName} •{" "}
                      {b.User?.phone}
                      {b.note && (
                        <>
                          <br />
                          <strong>Ghi chú:</strong>{" "}
                          <span className="text-info">{b.note}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-3 d-flex gap-2">
                      <button
                        className="btn btn-outline-primary btn-sm flex-fill"
                        onClick={() => openEditModal(b)}
                      >
                        Sửa
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm flex-fill"
                        onClick={() => handleDelete(b.id)}
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {editBooking && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.8)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-warning">
                  <i className="bi bi-pencil-square me-2"></i>
                  Sửa lịch đặt sân
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditBooking(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Ngày</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editBooking.date || ""}
                    onChange={(e) =>
                      setEditBooking({ ...editBooking, date: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Khung giờ</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editBooking.timeRange || ""}
                    onChange={(e) =>
                      setEditBooking({
                        ...editBooking,
                        timeRange: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Ghi chú</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editBooking.note || ""}
                    onChange={(e) =>
                      setEditBooking({ ...editBooking, note: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Trạng thái</label>
                  <select
                    className="form-select"
                    value={editBooking.status || "SUCCESS"}
                    onChange={(e) =>
                      setEditBooking({ ...editBooking, status: e.target.value })
                    }
                  >
                    <option value="SUCCESS">Đã đặt</option>
                    <option value="CANCELLED">Đã hủy</option>
                    <option value="PENDING">Chờ thanh toán</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditBooking(null)}
                >
                  Hủy
                </button>
                <button
                  className="btn btn-warning"
                  onClick={async () => {
                    if (!editBooking.date || !editBooking.timeRange) {
                      alert("Vui lòng nhập đầy đủ ngày và khung giờ!");
                      return;
                    }

                    try {
                      const res = await axios.patch(
                        `http://localhost:3001/booking-details/${editBooking.id}/admin-edit`,
                        {
                          date: editBooking.date,
                          timeRange: editBooking.timeRange,
                          note: editBooking.note,
                          status: editBooking.status,
                        },
                        {
                          headers: {
                            accessToken: localStorage.getItem("accessToken"),
                          },
                        }
                      );
                      console.log("Đang gửi sửa:", {
                        date: editBooking.date,
                        timeRange: editBooking.timeRange,
                      });
                      alert(res.data.message || "Cập nhật thành công!");
                      setEditBooking(null);
                      fetchBookings();
                    } catch (err) {
                      alert(err.response?.data?.error || "Cập nhật thất bại!");
                    }
                  }}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingsManagement;
