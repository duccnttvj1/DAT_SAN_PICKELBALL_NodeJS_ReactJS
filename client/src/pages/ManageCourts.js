import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../helpers/AuthContext";
import axios from "axios";
import "../styles/ManageCourt.css";

function ManageCourts() {
  const { authState } = useContext(AuthContext);
  const [listOfCourts, setListOfCourts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [formData, setFormData] = useState({
    courtName: "",
    avatarUrl: "",
    address: "",
    phoneNumber: "",
    openTime: "",
    closeTime: "",
    image: "",
  });

  // Fetch danh sách sân
  const fetchCourts = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:3001/courts/", {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      setListOfCourts(response.data.listOfCourts);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sân:", error);
      alert("Không thể tải danh sách sân.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  // Mở modal (thêm hoặc sửa)
  const openModal = (court = null) => {
    if (court) {
      setEditingCourt(court);
      setFormData({
        courtName: court.courtName,
        avatarUrl: court.avatarUrl || "",
        address: court.address,
        phoneNumber: court.phoneNumber,
        openTime: court.openTime || "",
        closeTime: court.closeTime || "",
        image: court.image || "",
      });
    } else {
      setEditingCourt(null);
      setFormData({
        courtName: "",
        avatarUrl: "",
        address: "",
        phoneNumber: "",
        openTime: "",
        closeTime: "",
        image: "",
      });
    }
    setShowModal(true);
  };

  // Đóng modal
  const closeModal = () => {
    setShowModal(false);
    setEditingCourt(null);
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Gửi form (thêm hoặc sửa)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = editingCourt
      ? `http://localhost:3001/courts/${editingCourt.id}`
      : "http://localhost:3001/courts/";

    const method = editingCourt ? "put" : "post";

    try {
      await axios[method](url, formData, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });

      alert(editingCourt ? "Cập nhật sân thành công!" : "Thêm sân thành công!");
      closeModal();
      fetchCourts(); // Refresh danh sách
    } catch (error) {
      console.error("Lỗi:", error);
      alert(error.response?.data?.error || "Lỗi khi lưu sân.");
    } finally {
      setLoading(false);
    }
  };

  // Xóa sân
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa sân này?")) return;

    setLoading(true);
    try {
      await axios.delete(`http://localhost:3001/courts/${id}`, {
        headers: { accessToken: localStorage.getItem("accessToken") },
      });
      alert("Xóa sân thành công!");
      fetchCourts();
    } catch (error) {
      console.error("Lỗi xóa:", error);
      alert("Không thể xóa sân.");
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
        Thêm sân mới
      </button>

      {loading && <div className="text-center">Đang tải...</div>}

      <table className="mx-auto border-white w-100 table-responsive table-bordered table-hover table-group-divider fs-4">
        <thead>
          <tr>
            <th className="text-center">Tên sân</th>
            <th className="text-center">Địa chỉ</th>
            <th className="text-center">SĐT</th>
            <th className="text-center">Đánh giá</th>
            <th className="text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {listOfCourts.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center text-muted">
                Chưa có sân nào
              </td>
            </tr>
          ) : (
            listOfCourts.map((court) => (
              <tr key={court.id}>
                <td className="p-2" style={{ width: "210px" }}>
                  {court.courtName}
                </td>
                <td className="p-2 td-scroll">{court.address}</td>
                <td className="p-2" style={{ width: "130px" }}>
                  {court.phoneNumber}
                </td>
                <td className="p-2 text-center">{court.rating || "Chưa có"}</td>
                <td className="p-2 d-flex justify-content-center gap-2">
                  <button
                    onClick={() => openModal(court)}
                    className="border-0 rounded-2 py-1 px-2 bg-info text-white"
                    title="Chỉnh sửa"
                  >
                    <i className="bi bi-pencil-square"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(court.id)}
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

      {/* MODAL FORM */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center mb-4">
              {editingCourt ? "Chỉnh sửa sân" : "Thêm sân mới"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label>Tên sân</label>
                <input
                  type="text"
                  name="courtName"
                  value={formData.courtName}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="mb-3">
                <label>Ảnh đại diện (URL)</label>
                <input
                  type="text"
                  name="avatarUrl"
                  value={formData.avatarUrl}
                  onChange={handleInputChange}
                  className="form-control"
                />
              </div>
              <div className="mb-3">
                <label>Địa chỉ</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="mb-3">
                <label>Số điện thoại</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="row mb-3">
                <div className="col">
                  <label>Giờ mở cửa</label>
                  <input
                    type="time"
                    name="openTime"
                    value={formData.openTime}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
                <div className="col">
                  <label>Giờ đóng cửa</label>
                  <input
                    type="time"
                    name="closeTime"
                    value={formData.closeTime}
                    onChange={handleInputChange}
                    className="form-control"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label>Ảnh sân (URL)</label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
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
                  {loading ? "Đang lưu..." : editingCourt ? "Cập nhật" : "Thêm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCourts;
