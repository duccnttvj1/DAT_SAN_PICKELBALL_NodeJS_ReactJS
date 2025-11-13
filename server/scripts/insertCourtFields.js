const { CourtFields, Courts } = require("../models");

const insertCourtFields = async () => {
  try {
    // Lấy danh sách tất cả các court
    const courts = await Courts.findAll({
      order: [["id", "ASC"]],
    });

    if (courts.length !== 4) {
      console.error("Cần đúng 4 court trong database!");
      return;
    }

    const courtFieldsData = courts.flatMap((court) => [
      {
        fieldName: "Sân A",
        fieldType: "Sân 5",
        courtId: court.id,
        pricePerMorning: 200000,
        pricePerLunch: 150000,
        pricePerAfternoon: 300000,
      },
      {
        fieldName: "Sân B",
        fieldType: "Sân 7",
        courtId: court.id,
        pricePerMorning: 300000,
        pricePerLunch: 250000,
        pricePerAfternoon: 400000,
      },
      {
        fieldName: "Sân C",
        fieldType: "Sân 11",
        courtId: court.id,
        pricePerMorning: 400000,
        pricePerLunch: 350000,
        pricePerAfternoon: 500000,
      },
      {
        fieldName: "Sân D",
        fieldType: "Sân 5 mini",
        courtId: court.id,
        pricePerMorning: 150000,
        pricePerLunch: 100000,
        pricePerAfternoon: 200000,
      },
    ]);

    // Thêm tất cả courtFields
    const createdCourtFields = await CourtFields.bulkCreate(courtFieldsData);

    console.log(`Đã thêm thành công ${createdCourtFields.length} sân con.`);
    console.log("Chi tiết:");
    courts.forEach((court) => {
      console.log(`\nCourt: ${court.courtName}`);
      const courtFields = createdCourtFields.filter(
        (cf) => cf.courtId === court.id
      );
      courtFields.forEach((cf) => {
        console.log(`- ${cf.fieldName} (${cf.fieldType})`);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error("Lỗi khi thêm dữ liệu:", error);
    process.exit(1);
  }
};

// Chạy function
insertCourtFields();
