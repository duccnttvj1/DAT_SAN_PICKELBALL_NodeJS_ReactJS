import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  matchPath,
} from "react-router-dom";
import axios from "axios";
import { AuthContext } from "./helpers/AuthContext";
import Registration from "./pages/Registration";
import Home from "./pages/Home";
import "bootstrap/dist/css/bootstrap.min.css";
import Login from "./pages/Login";
import CourtDetail from "./pages/CourtDetail";
import ManageUser from "./pages/ManageUser";
import Profile from "./pages/Profile";
import AppNavbar from "./components/AppNavbar";
import BookingDetail from "./pages/BookingDetail";
import Payment from "./pages/Payment";
import ManageCourts from "./pages/ManageCourts";
import SuccessPage from "./pages/Success";
import PaymentCancel from "./pages/PaymentCancel";
import MapPage from "./pages/MapPage";
import Chatbot from "./pages/Chatbot";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";
import CancelHandler from "./components/CanceHandler";
import PaymentWaiting from "./pages/PaymentWaiting";
import ManageCoupons from "./pages/ManageCoupons";
import BookingsManagement from "./pages/BookingsManagement";
import PaymentManagement from "./pages/PaymentManagement";

function App() {
  const [authState, setAuthState] = useState({
    username: "",
    id: 0,
    status: false,
    isAuthLoading: true,
  });

  useEffect(() => {
    axios
      .get("http://localhost:3001/users/auth", {
        headers: {
          accessToken: localStorage.getItem("accessToken"),
        },
      })
      .then((response) => {
        if (response.data.error) {
          setAuthState({ ...authState, status: false });
        } else {
          setAuthState({
            username: response.data.username,
            id: response.data.id,
            status: true,
            role: response.data.role,
            isAuthLoading: false,
          });
        }
      });
  }, []);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("avatarUrl");
    setAuthState({
      username: "",
      id: 0,
      status: false,
      role: "",
      isAuthLoading: false,
    });
  };

  return (
    <div>
      <AuthContext.Provider value={{ authState, setAuthState }}>
        <Router>
          <AppContent authState={authState} logout={logout} />
        </Router>
      </AuthContext.Provider>
    </div>
  );
}

function AppContent({ authState, logout }) {
  const noNavbarPages = [
    "/profile",
    "/bookingDetail/:courtId",
    "/chatbot",
    "/payment/cancel",
  ];
  const location = useLocation();

  const hideNavbar = noNavbarPages.some((pattern) =>
    matchPath(pattern, location.pathname)
  );
  return (
    <div>
      {!hideNavbar && <AppNavbar authState={authState} logout={logout} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/login" element={<Login />} />
        <Route path="/courtDetail/:id" element={<CourtDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/manageUser" element={<ManageUser />} />
        <Route
          path="/bookingDetail/:courtId"
          element={
            <CancelHandler>
              <BookingDetail />
            </CancelHandler>
          }
        />
        <Route path="/payment/:courtId" element={<Payment />} />
        <Route path="/manageCourt" element={<ManageCourts />} />
        <Route path="/payment-success" element={<SuccessPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/payment-cancel" element={<PaymentCancel />} />
        <Route
          path="/payment-waiting/:orderCode"
          element={<PaymentWaiting />}
        />
        <Route path="/manageCoupons" element={<ManageCoupons />} />
        <Route path="/manageBookings" element={<BookingsManagement />} />
        <Route path="/managePayments" element={<PaymentManagement />} />
      </Routes>
    </div>
  );
}

export default App;
