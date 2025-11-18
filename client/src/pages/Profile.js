import React, { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../helpers/AuthContext";
import { useNavigate } from "react-router-dom";
import ProfileNavbar from "../components/ProfileNavbar";
import DatePicker from "react-datepicker";
import axios from "axios";
import "react-datepicker/dist/react-datepicker.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { format } from "date-fns";

function Profile() {
  const { authState } = useContext(AuthContext);
  const isAdmin = authState.role === "admin";
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("avatarUrl") ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
  );

  useEffect(() => {
    const handleAvatarUpdate = () => {
      const updatedUrl = localStorage.getItem("avatarUrl");
      if (updatedUrl) {
        setAvatarUrl(updatedUrl);
      }
    };

    // Lắng nghe sự kiện
    window.addEventListener("avatarUpdated", handleAvatarUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
    };
  }, []);

  const [userInfo, setUserInfo] = useState({
    phone: "",
    fullName: "",
    gender: "",
    dateOfBirth: null,
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleDateChange = (date) => {
    setStartDate(date);
    setUserInfo({ ...userInfo, dateOfBirth: date });
    setShowPicker(false);
  };

  const day = startDate
    ? startDate.getDate().toString().padStart(2, "0")
    : "--";
  const month = startDate
    ? (startDate.getMonth() + 1).toString().padStart(2, "0")
    : "--";
  const year = startDate ? startDate.getFullYear() : "----";

  useEffect(() => {
    if (!authState.status && !authState.isAuthLoading) {
      navigate("/login");
    } else {
      axios
        .get("http://localhost:3001/users/auth", {
          headers: {
            accessToken: localStorage.getItem("accessToken"),
          },
        })
        .then((response) => {
          setEmail(response.data.email);
          let adjustedDob = null;
          if (response.data.dateOfBirth) {
            const dateString = response.data.dateOfBirth.split("T")[0];
            adjustedDob = new Date(dateString + "T00:00:00");
          }
          setUserInfo({
            phone: response.data.phone || "",
            fullName: response.data.fullName || "",
            gender: response.data.gender || "",
            dateOfBirth: adjustedDob,
          });
          setStartDate(adjustedDob);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, [authState.status, navigate]);

  const handleSave = async () => {
    try {
      let dataToSend = { ...userInfo };
      if (userInfo.dateOfBirth) {
        dataToSend.dateOfBirth = format(userInfo.dateOfBirth, "yyyy-MM-dd");
      }
      const res = await axios.put(
        "http://localhost:3001/users/profile",
        dataToSend,
        {
          headers: {
            accessToken: localStorage.getItem("accessToken"),
          },
        }
      );
      console.log(res.data.message);
      setUserInfo((prevInfo) => ({
        ...prevInfo,
        dateOfBirth: userInfo.dateOfBirth
          ? new Date(userInfo.dateOfBirth)
          : null,
      }));
      setStartDate(userInfo.dateOfBirth);
      setIsEditing(false);
      alert("Cập nhật thông tin thành công");
    } catch (err) {
      console.error(err);
      alert("Cập nhật thông tin thất bại");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserInfo({ ...userInfo, [name]: value });
  };

  return (
    <div>
      <ProfileNavbar />
      <div className="bg-success d-flex flex-column align-items-center p-4 text-white">
        {authState.role === "admin" && !authState.isAuthLoading && (
          <button
            className="border-0 rounded-1 p-2 mt-1 bg-warning text-white fw-bold ms-auto"
            onClick={() => navigate("/manageUser")}
          >
            Quản lý User
          </button>
        )}

        <label className="mt-5 align-self-start fs-4 mb-2">Email</label>
        <input
          type="email"
          className="w-100 py-3 ps-3 fs-5 border-0 rounded-2"
          placeholder="name@example.com"
          value={email}
          onChange={handleChange}
          readOnly={!isEditing}
        ></input>
        <label className="mt-3 align-self-start fs-4 mb-2">Số điện thoại</label>
        <input
          name="phone"
          type="tel"
          className="w-100 py-3 ps-3 fs-5 border-0 rounded-2"
          placeholder="Nhập số điện thoại"
          value={userInfo.phone}
          onChange={handleChange}
          readOnly={!isEditing}
        ></input>
        <label className="mt-3 align-self-start fs-4 mb-2">Tên đầy đủ</label>
        <input
          name="fullName"
          type="text"
          className="w-100 py-3 ps-3 fs-5 border-0 rounded-2"
          placeholder="Nguyen Van A"
          value={userInfo.fullName}
          onChange={handleChange}
          readOnly={!isEditing}
        ></input>
        <label className="mt-3 align-self-start fs-4 mb-2">
          Chọn giới tính
        </label>
        <select
          className="w-100 py-3 ps-3 pe-3 fs-5 border-0 rounded-2"
          name="gender"
          value={userInfo.gender}
          onChange={handleChange}
          disabled={!isEditing}
          style={{
            appearance: "none",
            backgroundPosition: "right 1.5rem center",
            backgroundImage:
              'url(\'data:image/svg+xml;utf8,<svg fill="%23000" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg"><path d="M4 6l4 4 4-4z"/></svg>\')',
            backgroundRepeat: "no-repeat",
            WebkitAppearance: "none",
            MozAppearance: "none",
            backgroundSize: "24px",
          }}
        >
          <option value="" disabled>
            -- Chọn giới tính --
          </option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>

        <div
          className="row w-100 g-0 mt-3"
          onClick={() => {
            if (isEditing) {
              setShowPicker(true);
            }
          }}
        >
          <div className="col-4">
            <div className="d-flex flex-column">
              <label className="fs-4">Ngày</label>
              <input
                className="mt-2 py-3 rounded-2 border-0 ps-3 fs-5"
                readOnly
                value={day}
              ></input>
            </div>
          </div>
          <div className="col-4">
            <div className="d-flex flex-column ms-2">
              <label className="fs-4">Tháng</label>
              <input
                className="mt-2 py-3 rounded-2 border-0 ps-3 fs-5"
                readOnly
                value={month}
              ></input>
            </div>
          </div>
          <div className="col-4">
            <div className="d-flex flex-column ms-3">
              <label className="fs-4">Năm</label>
              <input
                className="mt-2 py-3 rounded-2 border-0 ps-3 fs-5"
                readOnly
                value={year}
              ></input>
            </div>
          </div>
        </div>
        {showPicker && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
            onClick={() => setShowPicker(false)}
          >
            <div
              className="bg-white p-4 rounded-3 shadow"
              onClick={(e) => e.stopPropagation()} // tránh đóng khi bấm trong dialog
            >
              <h4 className="mb-3 text-center">Chọn ngày sinh</h4>
              <DatePicker
                selected={startDate}
                onChange={handleDateChange}
                inline // hiển thị lịch full
                dateFormat="dd/MM/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
              <div className="text-center mt-3">
                <button
                  className="btn btn-success px-4"
                  onClick={() => setShowPicker(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="row w-100 g-0 mt-5">
          <div className="d-flex">
            <div className="col-6 pe-5">
              <button
                type="button"
                className="w-100 py-3 border-0 rounded-2 bg-warning text-white fs-5 fw-bold"
                onClick={() => {
                  setIsEditing(true);
                  alert("Bạn đã có thể chỉnh sửa");
                }}
              >
                CHỈNH SỬA
              </button>
            </div>
            <div className="col-6 ps-5">
              <button
                type="button"
                className="w-100 py-3 border-0 rounded-2 bg-warning text-white fs-5 fw-bold"
                onClick={handleSave}
                disabled={!isEditing}
              >
                LƯU
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
