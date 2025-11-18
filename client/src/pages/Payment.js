import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import "../styles/Payment.css";
import { QRCodeCanvas as QRCode } from "qrcode.react";

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    paymentUrl,
    selectedFieldName,
    selectedSlots = [],
    totalAmount,
    note,
    dates,
    fullName,
    phone,
    scheduleIds = [],
  } = location.state || {};
  const [timeLeft, setTimeLeft] = useState(300);
  const [selectedFile, setSelectedFile] = useState(null);
  const [countdown, setCountdown] = useState("05:00");
  const [isConfirming, setIsConfirming] = useState(false);

  const uniqueDates = [...new Set(selectedSlots.map((s) => s.date))];

  // Mock data - replace with actual data from your booking
  const bankInfo = {
    accountName: "NGUYEN MINH DUC",
    accountNumber: "19070215466018",
    bank: "Teckcombank",
  };

  const timeRange = selectedSlots.map((slot) => ({
    date: slot.date,
    start: slot.startTime,
    end: slot.endTime,
  }));

  const bookingInfo = {
    fieldName: selectedFieldName,
    name: fullName,
    phone: phone,
    date: uniqueDates,
    time: timeRange,
    total: totalAmount,
    deposit: totalAmount,
    note: note,
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });

      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      setCountdown(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
          2,
          "0"
        )}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Handle timeout: when countdown reaches 0, show alert and redirect to home
  useEffect(() => {
    if (timeLeft === 0) {
      alert(
        "Đơn đặt của bạn đã hết hạn và bị hủy. Vui lòng thực hiện đặt sân lại."
      );
      navigate("/");
    }
  }, [timeLeft, navigate]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Optional: Add a visual feedback that text was copied
    alert("Đã sao chép!");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const { courtId } = useParams();

  const handleConfirm = async () => {
    if (!selectedFile) {
      alert("Vui lòng tải lên ảnh xác nhận thanh toán!");
      return;
    }

    try {
      setIsConfirming(true);

      // Book all selected slots in the database now that payment is confirmed
      // Prefer scheduleIds from navigation state, otherwise extract from selectedSlots
      const idsToBook =
        Array.isArray(scheduleIds) && scheduleIds.length
          ? scheduleIds
          : selectedSlots.map((s) => s.scheduleId).filter(Boolean);

      if (idsToBook.length > 0) {
        await axios.post(
          "http://localhost:3001/schedule/booking",
          { scheduleIds: idsToBook },
          { headers: { accessToken: localStorage.getItem("accessToken") } }
        );
      }

      // Optionally upload the payment proof to your backend here (not implemented)

      // After successful booking, navigate back to booking detail and pre-select the small field
      const preselectFieldId =
        (selectedSlots[0] && selectedSlots[0].fieldId) || null;
      navigate(`/bookingDetail/${courtId}`, {
        state: {
          preselectFieldId,
          justBookedScheduleIds: idsToBook,
        },
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="d-flex row mt-2">
      <div className="payment-container col-8">
        <div className="bank-info">
          <div className="bank-info-header d-flex w-100 rounded-2 p-2 pe-3 pt-3">
            <div className="account-details ms-2 mt-1">
              <div className="detail-row fw-bold" style={{ fontSize: "18px" }}>
                1. Tài khoản ngân hàng
              </div>
              <div className="detail-row">
                <span>Tên tài khoản:</span>
                <strong>{bankInfo.accountName}</strong>
                <button
                  className="copy-button"
                  onClick={() => handleCopy(bankInfo.accountName)}
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
              <div className="detail-row">
                <span>Số tài khoản:</span>
                <strong>{bankInfo.accountNumber}</strong>
                <button
                  className="copy-button"
                  onClick={() => handleCopy(bankInfo.accountNumber)}
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
              <div className="detail-row">
                <span>Ngân hàng:</span>
                <strong>{bankInfo.bank}</strong>
              </div>
            </div>
            <div className="qr-codes">
              {paymentUrl ? (
                <img
                  src={paymentUrl} // Dùng trực tiếp URL hình ảnh từ API VietQR or other provider
                  alt="QR Code"
                  style={{ width: "150px", height: "150px" }} // Tăng kích thước dễ quét hơn
                />
              ) : (
                <div>Đang tải hoặc không tìm thấy mã QR...</div>
              )}

              <form
                action="http://localhost:3001/create-payment-link"
                method="POST"
                target="_blank"
                style={{ marginTop: 8 }}
              >
                <button type="submit" className="btn btn-sm btn-outline-light">
                  Thanh toán bằng PayOS
                </button>
              </form>
            </div>
          </div>
        </div>
        <div
          className="warning-message text-white d-flex align-items-center"
          style={{ backgroundColor: "#2ecc71" }}
        >
          <i className="bi bi-exclamation-triangle-fill text-warning fw-bold fs-4"></i>
          <div className="flex-grow-1 text-center">
            Vui lòng chuyển khoản{" "}
            <span className="text-warning fw-bold">
              {bookingInfo.deposit.toLocaleString()} đ
            </span>{" "}
            và gửi ảnh vào ô bên dưới để hoàn tất đặt lịch!
          </div>
        </div>
        <div className="text-center fw-bold fs-6">
          Sau khi gửi ảnh, vui lòng kiểm tra trạng thái lịch đặt tại tab "Tài
          khoản" khi khi chủ sân xác nhận đơn.
        </div>
        <div className="text-center mt-4">
          Đơn của bạn còn được giữ chỗ trong
        </div>
        <div className="timer">{countdown}</div>

        <div
          className="upload-section"
          onClick={() => document.getElementById("file-upload").click()}
        >
          <input
            type="file"
            id="file-upload"
            hidden
            accept="image/*"
            onChange={handleFileUpload}
          />
          {selectedFile ? (
            <div>Đã chọn: {selectedFile.name}</div>
          ) : (
            <div>
              <i className="bi bi-cloud-upload"></i>
              <div>Nhấn vào để tải hình thanh toán</div>
              <div className="text-muted">
                (hoặc đối tượng được ưu đãi khác)
              </div>
            </div>
          )}
        </div>
        <button className="confirm-button" onClick={handleConfirm}>
          XÁC NHẬN ĐẶT
        </button>
      </div>
      <div
        className="orderInfo col-4 bg-light p-2 mt-2 ps-3 rounded-2 ms-3"
        style={{ display: "inline-block", backgroundSize: "cover" }}
      >
        <h3>Thông tin lịch đặt</h3>
        <div className="booking-info">
          <div className="info-item">
            <i className="bi bi-person"></i>
            <span>Tên: {bookingInfo.name}</span>
          </div>
          <div className="info-item">
            <i className="bi bi-telephone"></i>
            <span>SĐT: {bookingInfo.phone}</span>
          </div>
          <div className="info-item">
            <i className="bi bi-hash"></i>
            <span>Mã đơn: 1</span>
          </div>
          <div className="info-item">
            <i className="bi bi-trophy"></i>
            <span>Đặt sân: {bookingInfo.fieldName}</span>
          </div>
          <div className="info-item">
            <i className="bi bi-calendar"></i>
            <span>Ngày đặt: {bookingInfo.date.join(", ")}</span>
          </div>
          {bookingInfo.time.length === 1 ? (
            <div className="info-item">
              <i className="bi bi-clock"></i>
              <span>
                Khung giờ: {bookingInfo.time[0].start} →{" "}
                {bookingInfo.time[0].end}
              </span>
            </div>
          ) : (
            <div className="mb-2">
              <div className="info-item mb-0">
                <i className="bi bi-clock"></i>
                <span>Khung giờ:</span>
              </div>

              {bookingInfo.time.map((t, index) => (
                <div className="ms-4 d-flex align-items-center" key={index}>
                  <i className="bi bi-dot"></i>
                  <span>
                    {t.start} → {t.end}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="info-item">
            <i class="bi bi-journal"></i>
            <span>Notes: {bookingInfo.note}</span>
          </div>

          <div className="info-item">
            <i className="bi bi-cash"></i>
            <span>Tổng đơn: {bookingInfo.total.toLocaleString()} đ</span>
          </div>
          <div className="info-item">
            <i class="bi bi-currency-exchange"></i>
            <span>Tiền phải trả: {bookingInfo.deposit.toLocaleString()} đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payment;
