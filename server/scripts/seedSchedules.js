// D:\App_Quan_Ly_SK_The_Thao_va_Dat_San\server\scripts\seedSchedules.js

const db = require("../models"); // Giả định file index.js trong thư mục models của bạn
const { Schedule } = db.sequelize.models; // Truy cập Model Schedule đã định nghĩa

// Hàm tạo một mảng các ngày trong tương lai (từ hôm nay + 7 ngày)
const getFutureDates = (days) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    // Định dạng YYYY-MM-DD cho DataTypes.DATEONLY
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
};

// Khung giờ đặt sân (Định dạng HH:MM)
// Sử dụng các khoảng thời gian theo yêu cầu: morning 05:00-12:00, lunch 12:00-18:00, afternoon 18:00-22:00
const timeSlots = [
  // Morning: 05:00 - 12:00 (05-06, 06-07, ..., 11-12)
  { start: "05:00", end: "06:00", period: "morning" },
  { start: "06:00", end: "07:00", period: "morning" },
  { start: "07:00", end: "08:00", period: "morning" },
  { start: "08:00", end: "09:00", period: "morning" },
  { start: "09:00", end: "10:00", period: "morning" },
  { start: "10:00", end: "11:00", period: "morning" },
  { start: "11:00", end: "12:00", period: "morning" },

  // Lunch: 12:00 - 18:00 (12-13, ..., 17-18)
  { start: "12:00", end: "13:00", period: "lunch" },
  { start: "13:00", end: "14:00", period: "lunch" },
  { start: "14:00", end: "15:00", period: "lunch" },
  { start: "15:00", end: "16:00", period: "lunch" },
  { start: "16:00", end: "17:00", period: "lunch" },
  { start: "17:00", end: "18:00", period: "lunch" },

  // Afternoon: 18:00 - 22:00 (18-19, 19-20, 20-21, 21-22)
  { start: "18:00", end: "19:00", period: "afternoon" },
  { start: "19:00", end: "20:00", period: "afternoon" },
  { start: "20:00", end: "21:00", period: "afternoon" },
  { start: "21:00", end: "22:00", period: "afternoon" },
];

const NUMBER_OF_COURT_FIELDS = 16;
const DAYS_TO_SEED = 7; // Tạo lịch cho 7 ngày tới
const FUTURE_DATES = getFutureDates(DAYS_TO_SEED);

async function seedSchedules() {
  try {
    console.log("Bắt đầu tạo dữ liệu lịch đặt sân...");

    // Lấy thông tin tất cả các sân để có thông tin về giá
    const courtFields = await db.CourtFields.findAll();

    const schedules = [];

    // Lặp qua mỗi ô sân (1 đến 16)
    for (
      let courtFieldId = 1;
      courtFieldId <= NUMBER_OF_COURT_FIELDS;
      courtFieldId++
    ) {
      const courtField = courtFields.find((cf) => cf.id === courtFieldId);
      if (!courtField) continue;

      // Lặp qua mỗi ngày
      FUTURE_DATES.forEach((date) => {
        // Lặp qua mỗi khung giờ
        timeSlots.forEach((slot) => {
          let price;
          switch (slot.period) {
            case "morning":
              price = courtField.pricePerMorning;
              break;
            case "lunch":
              price = courtField.pricePerLunch;
              break;
            case "afternoon":
              price = courtField.pricePerAfternoon;
              break;
          }

          schedules.push({
            courtFieldId: courtFieldId,
            Day: date,
            startTime: slot.start,
            endTime: slot.end,
            price: price,
            state: "available", // available, booked, unavailable
          });
        });
      });
    }

    // Xóa dữ liệu cũ (Tùy chọn: nên bỏ đi trong môi trường Production)
    await Schedule.destroy({ where: {}, truncate: true });

    // Chèn tất cả các bản ghi mới (Bulk Insert)
    await Schedule.bulkCreate(schedules);

    const totalRecords =
      NUMBER_OF_COURT_FIELDS * DAYS_TO_SEED * timeSlots.length;

    console.log(
      `✅ Hoàn thành chèn ${totalRecords} lịch trình vào bảng Schedule.`
    );
  } catch (error) {
    console.error("❌ Lỗi khi thực hiện seed Schedules:", error);
  } finally {
    // Đóng kết nối cơ sở dữ liệu sau khi hoàn thành
    await db.sequelize.close();
  }
}

seedSchedules();
