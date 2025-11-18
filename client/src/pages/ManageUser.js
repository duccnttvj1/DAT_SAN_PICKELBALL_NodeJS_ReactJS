import React, { useContext, useState, useEffect } from "react";
import { AuthContext } from "../helpers/AuthContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import "bootstrap-icons/font/bootstrap-icons.css";

function ManageUser() {
  const navigate = useNavigate();
  const { authState } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    role: "user",
    gender: "Nam",
    dateOfBirth: "",
  });

  // Fetch danh sách user
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3001/users/all", {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      alert("Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authState.isAuthLoading) return;
    if (!authState.status) {
      navigate("/login");
      return;
    }
    if (authState.role !== "admin") {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [authState, navigate]);

  // Mở modal
  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "user",
        gender: user.gender || "Nam",
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        role: "user",
        gender: "Nam",
        dateOfBirth: "",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Gửi form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = editingUser
      ? `http://localhost:3001/users/${editingUser.id}`
      : "http://localhost:3001/users/";

    const method = editingUser ? "put" : "post";

    const payload = { ...formData };
    if (!editingUser) {
      payload.password = Math.random().toString(36).slice(-8); // Mật khẩu ngẫu nhiên
    }

    try {
      await axios[method](url, payload, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });

      alert(
        editingUser ? "Cập nhật thành công!" : "Thêm người dùng thành công!"
      );
      closeModal();
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Lỗi khi lưu người dùng.");
    } finally {
      setLoading(false);
    }
  };

  // Xóa user
  const handleDelete = async (userId) => {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    setLoading(true);
    try {
      await axios.delete(`http://localhost:3001/users/${userId}`, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      alert("Xóa thành công!");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Không thể xóa người dùng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5 mx-4 p-4 bg-success text-white rounded-3">
      <button
        onClick={() => openModal()}
        className="mb-4 border-0 rounded-2 p-2 px-4 bg-warning text-white fw-bold fs-5"
      >
        Thêm người dùng
      </button>

      {loading && <div className="text-center">Đang tải...</div>}

      <div className="table-responsive">
        <table className="mx-auto border-white w-100 table-bordered table-hover table-group-divider fs-5">
          <thead>
            <tr>
              <th className="p-2">Tên đăng nhập</th>
              <th className="p-2">Họ tên</th>
              <th className="p-2">Email</th>
              <th className="p-2">SĐT</th>
              <th className="p-2">Quyền</th>
              <th className="p-2">Giới tính</th>
              <th className="p-2">Ngày sinh</th>
              <th className="p-2">Tạo lúc</th>
              <th className="p-2">Cập nhật</th>
              <th className="p-2 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center text-muted">
                  Chưa có người dùng nào
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="p-2">{user.username}</td>
                  <td className="p-2">{user.fullName || "-"}</td>
                  <td className="p-2">{user.email || "-"}</td>
                  <td className="p-2">{user.phone || "-"}</td>
                  <td className="p-2">
                    <span
                      className={`badge ${
                        user.role === "admin" ? "bg-danger" : "bg-secondary"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-2">{user.gender || "-"}</td>
                  <td className="p-2">
                    {user.dateOfBirth
                      ? format(new Date(user.dateOfBirth), "dd/MM/yyyy")
                      : "-"}
                  </td>
                  <td className="p-2">
                    {format(new Date(user.createdAt), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="p-2">
                    {format(new Date(user.updatedAt), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="p-2 d-flex justify-content-center gap-2">
                    <button
                      onClick={() => openModal(user)}
                      className="border-0 rounded-2 py-1 px-2 bg-info text-white"
                      title="Sửa"
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="border-0 rounded-2 py-1 px-2 bg-danger text-white"
                      title="Xóa"
                    >
                      <i className="bi bi-trash-fill"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center mb-4 text-success">
              {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label>Tên đăng nhập</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Họ tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label>Quyền</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label>Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="form-control"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading}
                >
                  {loading ? "Đang lưu..." : editingUser ? "Cập nhật" : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageUser;
