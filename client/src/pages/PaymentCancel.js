// src/pages/PaymentCancel.jsx
import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function PaymentCancel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState("");
  const effectCalled = useRef(false);

  useEffect(() => {
    if (effectCalled.current) return;
    effectCalled.current = true;

    const params = new URLSearchParams(location.search);
    const orderCode = params.get("orderCode");

    if (!orderCode) {
      setError("Không tìm thấy mã đơn hàng.");
      setIsProcessing(false);
      return;
    }

    // GỌI API ĐỂ HỦY ĐƠN & MỞ LẠI SLOT
    const cancelPayment = async () => {
      try {
        const res = await axios.post(
          "http://localhost:3001/api/payments/cancel",
          { orderCode },
          {
            headers: { accessToken: localStorage.getItem("accessToken") },
          }
        );

        // Lấy courtId từ response để quay về đúng sân
        const { courtId } = res.data;

        // Quay về trang đặt sân + refresh nhẹ
        navigate(`/bookingDetail/${courtId}`, {
          replace: true,
          state: { refreshTrigger: Date.now() },
        });
      } catch (err) {
        console.error("Hủy thanh toán lỗi:", err);
        setError(err.response?.data?.error || "Hủy thanh toán thất bại.");
        setIsProcessing(false);
      }
    };

    cancelPayment();
  }, [location, navigate]);

  // Đang xử lý
  if (isProcessing) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-dark text-white">
        <div className="spinner-border text-warning mb-4" style={{ width: "3rem", height: "3rem" }} />
        <h3>Đang hủy đơn hàng và mở lại khung giờ...</h3>
        <p>Vui lòng chờ giây lát</p>
      </div>
    );
  }

  // Có lỗi
  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-dark text-white">
        <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: "4rem" }}></i>
        <h3 className="mt-4 text-danger">Hủy thanh toán thất bại</h3>
        <p>{error}</p>
        <button className="btn btn-warning mt-3" onClick={() => navigate("/")}>
          Về trang chủ
        </button>
      </div>
    );
  }

  // Đã xử lý xong → đã redirect → không render gì
  return null;
}

export default PaymentCancel;