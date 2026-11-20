
/* ==================================
   PAISAPILOT - MAIN JAVASCRIPT
   WalletWise Warriors
================================== */

// STORAGE

function readStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

let allowance = Number(readStorage("ppAllowance", 5000));

if (!Number.isFinite(allowance) || allowance < 0) {
    allowance = 5000;
}

let transactions = readStorage("ppTransactions", []);

if (!Array.isArray(transactions)) {
    transactions = [];
}

let savingsGoal = readStorage("ppSavingsGoal", {
    name: "My Savings",
    target: 10000,
    saved: 0
});

if (!savingsGoal || typeof savingsGoal !== "object") {
    savingsGoal = { name: "My Savings", target: 10000, saved: 0 };
}

let overviewChart = null;
let categoryChart = null;


// DATE HELPERS

function localDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset)
        .toISOString().slice(0, 10);
}

function currentMonth() {
    return localDate().slice(0, 7);
}

function isCurrentMonth(date) {
    return date.slice(0, 7) === currentMonth();
}


// SAVE DATA

function saveData() {
    localStorage.setItem("ppAllowance", JSON.stringify(allowance));
    localStorage.setItem("ppTransactions", JSON.stringify(transactions));
    localStorage.setItem("ppSavingsGoal", JSON.stringify(savingsGoal));
}


// MONEY FORMAT

