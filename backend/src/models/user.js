const sql = require('msnodesqlv8');
require('dotenv').config();
const connectionString = process.env.SQL_SERVER_CONNECTION_STRING;

const query = (sqlQuery, params = []) => {
    return new Promise((resolve, reject) => {
        sql.query(connectionString, sqlQuery, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

const User = {
    findOneByEmail: async (email) => {
        // const result = await query(`EXEC GetUsersWithPenalty @Email = ?`, [
        //     email,
        // ]);
        const result = await query(`SELECT * FROM Users WHERE Email = ?`, [
            email,
        ]);
        return result[0] || null;
    },

    create: async (user) => {
        const { name, email, password, role, LName, FName, CCCD, BDate } = user;
        const sqlQuery = `INSERT INTO Users (name, email, password, role,  CCCD, FName, LName, BDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        return await query(sqlQuery, [
            name,
            email,
            password,
            role,
            CCCD,
            FName,
            LName,
            BDate,
        ]);
    },

    findAll: async () => {
        // return await query(`EXEC GetUsersWithPenalty`);
        return await query(`SELECT * FROM Users`);
    },

    findOne: async (userId) => {
        // return await query(`EXEC GetUsersWithPenalty @UserId = ?`, [userId]);
        return await query(`SELECT * FROM Users where id = ?`, [userId]);
    },

    findById: async (id) => {
        const result = await query(`SELECT * FROM Users WHERE id = ?`, [id]);
        console.log('result', result);
        return result[0] || null;
    },

    deleteById: async (id) => {
        console.log(id);
        return await query(`DELETE FROM Users WHERE id = ?`, [id]);
    },

    getAllRooms: async () => {
        return await query(`
            EXEC sp_ThongTinChiTietPhongHoc10;
        `);
    },

    getRoom: async (roomID) => {
        console.log('roomID', roomID);
        return await query(`
            EXEC sp_ThongTinChiTietPhongHoc10 @ROOMID = '${roomID}';
        `);
    },

    postBooking: async (bookingData) => {
        const {
            RoomID,
            Borrowed_Date,
            Borrowed_Time,
            Duration,
            Actual_Return_Time,
            TicketStatus,
            CCCD,
        } = bookingData;

        const sqlQuery = `
            EXEC INSERT_TICKET_TONG_QUAT10
                @RoomID = ?, 
                @Borrowed_Date = ?, 
                @Borrowed_Time = ?, 
                @Duration = ?, 
                @Actual_Return_Time = ?, 
                @TicketStatus = ?, 
                @CCCD = ?;
        `;

        const params = [
            RoomID || null,
            Borrowed_Date,
            Borrowed_Time,
            Duration,
            Actual_Return_Time || null,
            TicketStatus,
            CCCD,
        ];

        return await query(sqlQuery, params);
    },

    getBookedSlots: async (roomID) => {
        try {
            const data = await query(`
            SELECT 
                CONVERT(varchar, Borrowed_Date, 23) AS date, 
                Borrowed_Time,
                Duration,
                Expected_Return_Time
            FROM PHIEU_MUON 
            WHERE RoomID = '${roomID}'
            AND TicketStatus IN ('PENDING')
            ORDER BY Borrowed_Date, Borrowed_Time
        `);
            console.log('data>>>>>>>>>>>', data);
            return data;
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Lỗi khi lấy dữ liệu giờ đã đặt' });
        }
    },

    getHistory: async (CCCD) => {
        try {
            const data = await query(
                `SELECT 
                    pm.TicketID,
                    pm.RoomID,
                    pm.Borrowed_Date,
                    pm.Borrowed_Time,
                    pm.Duration,
                    pm.Expected_Return_Time,
                    pm.Actual_Return_Time,
                    pm.TicketStatus,
                    
                    -- Thông tin phòng học
                    COALESCE(pn.RoomName, pt.RoomName, pc.RoomName) AS RoomName,
                    COALESCE(pn.RoomCapacity, pt.RoomCapacity) AS RoomCapacity,
                    pc.TimeLimit,
                    CASE 
                        WHEN pn.RoomID IS NOT NULL THEN N'Phòng học nhóm'
                        WHEN pt.RoomID IS NOT NULL THEN N'Phòng thuyết trình'
                        WHEN pc.RoomID IS NOT NULL THEN N'Phòng học cá nhân'
                        ELSE N'Không xác định'
                    END AS RoomType,
                    
                    u.FName + ' ' + u.LName AS QuanLyFullName,
                    u.Email AS QuanLyEmail
                FROM PHIEU_MUON pm
                LEFT JOIN PHONG_HOC ph ON pm.RoomID = ph.RoomID
                LEFT JOIN PHONG_HOC_NHOM pn ON ph.RoomID = pn.RoomID
                LEFT JOIN PHONG_THUYET_TRINH pt ON ph.RoomID = pt.RoomID
                LEFT JOIN PHONG_HOC_CA_NHAN pc ON ph.RoomID = pc.RoomID
                LEFT JOIN NGUOI_QUAN_LY ql ON ph.CCCD = ql.CCCD
                LEFT JOIN Users u ON ql.CCCD = u.CCCD
                WHERE pm.CCCD = '${CCCD}'
                ORDER BY pm.Borrowed_Date DESC, pm.Borrowed_Time DESC;
                `
            );
            console.log(data);
            return data;
        } catch (err) {
            throw err;
        }
    },

    getHistoryAll: async () => {
        try {
            const data = await query(`
                SELECT * FROM PHIEU_MUON
                ORDER BY Borrowed_Date DESC, Borrowed_Time DESC
            `);
            return data;
        } catch (err) {
            console.error(err);
            throw new Error('Lỗi khi lấy dữ liệu lịch sử');
        }
    },

    getViolateAll: async () => {
        try {
            const data = await query(`
                SELECT 
                        pm.[TicketIDNum],
                        pm.[TicketID],
                        pm.[RoomID],
                        pm.[Borrowed_Date],
                        pm.[Borrowed_Time],
                        pm.[Duration],
                        pm.[Expected_Return_Time],
                        pm.[Actual_Return_Time],
                        pm.[TicketStatus],
                        pm.[CCCD],
                        pm.[DeviceID],
                        pm.[Quantity],
                        pp.[Penalty_TicketIDNum],
                        pp.[Penalty_TicketID],
                        pp.[PenaltyMoney],
                        pp.[Pay_Status]
                    FROM [btl].[dbo].[PHIEU_MUON] pm
                    INNER JOIN [btl].[dbo].[PHIEU_PHAT] pp
                        ON pm.[TicketID] = pp.[TicketID];
                `);
            return data;
        } catch (err) {
            console.error(err);
            throw new Error('Lỗi khi lấy dữ liệu lịch sử');
        }
    },

    postStatusService: async (ticketId, action) => {
        const validActions = ['CANCEL', 'PAID', 'LATE'];
        if (!validActions.includes(action)) {
            return res
                .status(400)
                .json({ success: false, message: 'Hành động không hợp lệ' });
        }
        const data = await query(`
               UPDATE PHIEU_MUON
               SET TicketStatus = '${action}'
               WHERE TicketID = '${ticketId}'
               `);

        return data;
    },

    updateUser: async (id, data) => {
        const res = await query(`
               UPDATE Users
               SET role = '${data.role}', LName = '${data.LName}',FName = '${data.FName}',CCCD = '${data.CCCD}',BDate = '${data.BDate}',Email = '${data.email}'
               WHERE id = '${id}'
               `);
        return res;
    },

    updateRoom: async (id, data) => {
        const roomType = data.RoomType;

        if (!roomType) {
            throw new Error('Phòng không tồn tại!');
        }

        let updateQuery;

        if (roomType === 'Phòng học nhóm') {
            updateQuery = `
                UPDATE PHONG_HOC_NHOM
                SET RoomName = '${data.RoomName}', RoomCapacity = '${data.RoomCapacity}', TimeLimit = '${data.TimeLimit}'
                WHERE RoomID = '${id}'
            `;
        } else if (roomType === 'Phòng thuyết trình') {
            updateQuery = `
                UPDATE PHONG_THUYET_TRINH
                SET RoomName = '${data.RoomName}', RoomCapacity = '${data.RoomCapacity}', TimeLimit = '${data.TimeLimit}'
                WHERE RoomID = '${id}'
            `;
        } else if (roomType === 'Phòng học cá nhân') {
            updateQuery = `
                UPDATE PHONG_HOC_CA_NHAN
                SET RoomName = '${data.RoomName}', RoomCapacity = '${data.RoomCapacity}'
                WHERE RoomID = '${id}'
            `;
        } else {
            throw new Error('Loại phòng không hợp lệ!');
        }

        const res = await query(updateQuery);
        return res;
    },

    addRoom: async (data) => {
        const { RoomID, RoomName, RoomCapacity, TimeLimit, RoomType } = data;

        if (!RoomType || !RoomID || !RoomName || !TimeLimit) {
            throw new Error('Thiếu thông tin bắt buộc!');
        }

        let addQuery = '';

        addQuery += `INSERT INTO PHONG_HOC (CCCD) VALUES ('079201791244');\n`;

        if (RoomType === 'Phòng học nhóm') {
            addQuery += `
            INSERT INTO PHONG_HOC_NHOM (RoomID, RoomName, RoomCapacity, TimeLimit)
            VALUES ('${RoomID}','${RoomName}', '${RoomCapacity}','${TimeLimit}');
        `;
        } else if (RoomType === 'Phòng thuyết trình') {
            addQuery += `
            INSERT INTO PHONG_THUYET_TRINH (RoomID, RoomName, RoomCapacity, TimeLimit)
            VALUES ('${RoomID}','${RoomName}', '${RoomCapacity}','${TimeLimit}');
        `;
        } else if (RoomType === 'Phòng học cá nhân') {
            addQuery += `
            INSERT INTO PHONG_HOC_CA_NHAN (RoomID, RoomName, TimeLimit)
            VALUES ('${RoomID}','${RoomName}', '${TimeLimit}');
        `;
        } else {
            throw new Error('Loại phòng không hợp lệ!');
        }

        const res = await query(addQuery);
        return res;
    },

    deleteRoom: async (id) => {
        const deleteQuery = `DELETE FROM PHONG_HOC WHERE RoomID = '${id}'`;
        return await query(deleteQuery);
    },

    getDuration: async (startDate, endDate, roomId) => {
        let sqlQuery = `
            SELECT RoomID, SUM(Duration) AS totalDuration
            FROM PHIEU_MUON
            WHERE Borrowed_Date BETWEEN ? AND ?  AND TicketStatus IN ('PAID', 'LATE')
        `;
        const params = [startDate, endDate];
        console.log('params', params);
        if (roomId) {
            sqlQuery += ` AND RoomID = ?`;
            params.push(roomId);
        }

        sqlQuery += ` GROUP BY RoomID`;

        const result = await query(sqlQuery, params);
        console.log('result', result);
        return result;
    },
};
module.exports = User;
