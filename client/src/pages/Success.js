import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Success() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState("");
  const effectCalled = useRef(false); // REF để check effect đã chạy chưa

  useEffect(() => {
    // Nếu effect đã chạy, return ngay
    if (effectCalled.current) return;
    effectCalled.current = true;

    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const orderCode = params.get("orderCode");

    if (!orderCode) {
      setError("Không tìm thấy mã đơn hàng.");
      setIsProcessing(false);
      return;
    }

    if (status !== "PAID") {
      setError("Giao dịch không thành công hoặc bị hủy.");
      setIsProcessing(false);
      return;
    }

    // GỌI API XÁC NHẬN THANH TOÁN
    const confirmPayment = async () => {
      try {
        const res = await axios.post(
          "http://localhost:3001/payment/confirm",
          { orderCode },
          {
            headers: { accessToken: localStorage.getItem("accessToken") },
          }
        );

        const { preselectFieldId, justBookedScheduleIds, courtId } = res.data;

        // CHUYỂN VỀ BOOKING + TRUYỀN STATE
        navigate(`/bookingDetail/${courtId}`, {
          replace: true,
          state: {
            preselectFieldId,
            justBookedScheduleIds,
            refreshTrigger: Date.now(),
          },
        });
      } catch (err) {
        console.error("Xác nhận thanh toán lỗi:", err);
        setError(err.response?.data?.error || "Xác nhận thanh toán thất bại.");
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [location, navigate]);

  if (isProcessing) {
    return (
      <div className="text-center mt-5">
        <h2>Đang xử lý thanh toán...</h2>
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-5 text-danger">
        <h3>Giao dịch lỗi</h3>
        <p>{error}</p>
        <button className="btn btn-warning" onClick={() => navigate("/")}>
          Về trang chủ
        </button>
      </div>
    );
  }

  return null; // Đã redirect
}

export default Success;
