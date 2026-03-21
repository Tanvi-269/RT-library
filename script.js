
// ================= GLOBAL DATA =================
let selectedBookId = null;
let selectedBookIndex = null;
const API_BASE = "https://rt-library.onrender.com";
function openModal(id){
    document.getElementById(id).style.display="flex";
}

function closeModal(id){
    document.getElementById(id).style.display="none";
}

/* ================= SIGNUP ================= */
async function signup() {

    const fullName = document.getElementById("fullName").value.trim();
    const contactType = document.getElementById("contactType").value;
    const contactValue = document.getElementById("contactValue").value.trim();
    const role = document.getElementById("role").value;
    const username = document.getElementById("signupUser").value.trim();
    const password = document.getElementById("signupPass").value;
    const confirmPass = document.getElementById("confirmPass").value;
    const terms = document.getElementById("terms").checked;

    if (!fullName || !contactValue || !role || !username || !password) {
        alert("Please fill all fields");
        return;
    }

    if (password !== confirmPass) {
        alert("Passwords do not match");
        return;
    }

    if (!terms) {
        alert("Please accept Terms & Conditions");
        return;
    }

    try {

        const response = await fetch(API_BASE + "/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName,
                contactValue,
                role,
                username,
                password
            })
        });

        const data = await response.json();
        alert(data.message);

        if(data.success){
            closeModal("signupModal");
        }

    } catch (error) {
        console.error(error);
        alert("Backend not reachable. Restart server.");
    }
}


async function login() {

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    try {
        const response = await fetch(API_BASE +"/login", {

            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById("userWelcome").innerText =
                "Welcome, " + data.username;

            document.getElementById("logoutBtn").style.display = "block";
            document.getElementById("authArea").style.display = "none";

            closeModal("loginModal");
        } else {
            alert(data.message);
        }

    } catch (error) {
        alert("Server not connected!");
    }
}

// ================= LOGOUT =================
function logout() {
    document.getElementById("userWelcome").innerText = "";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("authArea").style.display = "block";
}

// ================= FORGOT PASSWORD =================
function forgotPassword() {
    closeModal("loginModal");
    openModal("forgotModal");
}

async function resetPassword() {
    const username = document.getElementById("forgotUsername").value;
    const newPassword = document.getElementById("newPassword").value;

    const response = await fetch(API_BASE +"/reset-password", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, newPassword })
    });

    const data = await response.json();
    alert(data.message);
    closeModal("forgotModal");
}







// 🔹 OPEN BOOK DETAIL ON CLICK (FETCH FROM BACKEND)


function toggleBookManagement() {
    let area = document.getElementById("bookManagementArea");

    if (area.style.display === "none") {
        area.style.display = "block";
        loadBooksFromDatabase();   // auto load
    } else {
        area.style.display = "none";
    }
}



function loadBooks() {
    loadBooksFromDatabase();
}

function toggleCollection(){
    const area = document.getElementById("collectionArea");

    if(area.style.display === "none" || area.style.display === ""){
        area.style.display = "block";
    }else{
        area.style.display = "none";
    }
}


async function syncCollectionToDatabase() {

    const cards = document.querySelectorAll(".book-card");

    for (let card of cards) {

        const title = card.querySelector("h4")?.innerText.trim();
        const authorText = card.querySelector("p")?.innerText || "Unknown";
        const author = authorText.replace("Author:", "").trim();

        if (!title) continue;

        try {
            await fetch(API_BASE +"/add-book-if-not-exists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    author: author,
                    category: "General Collection",
                    isbn: "AUTO-" + title.replace(/\s/g, ""),
                    year: "2026",
                    status: "Available"
                })
            });
        } catch (error) {
            console.log("Error syncing:", title);
        }
    }

    console.log("Collection synced to database");
}

/* LOAD BOOKS INTO MANAGEMENT TABLE */
async function loadBooksFromDatabase() {

    try {
        const res = await fetch(API_BASE +"/books");
        const books = await res.json();

        const table = document.getElementById("bookMgmtTable");
        table.innerHTML = "";

        if (books.length === 0) {
            table.innerHTML = `<tr>
                <td colspan="7">No books available</td>
            </tr>`;
            return;
        }

        books.forEach(book => {
            table.innerHTML += `
                <tr>
                    <td>
<input type="checkbox"
onclick="selectedBookId='${book.id}'">
</td>

                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.category}</td>
                    <td>${book.isbn}</td>
                    <td>${book.year}</td>
                    <td>${book.status}</td>

                </tr>
            `;
        });

    } catch (error) {
        console.log(error);
        alert("Cannot load books from server");
    }
}


