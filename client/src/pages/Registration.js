import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Registration() {
  const navigate = useNavigate();

  const initialValues = {
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
    gender: "Nam",
    dateOfBirth: "",
  };

  const validationSchema = Yup.object().shape({
    username: Yup.string()
      .min(3, "Tối thiểu 3 ký tự")
      .max(15, "Tối đa 15 ký tự")
      .required("Vui lòng nhập tên đăng nhập"),
    password: Yup.string()
      .min(4, "Mật khẩu ít nhất 4 ký tự")
      .max(20, "Mật khẩu tối đa 20 ký tự")
      .required("Vui lòng nhập mật khẩu"),
    fullName: Yup.string().max(50, "Tối đa 50 ký tự"),
    email: Yup.string().email("Email không hợp lệ").max(100),
    phone: Yup.string()
      .matches(/^[0-9]{10,11}$/, "Số điện thoại không hợp lệ")
      .max(15),
    dateOfBirth: Yup.date()
      .max(new Date(), "Ngày sinh không được trong tương lai")
      .nullable(),
  });

  const onSubmit = async (data, { setSubmitting, setFieldError }) => {
    try {
      // Gửi dữ liệu + role mặc định là "user"
      await axios.post("http://localhost:3001/users/signup", {
        ...data,
        role: "user", // Mặc định
      });

      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error) {
      if (error.response?.data?.error) {
        // Xử lý lỗi từ backend (ví dụ: username đã tồn tại)
        const errMsg = error.response.data.error;
        if (errMsg.includes("Username")) {
          setFieldError("username", errMsg);
        } else {
          alert(errMsg);
        }
      } else {
        alert("Lỗi hệ thống. Vui lòng thử lại.");
      }
      console.error("Registration error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center min-vh-100 align-items-center bg-light">
      <div
        className="bg-white p-5 rounded-4 shadow-lg"
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <h2 className="text-center text-success mb-4 fw-bold">
          Đăng Ký Tài Khoản
        </h2>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              {/* Username */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Tên đăng nhập *
                </label>
                <Field
                  name="username"
                  className="form-control"
                  placeholder="Nhập tên đăng nhập"
                />
                <ErrorMessage name="username">
                  {(msg) => <div className="text-danger small mt-1">{msg}</div>}
                </ErrorMessage>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Mật khẩu *</label>
                <Field
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Nhập mật khẩu"
                />
                <ErrorMessage name="password">
                  {(msg) => <div className="text-danger small mt-1">{msg}</div>}
                </ErrorMessage>
              </div>

              {/* Full Name */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Họ và tên</label>
                <Field
                  name="fullName"
                  className="form-control"
                  placeholder="Nhập họ và tên"
                />
                <ErrorMessage name="fullName">
                  {(msg) => <div className="text-danger small mt-1">{msg}</div>}
                </ErrorMessage>
              </div>

              {/* Email */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <Field
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="example@gmail.com"
                />
                <ErrorMessage name="email">
                  {(msg) => <div className="text-danger small mt-1">{msg}</div>}
                </ErrorMessage>
              </div>

              {/* Phone */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Số điện thoại</label>
                <Field
                  name="phone"
                  className="form-control"
                  placeholder="0901234567"
                />
                <ErrorMessage name="phone">
                  {(msg) => <div className="text-danger small mt-1">{msg}</div>}
                </ErrorMessage>
              </div>

              {/* Gender */}
              <div className="mb-3">
                <label className="form-label fw-semibold">Giới tính</label>
                <Field as="select" name="gender" className="form-select">
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </Field>
              </div>

              {/* Date of Birth */}
              <div className="mb-4">
                <label className="form-label fw-semibold">Ngày sinh</label>
                <Field
                  name="dateOfBirth"
                  type="date"
                  className="form-control"
                />
                <ErrorMessage name="dateOfBirth">
                  {(msg) => <div className="text-danger small mt-1">{msg}</div>}
                </ErrorMessage>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-success w-100 fw-bold py-2"
              >
                {isSubmitting ? "Đang đăng ký..." : "ĐĂNG KÝ"}
              </button>
            </Form>
          )}
        </Formik>

        <div className="text-center mt-3">
          <span className="text-muted">Đã có tài khoản? </span>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-link text-success p-0"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}

export default Registration;
