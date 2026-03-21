const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");


const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

app.use(express.static(path.join(__dirname,"public")));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT)
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Connected to Railway MySQL");
  }
});

/* ================= SIGNUP API ================= */

app.post("/signup", async (req,res)=>{


    const { fullName, contactValue, role, username, password } = req.body;

    if(!fullName || !username || !password){
        return res.json({success:false, message:"Please fill all required fields"});
    }

    const hashedPassword = await bcrypt.hash(password,10);

    db.query("SELECT * FROM users WHERE username=?",[username],(err,result)=>{

    if(err){
        console.log(err);
        return res.json({success:false,message:"Database error"});
    }

        if(result.length > 0){
            return res.json({success:false, message:"Username already exists"});
        }

        db.query(
            "INSERT INTO users (fullName,contactValue,role,username,password) VALUES (?,?,?,?,?)",
            [fullName,contactValue,role,username,hashedPassword],
            (err,data)=>{
                if(err){
                    console.log(err);
                    return res.json({success:false,message:"Database error"});
                }
                res.json({success:true,message:"Account Created Successfully"});
            }
        );

    });

});
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], async (err, results) => {

    if(err){
        console.log(err);
        return res.status(500).json({ message: "Database error" });
    }

        if (results.length === 0)
            return res.status(401).json({ message: "Invalid Username" });

        const user = results[0];

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ message: "Wrong Password" });

        res.json({ message: "Login successful", username: user.username });
    });
});
// ================= RESET PASSWORD =================
app.post("/reset-password", async (req, res) => {
    const { username, newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const sql = "UPDATE users SET password = ? WHERE username = ?";
    db.query(sql, [hashedPassword, username], (err, result) => {

    if(err){
        console.log(err);
        return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0)

            return res.status(400).json({ message: "User not found" });

        res.json({ message: "Password updated successfully" });
    });
});
app.get("/api/books/:title", (req, res) => {
    const title = req.params.title;

    db.query(
        "SELECT * FROM books WHERE title = ?",
        [title],
        (err, results) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Database error" });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "Book not found" });
            }

            res.json(results[0]);
        }
    );
});
app.get("/test", (req, res) => {
    res.json({ message: "Backend is working" });
});
/* ================= ADD BOOK ================= */
app.post("/add-book", (req, res) => {

    const { title, author, category, isbn, year, status } = req.body;

    if(!title || !author){
        return res.status(400).json({message:"Title and Author required"});
    }

    const sql = `
        INSERT INTO books (title, author, category, isbn, year, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [title, author, category, isbn, year, status], (err,result) => {

        if (err) {
            console.log("ADD BOOK ERROR:",err);
            return res.status(500).json({ message: "Database insert failed" });
        }

        res.json({ message: "Book added successfully!" });

    });


});
/* ================= GET ALL BOOKS ================= */

app.get("/books", (req, res) => {

    const sql = "SELECT * FROM books";

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            return res.json([]);
        }

        res.json(result);
    });

});

app.delete("/delete-book/:id", (req, res) => {

    const id = req.params.id;

    db.query("DELETE FROM books WHERE id = ?", [id], (err, result) => {

        if (err) {
            console.log(err);
            return res.json({ success: false, message: "Database error" });
        }

        res.json({ success: true, message: "Book Deleted Successfully" });
    });
});

app.put("/update-book-status", (req, res) => {

    const { title, status } = req.body;

    db.query(
        "UPDATE books SET status=? WHERE title=?",
        [status, title],
        (err, result) => {
            if (err) {
                res.status(500).json({ message: "Update failed" });
            } else {
                res.json({ message: "Book status updated" });
            }
        }
    );
});
app.post("/add-book-if-not-exists", (req, res) => {

    const { title, author, category, isbn, year, status } = req.body;

    if(!title){
        return res.status(400).json({message:"Title required"});
    }

    db.query(
        "SELECT id FROM books WHERE title=?",
        [title],
        (err,result)=>{

            if(err){
                console.log(err);
                return res.status(500).json({message:"DB error"});
            }

            if(result.length>0){
                return res.json({message:"Already exists"});
            }

            db.query(
                "INSERT INTO books(title,author,category,isbn,year,status) VALUES (?,?,?,?,?,?)",
                [title,author,category,isbn,year,status],
                (err2)=>{
                    if(err2){
                        console.log(err2);
                        return res.status(500).json({message:"Insert failed"});
                    }

                    res.json({message:"Book added"});
                }
            );
        }
    );
});
app.post("/issue-book", (req, res) => {

    const { title, issueDate, dueDate } = req.body;

    if (!title || !issueDate || !dueDate) {
        return res.status(400).json({ message: "Missing data" });
    }

    db.query(
        "SELECT * FROM books WHERE title = ?",
        [title],
        (err, result) => {

            if (err) return res.status(500).json({ message: "Database error" });

            if (result.length === 0)
                return res.status(400).json({ message: "Book not found" });

            const book = result[0];

            db.query(
                "INSERT INTO issued_books (book_id, book_title, issue_date, due_date) VALUES (?, ?, ?, ?)",
                [book.id, book.title, issueDate, dueDate],
                (err2) => {

                    if (err2)
                        return res.status(500).json({ message: "Insert failed" });

                    db.query(
                        "UPDATE books SET status='Issued' WHERE id=?",
                        [book.id],
                        () => {
                            res.json({ message: "Book Issued Successfully" });
                        }
                    );
                }
            );
        }
    );
});


app.post("/return-book", (req, res) => {

    const { title, returnDate } = req.body;

    if (!title || !returnDate) {
        return res.status(400).json({ message: "Missing data" });
    }

    db.query(
        "SELECT * FROM issued_books WHERE book_title = ? ORDER BY id DESC LIMIT 1",
        [title],
        (err, result) => {

            if (err)
                return res.status(500).json({ message: "Database error" });

            if (result.length === 0)
                return res.status(400).json({ message: "Book not issued" });

            const issuedBook = result[0];

            db.query(
                `INSERT INTO returned_books 
                (book_id, book_title, issue_date, due_date, return_date) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    issuedBook.book_id,
                    issuedBook.book_title,
                    issuedBook.issue_date,
                    issuedBook.due_date,
                    returnDate
                ],
                (err2) => {

                    if (err2)
                        return res.status(500).json({ message: "Insert failed" });

                    db.query(
                        "UPDATE books SET status='Available' WHERE title=?",
                        [title],
                        () => {
                            res.json({ message: "Book Returned Successfully" });
                        }
                    );
                }
            );
        }
    );
});