/* DELETE SELECTED BOOK */
function deleteSelectedBook() {

    if (!selectedBookId) {
        alert("Please select a book");
        return;
    }

    fetch(API_BASE +"/delete-book/" + selectedBookId, {
        method: "DELETE"
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        selectedBookId = null;
        loadBooksFromDatabase();
        loadBooksToIssueDropdown();
    })
    .catch(err => {
        console.log(err);
        alert("Delete failed");
    });
}


/* AUTO LOAD AFTER ADD BOOK */
async function saveBookToDatabase() {

    const name = document.getElementById("bookName")?.value.trim();
    const author = document.getElementById("bookAuthor")?.value.trim();
    const category = document.getElementById("bookCategory")?.value.trim();
    const isbn = document.getElementById("bookISBN")?.value.trim();
    const year = document.getElementById("bookYear")?.value.trim();

    if (!name || !author) {
        alert("Book Name and Author required!");
        return;
    }

    try {

        const response = await fetch(API_BASE +"/add-book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: name,
                author,
                category,
                isbn,
                year,
                status: "Available"
            })
        });

        const data = await response.json();
        alert(data.message);

        // Clear form safely
        document.getElementById("bookName").value = "";
        document.getElementById("bookAuthor").value = "";
        document.getElementById("bookCategory").value = "";
        document.getElementById("bookISBN").value = "";
        document.getElementById("bookYear").value = "";

        document.getElementById("bookTableSection").style.display = "block";
       loadBooksFromDatabase();
        loadBooksToIssueDropdown();


    } catch (error) {
        console.error(error);
        alert("Frontend error occurred (not server issue)");
    }
}

async function viewBooks() {

    const section = document.getElementById("viewBooksSection");
    const list = document.getElementById("viewBooksList");

    if (section.style.display === "block") {
        section.style.display = "none";
        return;
    }

    section.style.display = "block";
    list.innerHTML = "<li>Loading available books...</li>";

    try {

        const response = await fetch(API_BASE +"/books");
        const books = await response.json();

        const available = books.filter(b => b.status === "Available");

        list.innerHTML = "";

        if (available.length === 0) {
            list.innerHTML = "<li>No available books</li>";
            return;
        }

        available.forEach((book, index) => {
            list.innerHTML += `
                <li style="
                    padding:10px;
                    margin-bottom:8px;
                    background:#e8f5e9;
                    border-left:5px solid green;
                    border-radius:6px;
                ">
                    ${index + 1}. 
                    <strong>${book.title}</strong>
                    <br>
                    <small>Author: ${book.author}</small>
                </li>
            `;
        });

    } catch (error) {
        list.innerHTML = "<li>Cannot load books</li>";
    }
}



function toggleMemberBox(element) {

    let content = element.nextElementSibling;

    if (!content) return;

    content.style.display =
        content.style.display === "block" ? "none" : "block";
}
function toggleAddBookForm() {
    const form = document.getElementById("addBookForm");

    if (!form) {
        console.log("Form not found!");
        return;
    }

    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
    } else {
        form.style.display = "none";
    }
}

function showAddBook() {

    const section = document.getElementById("addBookSection");

    if (section.style.display === "none" || section.style.display === "") {
        section.style.display = "block";
    } else {
        section.style.display = "none";
    }

}


function loadBooksToIssueDropdown() {

    fetch(API_BASE +"/books")
    .then(res => res.json())
    .then(data => {

        const issueSelect = document.getElementById("issueBook");
        issueSelect.innerHTML =
            "<option value='' disabled selected>📘 Select Book</option>";

        data.forEach(book => {
            if (book.status === "Available" || book.status === null) {
                issueSelect.innerHTML +=
                    `<option value="${book.title}">
                        ${book.title}
                    </option>`;
            }
        });

    })
    .catch(err => console.log(err));
}