function money(value) {
    return "₹" + Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// CALCULATIONS

function totals(list = transactions) {

    const income = list
        .filter(t => t.type === "Income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = list
        .filter(t => t.type === "Expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
        income,
        expenses,
        balance: allowance + income - expenses
    };
}

function monthlyTransactions() {
    return transactions.filter(t => isCurrentMonth(t.date));
}


// NOTIFICATION

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// ADD TRANSACTION

document.getElementById("transactionForm")
    .addEventListener("submit", function(event) {

    event.preventDefault();

    const merchant = document.getElementById("merchant").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const category = document.getElementById("category").value;
    const payment = document.getElementById("payment").value;
    const date = document.getElementById("date").value;

    if (!merchant || !Number.isFinite(amount) || amount <= 0 || !date) {
        showToast("Please enter valid transaction details.");
        return;
    }

    if (date > localDate()) {
        showToast("Future transaction dates are not allowed.");
        return;
    }

    transactions.push({
        id: Date.now() + Math.random(),
        merchant,
        amount,
        type,
        category,
        payment,
        date
    });

    saveData();

    this.reset();

    document.getElementById("date").value = localDate();

    updateDashboard();

    showToast("Transaction added successfully!");
});


// DELETE TRANSACTION

function deleteTransaction(id) {

    if (!confirm("Are you sure you want to delete this transaction?")) {
        return;
    }

    transactions = transactions.filter(t => t.id !== id);

    saveData();
    updateDashboard();

    showToast("Transaction deleted.");
}


// SAVE ALLOWANCE

function saveAllowance() {

    const value = Number(
        document.getElementById("allowanceInput").value
    );

    if (!Number.isFinite(value) || value < 0) {
        showToast("Enter a valid monthly budget.");
        return;
    }

    allowance = value;

    saveData();
    updateDashboard();

    document.getElementById("allowanceInput").value = "";

    showToast("Monthly budget updated!");
}


// SAVINGS GOAL

function saveGoal() {

    const name = document.getElementById("goalInput").value.trim();
    const target = Number(document.getElementById("targetInput").value);
    const saved = Number(document.getElementById("savedInput").value);

    if (!name || !Number.isFinite(target) || target <= 0 ||
        !Number.isFinite(saved) || saved < 0) {

        showToast("Please enter valid savings details.");
        return;
    }

    if (saved > target) {
        showToast("Saved amount cannot exceed the target.");
        return;
    }

    savingsGoal = {
        name,
        target,
        saved
    };

    saveData();
    updateDashboard();

    document.getElementById("goalInput").value = "";
    document.getElementById("targetInput").value = "";
    document.getElementById("savedInput").value = "";

    showToast("Savings goal updated!");
}


// UPDATE DASHBOARD

function updateDashboard() {

    const t = totals();

    document.getElementById("balance").textContent =
        money(t.balance);

    document.getElementById("income").textContent =
        money(t.income);

    document.getElementById("expenses").textContent =
        money(t.expenses);

    document.getElementById("allowanceText").textContent =
        money(allowance);

    updateBudget();
    updateSavings();
    updateReport();
    renderTransactions();
    updateInsights();
    updateCharts();
}


// BUDGET TRACKER

function updateBudget() {

    const monthExpenses = monthlyTransactions()
        .filter(t => t.type === "Expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    document.getElementById("budgetSpent").textContent =
        money(monthExpenses);

    document.getElementById("budgetTotal").textContent =
        money(allowance);

    const percentage = allowance > 0
        ? (monthExpenses / allowance) * 100
        : (monthExpenses > 0 ? 100 : 0);

    document.getElementById("budgetProgress").style.width =
        Math.min(percentage, 100) + "%";

    const message = document.getElementById("budgetMessage");

    if (allowance === 0 && monthExpenses > 0) {
        message.textContent = "Set a budget to monitor your spending.";
        message.style.color = "var(--danger)";
    } else if (allowance === 0) {
        message.textContent = "Set your monthly budget to get started.";
        message.style.color = "var(--muted)";
    } else if (percentage >= 100) {
        message.textContent = "Warning! You have reached your budget limit.";
        message.style.color = "var(--danger)";
    } else if (percentage >= 80) {
        message.textContent = "Careful! You have used " +
            percentage.toFixed(0) + "% of your budget.";
        message.style.color = "var(--orange)";
    } else {
        message.textContent = "You have used " +
            percentage.toFixed(0) + "% of your monthly budget.";
        message.style.color = "var(--green)";
    }
}


// SAVINGS DISPLAY

function updateSavings() {

    document.getElementById("goalName").textContent =
        savingsGoal.name;

    document.getElementById("savedAmount").textContent =
        money(savingsGoal.saved);

    document.getElementById("targetAmount").textContent =
        money(savingsGoal.target);

    const percentage =
        (savingsGoal.saved / savingsGoal.target) * 100;

    document.getElementById("savingsProgress").style.width =
        Math.min(percentage, 100) + "%";

    const message = document.getElementById("savingsMessage");

    if (percentage >= 100) {
        message.textContent = "Congratulations! Your savings goal is complete.";
    } else {
        message.textContent =
            percentage.toFixed(0) + "% completed. " +
            money(savingsGoal.target - savingsGoal.saved) +
            " more to reach your goal.";
    }
}


// MONTHLY REPORT

function updateReport() {

    const monthData = monthlyTransactions();

    const income = monthData
        .filter(t => t.type === "Income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = monthData
        .filter(t => t.type === "Expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    document.getElementById("monthIncome").textContent =
        money(income);

    document.getElementById("monthExpenses").textContent =
        money(expenses);

    document.getElementById("monthCount").textContent =
        monthData.length;
}


// TRANSACTION HISTORY AND FILTERS

function renderTransactions() {

    const search = document.getElementById("search")
        .value.toLowerCase().trim();

    const typeFilter = document.getElementById("filterType").value;

    const categoryFilter =
        document.getElementById("filterCategory").value;

    const tbody = document.getElementById("transactionList");

    tbody.innerHTML = "";

    const filtered = transactions
        .filter(t => {

            const matchesSearch =
                t.merchant.toLowerCase().includes(search);

            const matchesType =
                typeFilter === "All" || t.type === typeFilter;

            const matchesCategory =
                categoryFilter === "All" ||
                t.category === categoryFilter;

            return matchesSearch && matchesType && matchesCategory;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

    if (!filtered.length) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "empty";
        cell.textContent = "No matching transactions found.";

        row.appendChild(cell);
        tbody.appendChild(row);

        return;
    }

    filtered.forEach(t => {

        const row = document.createElement("tr");

        const values = [
            t.merchant,
            t.category,
            t.date,
            t.payment,
            t.type,
            (t.type === "Income" ? "+ " : "- ") + money(t.amount)
        ];

        values.forEach((value, index) => {

            const cell = document.createElement("td");

            cell.textContent = value;

            if (index === 4 || index === 5) {
                cell.style.color =
                    t.type === "Income"
                        ? "var(--green)"
                        : "var(--orange-light)";
            }

            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const button = document.createElement("button");

        button.className = "delete-btn";
        button.textContent = "Delete";

        button.addEventListener("click", () => {
            deleteTransaction(t.id);
        });

        actionCell.appendChild(button);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });
}


// SMART SPENDING INSIGHTS

function updateInsights() {

    const container = document.getElementById("insights");
    container.innerHTML = "";

    const monthData = monthlyTransactions();

    const expenses = monthData.filter(t => t.type === "Expense");

    const totalSpent = expenses.reduce(
        (sum, t) => sum + Number(t.amount), 0
    );

    const categoryTotals = {};

    expenses.forEach(t => {
        categoryTotals[t.category] =
            (categoryTotals[t.category] || 0) + Number(t.amount);
    });

    const highest = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

    const tips = [];

    if (expenses.length === 0) {

        tips.push({
            title: "Start Tracking",
            text: "Add your first expense to see personalized spending insights.",
            success: true
        });

    } else {

        if (highest) {
            tips.push({
                title: "Highest Spending Category",
                text: highest[0] + " accounts for " +
                    money(highest[1]) + " of your expenses."
            });
        }

        if (allowance > 0) {

            const percentage = (totalSpent / allowance) * 100;

            if (percentage >= 100) {
                tips.push({
                    title: "Budget Alert",
                    text: "Your monthly spending has reached or exceeded your budget."
                });
            } else if (percentage >= 80) {
                tips.push({
                    title: "Watch Your Spending",
                    text: "You have used " + percentage.toFixed(0) +
                        "% of your monthly budget."
                });
            } else {
                tips.push({
                    title: "Budget Status",
                    text: "Your spending is currently within your monthly budget.",
                    success: true
                });
            }
        }

        if (expenses.length >= 3) {
            tips.push({
                title: "Good Tracking Habit",
                text: "You have recorded " + expenses.length +
                    " expenses this month. Keep tracking regularly.",
                success: true
            });
        }

        if (highest && highest[1] > 0 && totalSpent > 0) {
            const share = (highest[1] / totalSpent) * 100;

            if (share >= 50) {
                tips.push({
                    title: "Spending Pattern",
                    text: "More than half of your expenses are in " +
                        highest[0] + ". Review this category if needed."
                });
            }
        }
    }

    tips.slice(0, 4).forEach(tip => {

        const box = document.createElement("div");
        box.className = "insight" +
            (tip.success ? " success" : "");

        const title = document.createElement("b");
        title.textContent = tip.title;

        const text = document.createElement("p");
        text.textContent = tip.text;

        box.append(title, text);
        container.appendChild(box);
    });
}


// CHARTS

function updateCharts() {

    if (typeof Chart === "undefined") {
        showToast("Charts need an internet connection.");
        return;
    }

    const monthData = monthlyTransactions();

    const income = monthData
        .filter(t => t.type === "Income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = monthData
        .filter(t => t.type === "Expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = allowance + income - expenses;

    const styles = getComputedStyle(document.body);

    const muted = styles.getPropertyValue("--muted").trim();
    const border = styles.getPropertyValue("--border").trim();

    // FINANCIAL OVERVIEW

    if (overviewChart) {
        overviewChart.destroy();
    }

    overviewChart = new Chart(
        document.getElementById("overviewChart"),
        {
            type: "bar",

            data: {
                labels: ["Income", "Expenses", "Available Balance"],

                datasets: [{
                    label: "Amount",
                    data: [income, expenses, balance],

                    backgroundColor: [
                        "#70d69b",
                        "#f47b26",
                        "#b66a3c"
                    ],

                    borderRadius: 7,
                    barThickness: 45
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    }
                },

                scales: {
                    x: {
                        ticks: { color: muted },
                        grid: { display: false }
                    },

                    y: {
                        beginAtZero: true,
                        ticks: { color: muted },
                        grid: { color: border }
                    }
                }
            }
        }
    );


    // CATEGORY BREAKDOWN

    const categories = [
        "Food",
        "Books",
        "Rent",
        "Entertainment",
        "Transport",
        "Utilities",
        "Education",
        "Other"
    ];

    const categoryValues = categories.map(category => {

        return monthData
            .filter(t =>
                t.category === category &&
                t.type === "Expense"
            )
            .reduce((sum, t) => sum + Number(t.amount), 0);
    });

    const usedCategories = categories.filter((category, index) =>
        categoryValues[index] > 0
    );

    const usedValues = categoryValues.filter(value => value > 0);

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(
        document.getElementById("categoryChart"),
        {
            type: "doughnut",

            data: {
                labels: usedCategories.length
                    ? usedCategories
                    : ["No Expenses"],

                datasets: [{
                    data: usedValues.length
                        ? usedValues
                        : [1],

                    backgroundColor: usedValues.length
                        ? [
                            "#f47b26",
                            "#70d69b",
                            "#c26b34",
                            "#8e4c2c",
                            "#e4b16b",
                            "#9877c6",
                            "#4d9eaa",
                            "#b65c75"
                        ]
                        : ["#55463c"],

                    borderWidth: 2,
                    borderColor: styles.getPropertyValue("--panel").trim()
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: muted,
                            padding: 14,
                            usePointStyle: true
                        }
                    }
                },

                cutout: "68%"
            }
        }
    );
}


// CSV EXPORT

function exportCSV() {

    if (!transactions.length) {
        showToast("No transactions available to export.");
        return;
    }

    const rows = [
        [
            "Description",
            "Amount",
            "Type",
            "Category",
            "Payment",
            "Date"
        ],

        ...transactions.map(t => [
            t.merchant,
            t.amount,
            t.type,
            t.category,
            t.payment,
            t.date
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value).replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "PaisaPilot_Report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showToast("CSV report downloaded!");
}


// DARK / LIGHT THEME

const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {

    document.body.classList.toggle("light", theme === "light");

    themeToggle.innerHTML = theme === "light"
        ? "☾ <span>Dark Mode</span>"
        : "☼ <span>Light Mode</span>";

    localStorage.setItem("ppTheme", theme);

    if (transactions.length >= 0) {
        updateCharts();
    }
}

themeToggle.addEventListener("click", () => {

    const nextTheme = document.body.classList.contains("light")
        ? "dark"
        : "light";

    applyTheme(nextTheme);
});


// NAVIGATION ACTIVE STATE

document.querySelectorAll(".nav").forEach(link => {

    link.addEventListener("click", () => {

        document.querySelectorAll(".nav").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});


// INITIALIZE PROJECT

document.getElementById("date").value = localDate();

const savedTheme = localStorage.getItem("ppTheme") || "dark";

document.body.classList.toggle("light", savedTheme === "light");

applyTheme(savedTheme);

updateDashboard();
