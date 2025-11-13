// D:\App_Quan_Ly_SK_The_Thao_va_Dat_San\server\scripts\seedCourtFields.js (hoặc file bạn dùng để seed)

const db = require("../models"); // Giả định file index.js trong thư mục models
const { CourtFields } = db.sequelize.models;

const START_ID = 1;
const END_ID = 16;
const COURT_ID_PARENT = 1; // Giả định tất cả sân con thuộc về sân lớn (Courts) có ID là 1

async function seedAdditionalCourtFields() {
  try {
    console.log(
      `Bắt đầu bổ sung CourtFields từ ID ${START_ID} đến ${END_ID}...`
    );

    const newFields = [];

    // Tạo 11 bản ghi mới (ID từ 6 đến 16)
    for (let i = START_ID; i <= END_ID; i++) {
      newFields.push({
        // Tên cột phải khớp với định nghĩa mô hình (fieldName, fieldType)
        id: i, // Rất quan trọng: Gán ID thủ công để đảm bảo Schedule có thể tham chiếu
        fieldName: `Sân Phụ PB-${i}`,
        fieldType: "Pickleball", // Loại sân
        courtId: COURT_ID_PARENT, // Khóa ngoại liên kết đến bảng Courts
      });
    }

    // Chèn dữ liệu mới.
    // `ignoreDuplicates: true` sẽ bỏ qua lỗi nếu các ID này đã tồn tại
    await CourtFields.bulkCreate(newFields, { ignoreDuplicates: true });

    console.log(`✅ Hoàn thành bổ sung ${newFields.length} CourtFields.`);
  } catch (error) {
    console.error("❌ Lỗi khi thực hiện seed CourtFields:", error);
  } finally {
    // Đóng kết nối DB
    // Tùy thuộc vào cách bạn quản lý kết nối, bạn có thể cần phải đóng nó ở đây
    // await db.sequelize.close();
  }
}

seedAdditionalCourtFields();
