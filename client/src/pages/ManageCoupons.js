import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

function ManageCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state – khớp 100% với backend mới
  const [form, setForm] = useState({
    id: null,
    code: "",
    name: "", // THÊM: bắt buộc
    type: "fixed", // sẽ map thành discountType
    value: "", // sẽ map thành discountValue (string để tránh NaN)
    maxDiscount: "",
    minOrderAmount: "",
    expiryDate: "",
    maxUsageCount: "",
    courtId: "1", // THÊM: mặc định sân 1
    isActive: true,
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3001/coupons/admin", {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      setCoupons(res.data);
    } catch (err) {
      alert("Lỗi tải danh sách mã giảm giá");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate số
    const valueNum = Number(form.value);
    if (isNaN(valueNum) || valueNum <= 0) {
      alert("Giá trị giảm giá phải lớn hơn 0!");
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim() || `${form.code} - Giảm giá tự động`,
      description: "Tạo từ trang quản trị",
      discountType: form.type, // fixed / percentage
      discountValue: valueNum, // ép số sạch
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
      expiryDate: form.expiryDate || null,
      maxUsageCount: form.maxUsageCount ? Number(form.maxUsageCount) : null,
      courtId: Number(form.courtId),
      isActive: form.isActive,
    };

    try {
      if (form.id) {
        await axios.put(`http://localhost:3001/coupons/${form.id}`, payload, {
          headers: { accessToken: localStorage.getItem("accessToken") },
        });
        alert("Cập nhật thành công!");
      } else {
        await axios.post("http://localhost:3001/coupons", payload, {
          headers: { accessToken: localStorage.getItem("accessToken") },
        });
        alert("Thêm mã giảm giá thành công!");
      }
      setForm({
        id: null,
        code: "",
        name: "",
        type: "fixed",
        value: "",
        maxDiscount: "",
        minOrderAmount: "",
        expiryDate: "",
        maxUsageCount: "",
        courtId: "1",
        isActive: true,
      });
      fetchCoupons();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.details ||
        "Lỗi server";
      alert("Lỗi: " + msg);
    }
  };

  const handleEdit = (c) => {
    setForm({
      id: c.id,
      code: c.code,
      name: c.name || "",
      type: c.discountType,
      value: c.discountValue?.toString() || "",
      maxDiscount: c.maxDiscount?.toString() || "",
      minOrderAmount: c.minOrderAmount?.toString() || "",
      expiryDate: c.expiryDate ? c.expiryDate.split("T")[0] : "",
      maxUsageCount: c.maxUsageCount?.toString() || "",
      courtId: c.courtId?.toString() || "1",
      isActive: c.isActive,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa mã này?")) return;
    try {
      await axios.delete(`http://localhost:3001/coupons/${id}`, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      alert("Xóa thành công!");
      fetchCoupons();
    } catch (err) {
      alert("Lỗi xóa");
    }
  };

  if (loading) return <div className="text-center mt-5">Đang tải...</div>;

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-primary">Quản lý Mã Giảm Giá</h2>

      {/* Form */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          {form.id ? "Sửa Mã" : "Thêm Mã Mới"}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-3">
                <label>Mã Code</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-3">
                <label>Tên mã (hiển thị)</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-3">
                <label>Sân áp dụng</label>
                <select
                  name="courtId"
                  value={form.courtId}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="1">Sân 1</option>
                  <option value="2">Sân 2</option>
                  <option value="3">Sân 3</option>
                  {/* Thêm sân thật của bạn */}
                </select>
              </div>
              <div className="col-md-3">
                <label>Loại giảm</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="fixed">Cố định (VND)</option>
                  <option value="percentage">Phần trăm (%)</option>
                </select>
              </div>

              <div className="col-md-3">
                <label>
                  Giá trị giảm{" "}
                  {form.type === "percentage" ? "(1-100)" : "(VND)"}
                </label>
                <input
                  type="number"
                  name="value"
                  value={form.value}
                  onChange={handleChange}
                  min="1"
                  className="form-control"
                  required
                />
              </div>

              {form.type === "percentage" && (
                <div className="col-md-3">
                  <label>Giảm tối đa (VND)</label>
                  <input
                    type="number"
                    name="maxDiscount"
                    value={form.maxDiscount}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              )}

              <div className="col-md-3">
                <label>Đơn tối thiểu (VND)</label>
                <input
                  type="number"
                  name="minOrderAmount"
                  value={form.minOrderAmount}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-3">
                <label>Hết hạn</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-3">
                <label>Số lượt dùng tối đa</label>
                <input
                  type="number"
                  name="maxUsageCount"
                  value={form.maxUsageCount}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div className="col-md-3 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                  />
                  <label className="form-check-label">Hoạt động</label>
                </div>
              </div>

              <div className="col-12 text-end">
                <button type="submit" className="btn btn-success me-2">
                  {form.id ? "Cập nhật" : "Thêm mới"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setForm({
                      ...form,
                      id: null,
                      code: "",
                      name: "",
                      value: "",
                    })
                  }
                >
                  Hủy
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Bảng danh sách */}
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Mã</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Giá trị</th>
              <th>Sân</th>
              <th>Hết hạn</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td className="fw-bold">{c.code}</td>
                <td>{c.name}</td>
                <td>{c.discountType === "fixed" ? "Cố định" : "Phần trăm"}</td>
                <td>
                  {c.discountType === "percentage"
                    ? `${c.discountValue}% ${
                        c.maxDiscount
                          ? `(tối đa ${c.maxDiscount.toLocaleString()}đ)`
                          : ""
                      }`
                    : `${c.discountValue.toLocaleString()}đ`}
                </td>
                <td>{c.courtId}</td>
                <td>
                  {c.expiryDate
                    ? new Date(c.expiryDate).toLocaleDateString("vi-VN")
                    : "Vô hạn"}
                </td>
                <td>
                  <span
                    className={`badge ${
                      c.isActive ? "bg-success" : "bg-secondary"
                    }`}
                  >
                    {c.isActive ? "Hoạt động" : "Tạm khóa"}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-1"
                    onClick={() => handleEdit(c)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(c.id)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManageCoupons;
