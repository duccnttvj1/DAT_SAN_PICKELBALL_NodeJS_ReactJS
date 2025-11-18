import React from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../App.css";

function AppNavbar({ authState, logout }) {
  const userAvatar =
    localStorage.getItem("avatarUrl") ||
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <div className="navbar bg-primary d-flex justify-content-between align-items-center px-3 py-2">
      {/* Left: Menu */}
      <div className="d-flex align-items-center">
        {!authState.status ? (
          <>
            <Link
              to="/login"
              className="nav-link-hover text-white mx-2 text-decoration-none fw-medium"
            >
              Login
            </Link>
            <Link
              to="/registration"
              className="nav-link-hover text-white mx-2 text-decoration-none fw-medium"
            >
              Registration
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/"
              className="nav-link-hover text-white ms-3 me-2 text-decoration-none fw-medium"
            >
              Home
            </Link>
            <Link
              to="/chatbot"
              className="nav-link-hover text-white ms-3 me-2 text-decoration-none fw-medium"
            >
              Chat bot
            </Link>
            {authState.role === "admin" && (
              <>
                <Link
                  to="/manageCourt"
                  className="nav-link-hover text-white mx-2 text-decoration-none fw-medium"
                >
                  Quản lý sân
                </Link>
                <Link
                  to="/confirmPayments"
                  className="nav-link-hover text-white mx-2 text-decoration-none fw-medium"
                >
                  Xác nhận thanh toán
                </Link>
              </>
            )}
          </>
        )}
      </div>

      {/* Right: Avatar + Username + Logout */}
      <div className="d-flex align-items-center">
        {authState.status && (
          <>
            {/* Avatar + Username với hover */}
            <Link
              to="/profile"
              className="d-flex align-items-center text-decoration-none me-3 profile-hover"
            >
              <div
                className="rounded-circle overflow-hidden border border-2 border-white me-2 shadow-sm avatar-hover"
                style={{
                  width: "38px",
                  height: "38px",
                  backgroundImage: `url(${userAvatar})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              ></div>
              <span
                className="text-white fw-semibold username-hover"
                style={{ fontSize: "18px" }}
              >
                {authState.username}
              </span>
            </Link>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="btn btn-outline-light btn-sm rounded-pill px-3 logout-hover"
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default AppNavbar;
