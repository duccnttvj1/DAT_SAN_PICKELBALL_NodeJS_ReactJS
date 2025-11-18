import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="text-center mt-5">
      <h3>Thanh toán đã bị hủy</h3>
      <p>Đơn hàng của bạn chưa được xác nhận.</p>
      <Button onClick={() => navigate("/booking")} variant="primary">
        Quay lại đặt sân
      </Button>
    </div>
  );
}