import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../helpers/AuthContext";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState("login"); // login | forgot | otp | reset
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { setAuthState } = useContext(AuthContext);

  // === ĐĂNG NHẬP ===
  const login = () => {
    const data = { username, password };
    axios
      .post("http://localhost:3001/users/login", data)
      .then((response) => {
        localStorage.removeItem("avatarUrl");
        if (response.data.error) {
          setError(response.data.error);
        } else {
          localStorage.setItem("accessToken", response.data.token);
          if (response.data.avatar_url) {
            localStorage.setItem("avatarUrl", response.data.avatar_url);
          }
          setAuthState({
            username: response.data.username,
            id: response.data.id,
            status: true,
            role: response.data.role || "user",
            isAuthLoading: false,
          });
          navigate("/");
        }
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Lỗi kết nối server");
      });
  };

  // === QUÊN MẬT KHẨU: Gửi OTP ===
  const sendOtp = () => {
    if (!email.includes("@")) {
      setError("Vui lòng nhập email hợp lệ");
      return;
    }
    console.log("Sending email:", email);
    axios
      .post("http://localhost:3001/users/forgot-password", { email })
      .then((res) => {
        setMessage("Mã OTP đã được gửi đến email của bạn!");
        setError("");
        setStep("otp");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Không tìm thấy email này");
      });
  };

  // === XÁC NHẬN OTP ===
  const verifyOtp = () => {
    axios
      .post("http://localhost:3001/users/verify-otp", { email, otp })
      .then((res) => {
        setMessage("OTP chính xác! Vui lòng nhập mật khẩu mới.");
        setError("");
        setStep("reset");
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Mã OTP không đúng");
      });
  };

  // === ĐỔI MẬT KHẨU ===
  const resetPassword = () => {
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }

    axios
      .post("http://localhost:3001/users/reset-password", {
        email,
        newPassword,
      })
      .then((res) => {
        setMessage("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setError("");
        setTimeout(() => setStep("login"), 2000);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Lỗi hệ thống");
      });
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div
        className="card shadow-lg p-4"
        style={{ maxWidth: "420px", width: "100%" }}
      >
        <h3 className="text-center mb-4 text-primary">
          {step === "login" && "Đăng Nhập"}
          {step === "forgot" && "Quên Mật Khẩu"}
          {step === "otp" && "Xác Nhận OTP"}
          {step === "reset" && "Đặt Lại Mật Khẩu"}
        </h3>

        {/* === LOGIN FORM === */}
        {step === "login" && (
          <>
            <div className="mb-3">
              <label className="form-label">Tên đăng nhập</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn btn-primary w-100 mb-2" onClick={login}>
              Đăng Nhập
            </button>
            <div className="text-center">
              <button
                className="btn btn-link text-decoration-none"
                onClick={() => {
                  setStep("forgot");
                  setError("");
                  setMessage("");
                }}
              >
                Quên mật khẩu?
              </button>
            </div>
          </>
        )}

        {/* === FORGOT PASSWORD === */}
        {step === "forgot" && (
          <>
            <div className="mb-3">
              <label className="form-label">Email của bạn</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nhap@email.com"
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button className="btn btn-primary w-100 mb-2" onClick={sendOtp}>
              Gửi Mã OTP
            </button>
            <button
              className="btn btn-secondary w-100"
              onClick={() => setStep("login")}
            >
              Quay lại đăng nhập
            </button>
          </>
        )}

        {/* === OTP VERIFICATION === */}
        {step === "otp" && (
          <>
            <div className="mb-3">
              <label className="form-label">Nhập mã OTP (6 chữ số)</label>
              <input
                type="text"
                className="form-control text-center"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                maxLength="6"
                style={{ letterSpacing: "8px", fontSize: "1.2rem" }}
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-info">{message}</div>}
            <button className="btn btn-primary w-100 mb-2" onClick={verifyOtp}>
              Xác Nhận OTP
            </button>
            <button className="btn btn-link w-100" onClick={sendOtp}>
              Gửi lại mã
            </button>
          </>
        )}

        {/* === RESET PASSWORD === */}
        {step === "reset" && (
          <>
            <div className="mb-3">
              <label className="form-label">Mật khẩu mới</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Xác nhận mật khẩu</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {message && <div className="alert alert-success">{message}</div>}
            <button
              className="btn btn-success w-100 mb-2"
              onClick={resetPassword}
            >
              Đổi Mật Khẩu
            </button>
            <button
              className="btn btn-secondary w-100"
              onClick={() => setStep("login")}
            >
              Quay lại đăng nhập
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
