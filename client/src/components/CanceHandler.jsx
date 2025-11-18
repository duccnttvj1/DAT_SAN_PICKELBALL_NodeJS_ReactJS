import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";

function CancelHandler({ children }) {
  const location = useLocation();
  const { courtId } = useParams();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");

    if (status === "CANCELLED" && courtId) {
      alert(
        "Bạn đã hủy thanh toán. Vui lòng chọn lại khung giờ nếu muốn đặt sân."
      );
      // XÓA RÁC NGAY LẬP TỨC
      window.location.replace(`/bookingDetail/${courtId}`);
    }
  }, [location, courtId]);

  return children;
}

export default CancelHandler;