app.get("/returned-books", (req, res) => {

    db.query("SELECT * FROM returned_books", (err, result) => {

        if (err) {
            console.log(err);
            return res.status(500).json({ message: "Database error" });
        }

        res.json(result);
    });
});

app.get("/issued-books", (req, res) => {

    db.query(
        "SELECT * FROM issued_books",
        (err, result) => {

            if (err) {
                return res.status(500).json([]);
            }

            res.json(result);
        }
    );

});
app.post("/contact", (req, res) => {

    const { name, email, queryType, message } = req.body;

    console.log("EMAIL USER:", process.env.EMAIL_USER);
console.log("EMAIL PASS:", process.env.EMAIL_PASS ? "SET" : "NOT SET");
    if (!name || !email || !message) {
        return res.status(400).json({ message: "All fields required" });
    }

    // 1️⃣ Save to Database
    const sql = `
        INSERT INTO contact_messages (name, email, query_type, message)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, queryType, message], (err) => {

       if (err) {
    console.log("❌ DB ERROR:", err);
    return res.status(500).json({ message: "Database error" });
}

        // 2️⃣ Send Email TO USER
      const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,   // 🔥 THIS SENDS TO USER
            subject: "Library Contact Confirmation",
            html: `
                <h2>Thank You for Contacting Digital Library 📚</h2>
                <p>Dear ${name},</p>
                <p>We have received your request regarding:</p>
                <p><b>${queryType}</b></p>
                <p>Your message:</p>
                <p>"${message}"</p>
                <br>
                <p>Our team will contact you soon.</p>
                <br>
                <p>Regards,<br>Digital Library Team</p>
            `
        };

      transporter.sendMail(mailOptions, (error, info) => {

    if (error) {
        console.log("❌ EMAIL ERROR:", error);

        // DON'T FAIL API
        return res.json({
            message: "Saved but email failed"
        });
    }

    console.log("✅ EMAIL SENT:", info.response);

    res.json({
        message: "Request submitted & email sent"
    });

});

    });

});
app.get("/test-email", async (req, res) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "Test Email",
            text: "Working ✅"
        });

        res.send("Email sent ✅");
    } catch (err) {
        console.log(err);
        res.send("Email failed ❌");
    }
});
/* ================= START SERVER ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
