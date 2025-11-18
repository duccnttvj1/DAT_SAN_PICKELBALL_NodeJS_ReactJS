import React, { useState, useEffect } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./ProfileNavbar.css";
import axios from "axios";

function ProfileNavbar() {
  const fileInputRef = React.useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(
    localStorage.getItem("avatarUrl") ||
      "https://cdn-icons-png.flaticon.com/512/149/149071.png"
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await axios.get("http://localhost:3001/users/auth", {
          headers: { accessToken: localStorage.getItem("accessToken") },
        });
        if (res.data.avatar_url) {
          setAvatarUrl(res.data.avatar_url);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUserData();
  }, []);

  const handleCameraClick = () => {
    fileInputRef.current.click();
  };
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ hỗ trợ JPG, JPEG, PNG");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await axios.post(
        "http://localhost:3001/users/update-avatar",
        formData,
        {
          headers: {
            accessToken: localStorage.getItem("accessToken"),
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const newUrl = res.data.avatarUrl;
      setAvatarUrl(newUrl);
      localStorage.setItem("avatarUrl", newUrl);

      // GỌI LẠI useEffect trong Profile.js
      window.dispatchEvent(new Event("avatarUpdated"));

      alert("Cập nhật ảnh đại diện thành công!");
    } catch (err) {
      alert("Lỗi upload: " + (err.response?.data?.error || "Thử lại"));
    }
  };

  return (
    <>
      <div className="cover-photo">
        <div className="cover-overlay"></div>

        <a href="/" className="back-btn text-decoration-none">
          <i className="bi bi-arrow-left"></i>
        </a>

        <button
          type="button"
          className="camera-btn text-decoration-none"
          onClick={handleCameraClick}
        >
          <i className="bi bi-camera"></i>
        </button>
        <input
          type="file"
          accept=".jpg,.jpeg,.png"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <div
          className="avatar"
          style={{ backgroundImage: `url(${avatarUrl})` }}
        ></div>
      </div>
    </>
  );
}

export default ProfileNavbar;