async function issueSelectedBook(){

    const issueBook = document.getElementById("issueBook");
    const issueDate = document.getElementById("issueDate");
    const dueDate = document.getElementById("dueDate");

    if(!issueBook.value || !issueDate.value || !dueDate.value){
        alert("Please fill all issue details");
        return;
    }

    try{

        const response = await fetch(API_BASE +"/issue-book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: issueBook.value,
                issueDate: issueDate.value,
                dueDate: dueDate.value
            })
        });

        const data = await response.json();
        alert(data.message);

        loadBooksToIssueDropdown();
        loadIssuedBooksToReturnDropdown();
       displaySingleIssuedBook(issueBook.value, issueDate.value, dueDate.value);



    } catch(error){
        console.log(error);
        alert("Issue failed. Check server.");
    }
}
function displaySingleIssuedBook(title, issueDate, dueDate){

    const table = document.getElementById("issuedBooksTable");
    if(!table) return;

    table.innerHTML = `
        <tr>
            <td>${title}</td>
            <td>${issueDate}</td>
            <td>${dueDate}</td>
        </tr>
    `;
}

function loadIssuedBooksToReturnDropdown(){

fetch(API_BASE +"/issued-books")
.then(res => res.json())
.then(data => {

    const returnSelect = document.getElementById("returnBook");

    returnSelect.innerHTML =
        "<option value='' disabled selected>📕 Select Issued Book</option>";

    data.forEach(book => {
        returnSelect.innerHTML +=
            `<option value="${book.book_title}">
                ${book.book_title}
            </option>`;
    });

});
}

async function loadIssuedBooksTable(){

    try{
        const res = await fetch(API_BASE +"/issued-books");
        const books = await res.json();

        const table = document.getElementById("issuedBooksTable");
        if(!table) return;

        table.innerHTML = "";

        if(books.length === 0){
            table.innerHTML = "<tr><td colspan='4'>No issued books</td></tr>";
            return;
        }

        books.forEach(book => {
            table.innerHTML += `
                <tr>
                    <td>${book.book_title}</td>
                    <td>${book.issue_date}</td>
                    <td>${book.due_date}</td>
                </tr>
            `;
        });

    }catch(error){
        console.log("Table load error:", error);
    }
}

async function returnSelectedBook(){

    const rb = document.getElementById("returnBook");
    const returnDate = document.getElementById("returnDate");

    if(!rb.value || !returnDate.value){
        alert("Please fill all return details");
        return;
    }

    try{

        const response = await fetch(API_BASE +"/return-book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: rb.value,
                returnDate: returnDate.value
            })
        });

        const data = await response.json();
        alert(data.message);

        loadBooksToIssueDropdown();
        loadIssuedBooksToReturnDropdown();
        displaySingleReturnedBook(rb.value, returnDate.value);




    } catch(error){
        console.log(error);
        alert("Return failed.");
    }
}
function displaySingleReturnedBook(title, returnDate){

    const table = document.getElementById("returnedBooksTable");
    if(!table) return;

    table.innerHTML = `
        <tr>
            <td>${title}</td>
            <td>${returnDate}</td>
        </tr>
    `;
}

async function loadReturnedBooksTable(){

    try{
        const res = await fetch(API_BASE +"/returned-books");
        const books = await res.json();

        const table = document.getElementById("returnedBooksTable");
        if(!table) return;

        table.innerHTML = "";

        if(books.length === 0){
            table.innerHTML = "<tr><td colspan='2'>No returned books</td></tr>";
            return;
        }

        books.forEach(book => {
            table.innerHTML += `
                <tr>
                    <td>${book.book_title}</td>
                    <td>${book.return_date}</td>
                </tr>
            `;
        });

    }catch(error){
        console.log("Returned table error:", error);
    }
}


function showIssueForm(){
    
    const f = document.getElementById("issueForm");
    f.style.display = (f.style.display === "block") ? "none" : "block";
}

function showReturnForm(){
  
    const f = document.getElementById("returnForm");
    f.style.display = (f.style.display === "block") ? "none" : "block";
}

function submitContactForm(e){
    e.preventDefault();

    const name = document.getElementById("contactName").value;
    const email = document.getElementById("contactEmail").value;
    const queryType = document.getElementById("contactQueryType").value;
    const message = document.getElementById("contactMessage").value;

    fetch(API_BASE +"/contact", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            queryType,
            message
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        document.getElementById("contactResponse").style.display = "block";

        document.getElementById("contactName").value = "";
        document.getElementById("contactEmail").value = "";
        document.getElementById("contactQueryType").value = "";
        document.getElementById("contactMessage").value = "";
    })
    .catch(err => {
        console.log(err);
        alert("Contact submission failed");
    });
}

window.addEventListener("DOMContentLoaded", () => {



loadBooksToIssueDropdown();
loadIssuedBooksToReturnDropdown();

loadIssuedBooksTable();
loadReturnedBooksTable();

window.location.hash = "#home";
document.getElementById("home").scrollIntoView();

});
