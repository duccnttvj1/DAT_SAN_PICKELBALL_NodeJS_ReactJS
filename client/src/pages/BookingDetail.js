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
  const [courtInfo, setCourtInfo] = useState({ CourtFields: [], image: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedFieldName, setSelectedFieldName] = useState("");
  const [dates, setDates] = useState([]);
  const [slotsMap, setSlotsMap] = useState({}); // { '2025-11-07': { '05:00': slotObj, ... }, ... }
  const [timeRows, setTimeRows] = useState([]); // list of time strings
  const [selectedSlots, setSelectedSlots] = useState([]);
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [slotTimers, setSlotTimers] = useState({});

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
      axios
        .get(`http://localhost:3001/courts/byId/${courtId}`)
        .then((res) => {
          // debug log to inspect what the API returns for image
          console.log("GET /courts/byId response:", res.data);

          setCourtInfo({
            courtName: res.data.courtName,
            address: res.data.address,
            // try common image fields from API (image or avatarUrl)
            image: res.data.image || res.data.avatarUrl || "",
            CourtFields: res.data.CourtFields || [],
          });
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [courtId]);

  // prepare 7 dates starting from today
  useEffect(() => {
    const ds = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      ds.push(iso);
    }
    setDates(ds);
  }, []);

  // when a small field is selected, fetch schedules for the 7 dates
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
            // normalize price/amount field coming from server -> use slot.price
            const rawPrice =
              slot.price ?? slot.amount ?? slot.Amount ?? slot.AmountValue;
            const normalizedPrice = rawPrice != null ? Number(rawPrice) : 0;
            // ensure numeric
            slot.price =
              typeof normalizedPrice === "number"
                ? normalizedPrice
                : Number(normalizedPrice) || 0;

            // Ensure state comes from DB; default to 'available' if missing
            slot.state = slot.state ?? "available";

            map[date][slot.startTime] = slot;
            timesSet.add(slot.startTime);
          });
        });
        // build sorted timeRows from earliest to latest
        const times = Array.from(timesSet).sort((a, b) => (a > b ? 1 : -1));
        setSlotsMap(map);
        setTimeRows(times);
      } catch (error) {
        console.error(error);
      }
    };
    fetchForField();
  }, [selectedFieldId, dates, refreshKey]);

  // If navigated back from Payment with a preselectFieldId, set it so BookingDetail shows that field
  const hasShownSuccessAlert = useRef(false); // Thêm dòng này ngoài useEffect

  useEffect(() => {
    if (!location) return;

    const preselectFieldId = location.state?.preselectFieldId;
    const justBookedScheduleIds = location.state?.justBookedScheduleIds;
    const params = new URLSearchParams(location.search);
    const status = params.get("status");

    if (preselectFieldId) {
      if (selectedFieldId && selectedFieldId === preselectFieldId) {
        setRefreshKey((k) => k + 1);
      } else {
        setSelectedFieldId(preselectFieldId);
      }
      setSelectedSlots([]);

      // CHỈ ALERT 1 LẦN
      if (
        justBookedScheduleIds &&
        justBookedScheduleIds.length > 0 &&
        !hasShownSuccessAlert.current
      ) {
        hasShownSuccessAlert.current = true; // Đánh dấu đã hiện
        alert("Thanh toán thành công — khung giờ đã được giữ.");

        // Xóa state để tránh hiện lại
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, courtId, navigate, selectedFieldId]);

  // useEffect(() => {
  //   const updateTimers = () => {
  //     const now = Date.now();

  //     setSlotTimers((prev) => {
  //       const next = { ...prev };
  //       let hasChange = false;

  //       Object.keys(next).forEach((scheduleId) => {
  //         const endTime = next[scheduleId]; // timestamp (ms)
  //         const remainingSeconds = Math.max(
  //           0,
  //           Math.floor((endTime - now) / 1000)
  //         );

  //         if (remainingSeconds <= 0) {
  //           delete next[scheduleId];
  //           hasChange = true;
  //         } else if (next[scheduleId] !== remainingSeconds) {
  //           next[scheduleId] = remainingSeconds; // cập nhật số giây còn lại
  //           hasChange = true;
  //         }
  //       });

  //       return hasChange ? next : prev;
  //     });
  //   };

  //   updateTimers(); // chạy ngay lần đầu
  //   const intervalId = setInterval(updateTimers, 1000); // 1 giây 1 lần

  //   return () => clearInterval(intervalId);
  // }, []);
  // THAY BẰNG ĐOẠN NÀY – HOÀN HẢO, MƯỢT, KHÔNG BAO GIỜ LỖI!
  useEffect(() => {
    const interval = setInterval(() => {
      setSlotTimers((prev) => {
        const next = { ...prev };
        let hasChange = false;

        Object.keys(next).forEach((id) => {
          if (next[id] > 0) {
            next[id] -= 1;
            hasChange = true;
          } else {
            delete next[id];
            hasChange = true;
          }
        });

        return hasChange ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []); // chỉ chạy 1 lần

  // ==================== SOCKET.IO HOÀN HẢO – CHỈ DÁN 1 LẦN DUY NHẤT ====================
  const socketRef = useRef(null);

  useEffect(() => {
    if (!selectedFieldId) return;

    // Ngắt kết nối cũ (nếu có)
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

    // QUAN TRỌNG: GÁN VÀO REF NGAY
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected & joined:", selectedFieldId);
      socket.emit("join-court-field", selectedFieldId);
    });

    // DÙNG socketRef.current ĐỂ LISTENER KHÔNG BỊ MẤT
    socketRef.current.on("slot-locked", ({ scheduleId, userId }) => {
      console.log("Received slot-locked:", scheduleId, "by user:", userId);

      setSlotsMap((prev) => {
        const newMap = JSON.parse(JSON.stringify(prev));
        Object.keys(newMap).forEach((date) => {
          Object.keys(newMap[date]).forEach((time) => {
            const slot = newMap[date][time];
            if (slot?.id === scheduleId) {
              slot.state = "pending";
              slot.lockedBy = userId;
              slot.lockedAt = new Date();
            }
          });
        });
        return newMap;
      });
    });

    socketRef.current.on("slot-unlocked", ({ scheduleId }) => {
      console.log("Received slot-unlocked:", scheduleId);

      setSlotsMap((prev) => {
        const newMap = JSON.parse(JSON.stringify(prev));
        Object.keys(newMap).forEach((date) => {
          Object.keys(newMap[date]).forEach((time) => {
            const slot = newMap[date][time];
            if (slot?.id === scheduleId) {
              slot.state = "available";
              slot.lockedBy = null;
              slot.lockedAt = null;
            }
          });
        });
        return newMap;
      });

      setSlotTimers((prev) => {
        const next = { ...prev };
        delete next[scheduleId];
        return next;
      });

      setSelectedSlots((prev) =>
        prev.filter((s) => s.scheduleId !== scheduleId)
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("slot-locked");
        socketRef.current.off("slot-unlocked");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedFieldId]);
  // ================================================================================

  const handleSlotClick = async (date, startTime) => {
    const slot = slotsMap[date]?.[startTime];
    if (!slot) return;

    const key = `${date}_${startTime}`;
    const isSelected = selectedSlots.some((s) => s.key === key);

    try {
      if (isSelected) {
        // HỦY CHỌN
        await axios.post(
          "/schedule/unlock",
          { scheduleId: slot.id },
          {
            headers: { accessToken: localStorage.getItem("accessToken") },
          }
        );

        setSelectedSlots((prev) => prev.filter((s) => s.key !== key));
        setSlotTimers((prev) => {
          const next = { ...prev };
          delete next[slot.id];
          return next;
        });

        // CẬP NHẬT UI NGAY CHO USER 1 (không chờ socket)
        setSlotsMap((prev) => {
          const newMap = JSON.parse(JSON.stringify(prev));
          if (newMap[date]?.[startTime]) {
            newMap[date][startTime].state = "available";
            newMap[date][startTime].lockedBy = null;
            newMap[date][startTime].lockedAt = null;
          }
          return newMap;
        });
      } else {
        if (slot.state !== "available") {
          alert("Khung giờ đã được đặt hoặc đang được người khác giữ!");
          return;
        }

        const res = await axios.post(
          "http://localhost:3001/schedule/lock",
          { scheduleId: slot.id },
          {
            headers: { accessToken: localStorage.getItem("accessToken") },
          }
        );

        if (res.data.success) {
          // CẬP NHẬT UI NGAY CHO USER 1
          setSlotsMap((prev) => {
            const newMap = JSON.parse(JSON.stringify(prev));
            if (newMap[date]?.[startTime]) {
              newMap[date][startTime].state = "pending";
              newMap[date][startTime].lockedBy = authState.id;
              newMap[date][startTime].lockedAt = new Date();
            }
            return newMap;
          });

          // Bắt đầu countdown
          setSlotTimers((prev) => ({
            ...prev,
            [slot.id]: 300, // chính xác 5 phút
          }));

          // Thêm vào giỏ hàng – ĐÃ SỬA DẤU || THỪA
          setSelectedSlots((prev) => [
            ...prev,
            {
              key,
              date,
              startTime: slot.startTime || startTime,
              endTime: slot.endTime || "??:??",
              price: slot.price || slot.Amount || 0,
              fieldId: selectedFieldId,
              fieldName: selectedFieldName,
              scheduleId: slot.id,
            },
          ]);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Lỗi thao tác";
      if (err.response?.status === 403 && isSelected) {
        alert("Khung giờ đã hết hạn giữ chỗ và được tự động hủy.");
        setSelectedSlots((prev) => prev.filter((s) => s.key !== key));
        setSlotTimers((prev) => {
          const next = { ...prev };
          delete next[slot.id];
          return next;
        });
      } else {
        alert(errorMsg);
        if (err.response?.status === 409) {
          setRefreshKey((k) => k + 1);
        }
      }
    }
  };

  const totalAmount = selectedSlots.reduce(
    (sum, s) => sum + Number(s.price || 0),
    0
  );

  console.log("totalAmount tính được:", totalAmount, typeof totalAmount);

  const handleConfirm = async () => {
    if (selectedSlots.length === 0) {
      alert("Vui lòng chọn ít nhất 1 khung giờ!");
      return;
    }

    if (totalAmount <= 0) {
      alert("Tổng tiền phải lớn hơn 0!");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Tạo temp order
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
          totalAmount,
        },
        {
          headers: { accessToken: localStorage.getItem("accessToken") },
        }
      );

      const orderCode = tempRes.data.orderCode;

      // 2. Tạo link PayOS
      const payRes = await axios.post(
        "http://localhost:3001/payment/create-payment-link",
        { orderCode },
        {
          headers: { accessToken: localStorage.getItem("accessToken") },
        }
      );

      const { checkoutUrl, qrCode } = payRes.data;

      if (!checkoutUrl) {
        throw new Error("Không nhận được link thanh toán từ server");
      }

      // 3. CHUYỂN HƯỚNG NGAY TRÊN CÙNG TAB (mượt nhất, không lỗi)
      alert(
        `Đang chuyển đến trang thanh toán PayOS...\nSố tiền: ${totalAmount.toLocaleString(
          "vi-VN"
        )}đ\nVui lòng hoàn tất trong 15 phút!`
      );
      window.location.href = checkoutUrl;

      // Optional: Log QR nếu có
      if (qrCode) {
        console.log("QR Code (base64):", qrCode);
        // Có thể hiện modal QR ở đây nếu muốn
      }
    } catch (err) {
      console.error("Lỗi thanh toán:", err);
      const msg = err.response?.data?.error || err.message || "Lỗi hệ thống";
      alert("Thanh toán thất bại: " + msg);
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
                Tổng tiền:{" "}
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
