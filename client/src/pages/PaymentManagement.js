// src/pages/admin/PaymentManagement.jsx
import React, { useState, useEffect, useContext } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/BookingDetail.css";
import axios from "axios";
import { AuthContext } from "../helpers/AuthContext";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function PaymentManagement() {
  const { authState } = useContext(AuthContext);
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authState.status || authState.role !== "admin") {
      navigate("/login");
      return;
    }

    const fetchAllPayments = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          "http://localhost:3001/api/payments/admin/all",
          {
            headers: { accessToken: localStorage.getItem("accessToken") },
          }
        );
        setPayments(res.data || []);
      } catch (err) {
        alert("Lỗi tải dữ liệu thanh toán");
      } finally {
        setLoading(false);
      }
    };

    fetchAllPayments();
  }, [authState, navigate]);

  // TÍNH DOANH THU CHÍNH XÁC 100%
  const totalRevenue = payments
    .filter((p) => p.state === "completed")
    .reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);

  const totalRefund = payments
    .filter((p) => p.state === "refunded")
    .reduce((sum, p) => sum + parseFloat(p.totalAmount || 0), 0);

  // BIỂU ĐỒ TRÒN
  const pieData = {
    labels: ["Thành công", "Đang xử lý", "Thất bại", "Hoàn tiền", "Hủy"],
    datasets: [
      {
        data: [
          payments.filter((p) => p.state === "completed").length,
          payments.filter((p) => p.state === "pending").length,
          payments.filter((p) => p.state === "failed").length,
          payments.filter((p) => p.state === "refunded").length,
          payments.filter((p) => p.state === "cancelled").length,
        ],
        backgroundColor: [
          "#28a745",
          "#ffc107",
          "#dc3545",
          "#6c757d",
          "#343a40",
        ],
      },
    ],
  };

  // BIỂU ĐỒ DOANH THU 30 NGÀY
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return dayjs(d).format("DD/MM");
  });

  const revenueByDay = last30Days.map((date) => {
    const dayPayments = payments.filter(
      (p) =>
        p.state === "completed" && dayjs(p.paymentDate).format("DD/MM") === date
    );
    return dayPayments.reduce(
      (sum, p) => sum + parseFloat(p.totalAmount || 0),
      0
    );
  });

  const barData = {
    labels: last30Days,
    datasets: [
      {
        label: "Doanh thu (đ)",
        data: revenueByDay,
        backgroundColor: "rgba(255, 193, 7, 0.8)",
        borderColor: "#ffc107",
      },
    ],
  };

  const getStateBadge = (state) => {
    const map = {
      completed: "success",
      pending: "warning",
      failed: "danger",
      refunded: "secondary",
      cancelled: "dark",
    };
    return (
      <span className={`badge bg-${map[state] || "info"}`}>
        {state === "completed"
          ? "Thành công"
          : state === "pending"
          ? "Đang xử lý"
          : state}
      </span>
    );
  };

  return (
    <div
      className="min-vh-100"
      style={{ background: "#121212", color: "#fff" }}
    >
      <div className="bg-dark py-4 mb-4 shadow">
        <div className="container">
          <h2 className="mb-0 text-warning fw-bold">
            QUẢN LÝ THANH TOÁN & DOANH THU
          </h2>
        </div>
      </div>

      <div className="container">
        {/* TỔNG QUAN */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h5>TỔNG DOANH THU</h5>
                <h2>{totalRevenue.toLocaleString("vi-VN")}đ</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-danger text-white">
              <div className="card-body">
                <h5>ĐÃ HOÀN TIỀN</h5>
                <h2>{totalRefund.toLocaleString("vi-VN")}đ</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-warning text-dark">
              <div className="card-body">
                <h5>TỔNG GIAO DỊCH</h5>
                <h2>{payments.length} đơn</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="card bg-dark border-secondary">
              <div className="card-body">
                <h5 className="text-center text-warning mb-3">
                  Cơ cấu thanh toán
                </h5>
                <Pie data={pieData} />
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card bg-dark border-secondary">
              <div className="card-body">
                <h5 className="text-center text-warning mb-3">
                  Doanh thu 30 ngày
                </h5>
                <Bar data={barData} />
              </div>
            </div>
          </div>
        </div>

        {/* BẢNG CHI TIẾT */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-warning" />
          </div>
        ) : (
          <div className="card bg-dark border-secondary">
            <div className="card-body">
              <h5 className="text-warning mb-3">Chi tiết giao dịch</h5>
              <div className="table-responsive">
                <table className="table table-dark table-hover">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Số tiền</th>
                      <th>Ngày thanh toán</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <code>{p.orderCode || p.id}</code>
                        </td>
                        <td>{p.User?.fullName || "Khách lẻ"}</td>
                        <td className="text-warning fw-bold">
                          {parseFloat(p.totalAmount).toLocaleString("vi-VN")}đ
                        </td>
                        <td>
                          {p.state === "completed" ? (
                            <span className="text-success">
                              {dayjs(p.paymentDate).format("DD/MM HH:mm")}
                            </span>
                          ) : p.state === "cancelled" ? (
                            <span className="text-danger">
                              {p.cancelledAt
                                ? dayjs(p.cancelledAt).format("DD/MM HH:mm")
                                : "-"}{" "}
                              (Đã hủy)
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{getStateBadge(p.state)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentManagement;
