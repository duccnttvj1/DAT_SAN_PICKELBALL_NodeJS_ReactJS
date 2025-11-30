import React, { useContext, useEffect, useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/BookingDetail.css";
import { io } from "socket.io-client";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../helpers/AuthContext";
import Countdown from "../components/Countdown";

function BookingDetail() {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const { authState } = useContext(AuthContext);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [courtInfo, setCourtInfo] = useState({ CourtFields: [], image: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedFieldName, setSelectedFieldName] = useState("");
  const [dates, setDates] = useState([]);
  const [slotsMap, setSlotsMap] = useState({});
  const [timeRows, setTimeRows] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [slotTimers, setSlotTimers] = useState({});
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState("");
  const hasShownSuccessAlert = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    console.log("useEffect auth - authState:", authState);
    if (!authState.status && !authState.isAuthLoading) {
      navigate("/login");
      return;
    }
    if (authState.status && authState.id) {
      if (fullName && phone) return;

      axios
        .get("http://localhost:3001/users/auth", {
          headers: {
            accessToken: localStorage.getItem("accessToken"),
          },
        })
        .then((res) => {
          const apiFullName = res.data.fullName || "Chưa có tên";
          const apiPhone = res.data.phone || "Chưa có SĐT";

          setFullName(apiFullName);
          setPhone(apiPhone);

          console.log("FULLNAME từ API:", apiFullName);
          console.log("PHONE từ API:", apiPhone);
        })
        .catch((err) => {
          console.log("LỖI /users/auth:", err.response?.data || err);
        });
    }
  }, [authState, navigate]);

  useEffect(() => {
    if (courtId) {
      axios.get(`http://localhost:3001/courts/byId/${courtId}`).then((res) => {
        setCourtInfo({
          courtName: res.data.courtName,
          address: res.data.address,
          image: res.data.image || res.data.avatarUrl || "",
          CourtFields: res.data.CourtFields || [],
        });
      });
    }
  }, [courtId]);

  useEffect(() => {
    const ds = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      ds.push(d.toISOString().split("T")[0]);
    }
    setDates(ds);
  }, []);

  useEffect(() => {
    const fetchForField = async () => {
      if (!selectedFieldId) return;
      try {
        const promises = dates.map((date) =>
          axios.get(`http://localhost:3001/schedule/${selectedFieldId}/${date}`)
        );
        const responses = await Promise.all(promises);
        const map = {};
        const timesSet = new Set();
        responses.forEach((resp, idx) => {
          const date = dates[idx];
          map[date] = {};
          resp.data.forEach((slot) => {
            slot.price = Number(slot.price || slot.amount || 0);
            slot.state = slot.state || "available";
            map[date][slot.startTime] = slot;
            timesSet.add(slot.startTime);
          });
        });
        const times = Array.from(timesSet).sort();
        setSlotsMap(map);
        setTimeRows(times);
      } catch (error) {
        console.error(error);
      }
    };
    fetchForField();
  }, [selectedFieldId, dates, refreshKey]);

  // Socket.io realtime
  useEffect(() => {
    if (!selectedFieldId) return;

    if (socketRef.current) {
      socketRef.current.off("slot-locked");
      socketRef.current.off("slot-unlocked");
      socketRef.current.disconnect();
    }

    const token = localStorage.getItem("accessToken");
    const socket = io("http://localhost:3001", {
      withCredentials: true,
      extraHeaders: { Authorization: `Bearer ${token}` },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-court-field", selectedFieldId);
    });

    socket.on("slot-locked", ({ scheduleId }) => {
      setSlotsMap((prev) => {
        const newMap = JSON.parse(JSON.stringify(prev));
        Object.keys(newMap).forEach((d) => {
          Object.keys(newMap[d]).forEach((t) => {
            if (newMap[d][t]?.id === scheduleId) {
              newMap[d][t].state = "pending";
            }
          });
        });
        return newMap;
      });
    });

    socket.on("slot-unlocked", ({ scheduleId }) => {
      setSlotsMap((prev) => {
        const newMap = JSON.parse(JSON.stringify(prev));
        Object.keys(newMap).forEach((d) => {
          Object.keys(newMap[d]).forEach((t) => {
            if (newMap[d][t]?.id === scheduleId) {
              newMap[d][t].state = "available";
              newMap[d][t].lockedBy = null;
            }
          });
        });
        return newMap;
      });
      setSlotTimers((prev) => {
        const n = { ...prev };
        delete n[scheduleId];
        return n;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedFieldId]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSlotTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          if (next[id] > 0) {
            next[id] -= 1;
            changed = true;
          } else {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedFieldId) {
      setAvailableCoupons([]);
      setSelectedCoupon("");
      return;
    }

    // Lấy courtId từ CourtFields
    const field = courtInfo.CourtFields.find((f) => f.id === selectedFieldId);
    if (!field?.courtId) return;

    axios
      .get(`http://localhost:3001/coupons/by-court/${field.courtId}`, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      })
      .then((res) => {
        setAvailableCoupons(res.data);
        setSelectedCoupon(""); // reset khi đổi sân
      })
      .catch((err) => {
        console.error("Lỗi lấy mã giảm giá:", err);
        setAvailableCoupons([]);
      });
  }, [selectedFieldId, courtInfo.CourtFields]);

  // ==================== HANDLE SLOT CLICK – DÙNG BULK LOCK/UNLOCK ====================
  const handleSlotClick = async (date, startTime) => {
    const slot = slotsMap[date]?.[startTime];
    if (!slot) return;

    const key = `${date}_${startTime}`;
    const isSelected = selectedSlots.some((s) => s.key === key);

    try {
      if (isSelected) {
        // BỎ CHỌN → UNLOCK BULK
        await axios.post(
          "http://localhost:3001/schedule/unlock-bulk",
          { scheduleIds: [slot.id] },
          { headers: { accessToken: localStorage.getItem("accessToken") } }
        );

        setSelectedSlots((prev) => prev.filter((s) => s.key !== key));
        setSlotTimers((prev) => {
          const n = { ...prev };
          delete n[slot.id];
          return n;
        });

        // Update UI ngay
        setSlotsMap((prev) => {
          const n = JSON.parse(JSON.stringify(prev));
          if (n[date]?.[startTime]) {
            n[date][startTime].state = "available";
            n[date][startTime].lockedBy = null;
          }
          return n;
        });
      } else {
        // CHỌN → LOCK BULK
        if (slot.state !== "available") {
          alert("Khung giờ đã bị giữ hoặc đặt rồi!");
          return;
        }

        const res = await axios.post(
          "http://localhost:3001/schedule/lock-bulk",
          { scheduleIds: [slot.id] },
          { headers: { accessToken: localStorage.getItem("accessToken") } }
        );

        if (res.data.success) {
          setSlotsMap((prev) => {
            const n = JSON.parse(JSON.stringify(prev));
            if (n[date]?.[startTime]) {
              n[date][startTime].state = "pending";
              n[date][startTime].lockedBy = authState.id;
            }
            return n;
          });

          setSlotTimers((prev) => ({ ...prev, [slot.id]: 300 }));

          setSelectedSlots((prev) => [
            ...prev,
            {
              key,
              date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              price: slot.price,
              fieldId: selectedFieldId,
              fieldName: selectedFieldName,
              scheduleId: slot.id,
            },
          ]);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Lỗi thao tác slot";
      alert(msg);
      if (err.response?.status === 409) {
        setRefreshKey((k) => k + 1);
      }
    }
  };

  // Tính tổng tiền
  const subtotalAmount = selectedSlots.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );
  const totalAmount = subtotalAmount; // server sẽ tính giảm giá

  // Xác nhận thanh toán
  const handleConfirm = async () => {
    if (selectedSlots.length === 0) return alert("Chọn ít nhất 1 khung giờ!");
    if (subtotalAmount <= 0) return alert("Tổng tiền phải > 0!");

    setIsLoading(true);
    try {
      const tempRes = await axios.post(
        "http://localhost:3001/payment/temp-order",
        {
          scheduleIds: selectedSlots.map((s) => s.scheduleId),
          selectedSlots: selectedSlots.map((s) => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            timeRange: `${s.startTime} - ${s.endTime}`,
            price: s.price,
          })),
          fullName,
          phone,
          note,
          courtFieldId: selectedFieldId,
          totalAmount: subtotalAmount,
          couponId: selectedCoupon ? Number(selectedCoupon) : null,
        },
        { headers: { accessToken: localStorage.getItem("accessToken") } }
      );

      const finalAmount = tempRes.data.finalAmount || subtotalAmount;
      const discountAmount = tempRes.data.discountAmount || 0;

      const { orderCode } = tempRes.data;
      const payRes = await axios.post(
        "http://localhost:3001/payment/create-payment-link",
        { orderCode },
        { headers: { accessToken: localStorage.getItem("accessToken") } }
      );

      if (payRes.data.checkoutUrl) {
        alert(
          `Đã áp dụng mã giảm giá!\nGiảm: ${discountAmount.toLocaleString()}đ\nThanh toán: ${finalAmount.toLocaleString()}đ`
        );
        window.location.href = payRes.data.checkoutUrl;
      }
    } catch (err) {
      alert(err.response?.data?.error || "Thanh toán thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-success">
      <a
        href="/"
        className="back-btn text-decoration-none bg-transparent text-white"
      >
        <i className="bi bi-arrow-left fs-2 mb-2"></i>
      </a>
      <h2 className="text-center text-white pt-3">Đặt lịch ngày trực quan</h2>
      <div className="row d-flex">
        <div className="col-5 d-flex align-items-center">
          {(() => {
            const raw = courtInfo.image || "";
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

            console.log(
              "Resolved court image src:",
              imgPath,
              "(API_BASE=",
              API_BASE,
              ")"
            );

            return (
              <>
                <img
                  src={imgPath}
                  alt={courtInfo.courtName || "court image"}
                  className="img-fluid w-100 ms-3 mt-2 rounded booking-image"
                />
              </>
            );
          })()}
        </div>
        <div className="col-7 ps-2 rounded-2 text-white">
          <div
            className="rounded-2 text-white p-3 mt-2"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              width: "53rem",
              height: "fit-content",
            }}
          >
            <div className="fs-4 text-warning fw-bold">
              <i className="bi bi-map-fill"></i> Thông tin sân
            </div>
            <div className="fs-4">Tên CLB: {courtInfo.courtName} </div>
            <div className="fs-4">Địa chỉ: {courtInfo.address}</div>
          </div>
          <div
            className="rounded-2 text-white p-3 mt-3"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              width: "53rem",
              height: "fit-content",
            }}
          >
            <div className="fs-4 text-warning fw-bold">
              <i className="bi-star-fill"></i> Dịch vụ tiện ích
            </div>
            <div className="fs-4">
              <i class="bi bi-wifi"></i> Wifi
            </div>
            <div className="fs-4">
              <i class="bi bi-car-front"></i> Bãi đỗ xe
            </div>
            <div className="fs-4">
              <span>🍜︎</span> Căn tin
            </div>
            <div className="fs-4">
              <i class="bi bi-cup-straw"></i> Đồ uống
            </div>
            <div className="fs-4">
              <i class="bi bi-person-badge"></i> Huấn luyên viên
            </div>
          </div>
        </div>
      </div>

      {/* --- Interactive booking panel: select small court, view slots + order info --- */}
      <div
        className="mx-3 ps-3 mt-4 rounded-2 text-white p-2 booking-panel"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <div className="fs-4 text-warning fw-bold mb-2">
          <i className="bi bi-ticket"></i> Chọn sân nhỏ
        </div>

        <div className="d-flex gap-2 flex-wrap mb-3">
          {courtInfo.CourtFields && courtInfo.CourtFields.length > 0 ? (
            courtInfo.CourtFields.map((f) => (
              <button
                key={f.id}
                className={`btn ${
                  selectedFieldId === f.id ? "btn-warning" : "btn-outline-light"
                } btn-sm`}
                onClick={() => {
                  setSelectedFieldId(f.id);
                  setSelectedFieldName(f.fieldName);
                  setSelectedSlots([]);
                }}
              >
                {f.fieldName} {f.fieldType ? `(${f.fieldType})` : ""}
              </button>
            ))
          ) : (
            <div className="text-warning">Không có sân nhỏ</div>
          )}
        </div>

        {selectedFieldId ? (
          <div className="d-flex gap-3">
            {/* Left: order info */}
            <div
              className="order-info p-2 bg-dark rounded"
              style={{ minWidth: "320px" }}
            >
              <h5 className="text-warning">Thông tin đặt hàng</h5>
              <div className="mb-2">
                Sân: <strong>{selectedFieldName}</strong>
              </div>
              <div className="mb-2">
                Ngày:{" "}
                <strong>
                  {dates[0]} - {dates[dates.length - 1]}
                </strong>
              </div>
              <div className="mb-2">
                Số khung giờ đã chọn: <strong>{selectedSlots.length}</strong>
              </div>
              <div className="mb-2">
                Tổng tiền (chưa giảm):{" "}
                <strong className="text-white">
                  {subtotalAmount.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              {/* TODO: Khi có phản hồi từ server, hiển thị dòng giảm giá ở đây */}
              {/* <div className="mb-2 text-success">
                Giảm giá: <strong>-{discountAmount.toLocaleString("vi-VN")}đ</strong>
              </div> */}
              <div className="mb-2">
                Tổng thanh toán:{" "}
                <strong className="text-warning">
                  {totalAmount.toLocaleString("vi-VN")}đ
                </strong>
              </div>
              <hr />
              <div style={{ maxHeight: "300px", overflow: "auto" }}>
                {selectedSlots.length === 0 && (
                  <div className="text-muted">Chưa chọn khung giờ nào</div>
                )}
                {selectedSlots.map((s) => (
                  <div key={s.key} className="mb-2">
                    <div>
                      {s.date} • {s.startTime} - {s.endTime}
                    </div>
                    <div>
                      Giá: {Number(s.price || 0).toLocaleString("vi-VN")}đ
                    </div>
                    <button
                      className="btn btn-sm btn-outline-light mt-1"
                      onClick={() => handleSlotClick(s.date, s.startTime)}
                    >
                      Bỏ chọn
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: slots table */}
            <div
              className="slots-table flex-fill p-2 bg-dark rounded text-white"
              style={{ overflowX: "auto" }}
            >
              <table className="table table-sm table-dark mb-0">
                <thead>
                  <tr>
                    <th scope="col">Giờ \ Ngày</th>
                    {dates.map((d) => (
                      <th key={d} scope="col">
                        {new Date(d).toLocaleDateString("vi-VN")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeRows.length === 0 && (
                    <tr>
                      <td colSpan={dates.length + 1} className="text-muted">
                        Không có dữ liệu lịch cho sân này
                      </td>
                    </tr>
                  )}
                  {timeRows.map((t) => (
                    <tr key={t}>
                      <td style={{ whiteSpace: "nowrap" }}>{t}</td>
                      {dates.map((d) => {
                        const slot = slotsMap[d] && slotsMap[d][t];
                        const key = `${d}_${t}`;
                        const isSelected = selectedSlots.some(
                          (s) => s.key === key
                        );
                        return (
                          // Trong bảng slot – sửa phần render <td>
                          <td key={d} className="p-1">
                            {slot ? (
                              <div
                                className={`slot-cell p-2 rounded text-center 
        ${slot.state === "booked" ? "slot-booked" : ""} // Đỏ
        ${slot.state === "pending" ? "slot-pending" : ""} // Vàng cam
        ${slot.state === "available" ? "slot-available" : ""} // Xanh lá
        ${isSelected ? "slot-selected" : ""}`}
                                style={{
                                  cursor:
                                    slot.state === "available"
                                      ? "pointer"
                                      : "not-allowed",
                                }}
                                onClick={() => handleSlotClick(d, t)}
                              >
                                <div className="small">
                                  {slot.price
                                    ? Number(slot.price).toLocaleString(
                                        "vi-VN"
                                      ) + "đ"
                                    : "-"}
                                </div>
                                {slot.state === "pending" &&
                                  slotTimers[slot.id] !== undefined && (
                                    <div className="very-small text-warning">
                                      Còn lại:{" "}
                                      <Countdown
                                        seconds={slotTimers[slot.id]}
                                      />
                                    </div>
                                  )}
                                <div className="very-small text-muted">
                                  {slot.state === "pending"
                                    ? slot.lockedBy === authState.id
                                      ? "Bạn đang giữ"
                                      : "Đang giữ bởi người khác"
                                    : slot.state || "available"}
                                </div>
                              </div>
                            ) : (
                              <div className="text-secondary">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-warning">
            Chọn một sân nhỏ để xem lịch và giá.
          </div>
        )}
      </div>

      <div className="mx-3 mt-4">
        <label
          className="text-white fs-4 pb-2"
          style={{ textTransform: "uppercase", fontWeight: "600" }}
        >
          Tên của bạn
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-100 rounded-2 border-0 py-3 ps-3 fs-5"
        />
      </div>
      <div className="mx-3 mt-4">
        <label
          className="text-white fs-4 pb-2"
          style={{ textTransform: "uppercase", fontWeight: "600" }}
        >
          Số điện thoại
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-100 rounded-2 border-0 py-3 ps-3 fs-5"
        />
      </div>
      <div className="mx-3 mt-4">
        <label
          className="text-white fs-4 pb-2"
          style={{ textTransform: "uppercase", fontWeight: "600" }}
        >
          Ghi chú cho chủ sân
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-100 rounded-2 border-0 py-4 ps-3 fs-5"
          placeholder="Nhập ghi chú"
        />
      </div>
      {/* THAY THẾ HOÀN TOÀN phần ô nhập mã bằng đoạn này */}
      <div className="mx-3 mt-4">
        <label
          className="text-white fs-4 pb-2"
          style={{ textTransform: "uppercase", fontWeight: "600" }}
        >
          Mã khuyến mãi
        </label>

        {availableCoupons.length > 0 ? (
          <select
            className="w-100 rounded-2 border-0 py-4 ps-3 fs-5 form-select"
            value={selectedCoupon}
            onChange={(e) => setSelectedCoupon(e.target.value)}
            style={{ color: selectedCoupon ? "black" : "#888" }} // khi chọn mã → đen, chưa chọn → xám
          >
            {/* OPTION MẶC ĐỊNH – GIỮ NGUYÊN, CÓ THỂ CHỌN LẠI */}
            <option value="">— Không dùng mã giảm giá —</option>

            {availableCoupons.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayText}{" "}
                {c.remainingUsage < Infinity &&
                  `(Còn ${c.remainingUsage} lượt)`}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-100 rounded-2 border-0 py-4 ps-3 fs-5 bg-secondary text-white">
            Không có mã khuyến mãi nào cho sân này
          </div>
        )}

        <p className="text-light mt-2 small">
          {availableCoupons.length > 0
            ? "Chọn mã để được giảm giá ngay!"
            : "Sân này chưa có chương trình khuyến mãi"}
        </p>
      </div>
      <div
        className="mx-3 mt-4 rounded-2 text-white"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <div className="notice-box">
          <i className="bi bi-exclamation-triangle-fill notice-icon"></i>
          <span className="notice-text fs-4">Lưu ý:</span>
        </div>
        <div className="p-2 ms-2 fs-5">
          <ul>
            <li>
              Việc thanh toán được thực hiện trực tiếp giữa bạn và chủ sân.
            </li>
            <li>
              ALOBO đóng vai trò kết nối, hỗ trợ bạn tìm và đặt sân dễ dàng hơn.
            </li>
            <li>
              Mỗi sân có thể có quy định và chính sách riêng, hãy dành chút thời
              gian đọc kỹ để đảm bảo quyền lợi cho bạn nhé!
            </li>
          </ul>
          <p>
            Bằng việc bấm Xác nhận và Thanh toán, bạn xác nhận đã đọc và đồng ý
            với <a href="#">Điều khoản đặt sân</a> và{" "}
            <a href="#">Chính sách hoàn tiền và huỷ lịch.</a>
          </p>
        </div>
      </div>
      <button
        className="w-75 py-3 fs-4 fw-bold text-white border-0 rounded-2 bg-warning mx-auto d-block my-4"
        type="button"
        onClick={handleConfirm}
      >
        XÁC NHẬN & THANH TOÁN ({totalAmount.toLocaleString("vi-VN")}đ)
      </button>
    </div>
  );
}

export default BookingDetail;
