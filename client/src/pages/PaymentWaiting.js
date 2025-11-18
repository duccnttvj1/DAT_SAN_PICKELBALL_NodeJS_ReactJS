// src/pages/PaymentWaiting.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Countdown from "../components/Countdown";

function PaymentWaiting() {
  const { orderCode } = useParams();
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(5 * 60);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("[PAYMENT WAITING] Load info for orderCode:", orderCode); // DEBUG 1

    axios
      .get(`http://localhost:3001/payment/info/${orderCode}`, {
        headers: {
          accessToken: localStorage.getItem("accessToken"),
        },
      })
      .then((res) => {
        console.log("[PAYMENT WAITING] Payment info received:", res.data); // DEBUG 2
        setPaymentInfo(res.data);
      })
      .catch((err) => {
        console.error(
          "[PAYMENT WAITING] Lỗi load info:",
          err.response?.data || err
        ); // DEBUG 3
        setError("Không tải được thông tin thanh toán. Vui lòng thử lại.");
      });
  }, [orderCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          alert(
            "Đã hết thời gian thanh toán! Các khung giờ đã được giải phóng."
          );
          navigate(`/booking-detail/${courtId}`); // Thay courtId nếu có
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  useEffect(() => {
    const check = setInterval(async () => {
      try {
        const res = await axios.get(
          `http://localhost:3001/payment/status/${orderCode}`
        );
        console.log("[PAYMENT WAITING] Status check:", res.data.status); // DEBUG 4
        if (res.data.status === "PAID") {
          clearInterval(check);
          navigate(`/success?orderCode=${orderCode}`, { replace: true });
        }
      } catch (err) {
        console.error("[PAYMENT WAITING] Lỗi check status:", err); // DEBUG 5
      }
    }, 5000);
    return () => clearInterval(check);
  }, [orderCode, navigate]);

  if (error) return <div className="text-center mt-5 text-danger">{error}</div>;
  if (!paymentInfo)
    return <div className="text-center mt-5">Đang tải thông tin...</div>;

  return (
    <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow" style={{ maxWidth: "500px", width: "100%" }}>
        <div className="card-body text-center p-5">
          <h2 className="mb-4">Vui lòng thanh toán</h2>

          <div className="mb-4">
            {paymentInfo.qrCode ? (
              <img
                src={paymentInfo.qrCode}
                alt="QR PayOS"
                className="img-fluid"
              />
            ) : (
              <p className="text-muted">
                QR không khả dụng. Vui lòng mở trang PayOS.
              </p>
            )}
          </div>

          <div className="mb-4">
            <p>
              Số tiền:{" "}
              <strong className="text-danger fs-4">
                {paymentInfo.amount?.toLocaleString("vi-VN")}₫
              </strong>
            </p>
            <p>
              Nội dung chuyển khoản: <code>{orderCode}</code>
            </p>
          </div>

          <div className="alert alert-warning">
            Thời gian còn lại: <Countdown seconds={seconds} />
          </div>

          <button
            className="btn btn-success btn-lg"
            onClick={() => (window.location.href = paymentInfo.checkoutUrl)}
          >
            Mở trang PayOS (nếu QR không hiện)
          </button>

          <div className="mt-4 text-muted small">
            Hệ thống sẽ tự xác nhận sau khi thanh toán.
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentWaiting;
