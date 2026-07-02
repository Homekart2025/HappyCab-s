let drivers = JSON.parse(localStorage.getItem("drivers")) || [];
let currentDriver = null;

window.onload = () => {
    showPage("homePage"); 
    renderDrivers();
    updateDashboard();
    
    const localDate = new Date().toLocaleDateString('sv').split(' ')[0];
    document.getElementById("summaryStart").value = localDate;
    document.getElementById("summaryEnd").value = localDate;
};

function toggleMenu() {
    const menu = document.getElementById("sideMenu");
    const overlay = document.getElementById("menuOverlay");
    
    if (!menu.classList.contains("active")) {
        overlay.style.display = "block";
        setTimeout(() => {
            menu.classList.add("active");
            overlay.classList.add("active");
        }, 10);
    } else {
        menu.classList.remove("active");
        overlay.classList.remove("active");
        setTimeout(() => {
            overlay.style.display = "none";
        }, 350);
    }
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => { page.style.display = "none"; });
    const activePage = document.getElementById(pageId);
    if (activePage) activePage.style.display = "block";
    
    const menu = document.getElementById("sideMenu");
    if (menu && menu.classList.contains("active")) { toggleMenu(); }
}

function saveDriver() {
    const name = document.getElementById("driverName").value.trim();
    const phone = document.getElementById("driverPhone").value.trim();

    if (!name || !phone) { alert("Enter Driver Name & Phone"); return; }

    drivers.push({ 
        id: Date.now(), 
        name: name, 
        phone: phone, 
        bills: [],
        ledgerBalance: 0,
        fuelVariations: 0,
        vehicleExpenses: 0,
        billAmountCollected: 0,
        dailyOfficeAdvance: 0
    });
    localStorage.setItem("drivers", JSON.stringify(drivers));

    document.getElementById("driverName").value = "";
    document.getElementById("driverPhone").value = "";

    renderDrivers();
    updateDashboard();
    showPage("homePage");
}

function renderDrivers() {
    const container = document.getElementById("driverCards");
    if (!container) return;
    container.innerHTML = "";

    if (drivers.length === 0) {
        container.innerHTML = "<p style='padding:20px; color:#6d7175; text-align:center; font-size:14px;'>No Drivers Added Yet</p>";
        return;
    }

    drivers.forEach(driver => {
        container.innerHTML += `
        <div class="driver-card" onclick="openDriverMenu(${driver.id})">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-weight:600;">${driver.name}</h3>
                <span onclick="event.stopPropagation(); deleteDriver(${driver.id})" style="color:#d82c0d; font-size:20px; cursor:pointer; padding:4px;">🗑️</span>
            </div>
            <p>📱 ${driver.phone}</p>
        </div>`;
    });
}

function openDriverMenu(id) {
    currentDriver = drivers.find(d => d.id === id);
    if (!currentDriver) return;

    if (currentDriver.ledgerBalance === undefined) currentDriver.ledgerBalance = 0;
    if (currentDriver.fuelVariations === undefined) currentDriver.fuelVariations = 0;
    if (currentDriver.vehicleExpenses === undefined) currentDriver.vehicleExpenses = 0;
    if (currentDriver.billAmountCollected === undefined) currentDriver.billAmountCollected = 0;
    if (currentDriver.dailyOfficeAdvance === undefined) currentDriver.dailyOfficeAdvance = 0;

    document.getElementById("menuDriverTitle").innerText = currentDriver.name;
    document.getElementById("menuDriverPhoneText").innerText = "📱 Phone: " + currentDriver.phone;

    showPage("driverMenuPage");
}

function openCreateBill() {
    if (!currentDriver) return;

    document.getElementById("driverTitle").innerText = currentDriver.name;
    document.getElementById("driverPhoneText").innerText = "📱 Phone: " + currentDriver.phone;
    
    document.getElementById("vehicleNumber").value = "";
    
    const localDate = new Date().toLocaleDateString('sv').split(' ')[0];
    document.getElementById("weekStart").value = localDate;
    document.getElementById("weekEnd").value = localDate;

    let savedLedgerBal = parseFloat(currentDriver.ledgerBalance) || 0;
    document.getElementById("oldBalance").value = parseFloat(savedLedgerBal.toFixed(2));
    
    document.getElementById("fuelVariations").value = currentDriver.fuelVariations || 0;
    document.getElementById("vehicleExpenses").value = currentDriver.vehicleExpenses || 0;
    
    let totalCollected = (parseFloat(currentDriver.billAmountCollected) || 0) + (parseFloat(currentDriver.dailyOfficeAdvance) || 0);
    document.getElementById("amountCollected").value = totalCollected;

    const fields = ["tripCount", "cashCollection", "totalEarnings", "drivePass", "toll", "insurance", "trafficFine", "dailyRent", "additionalRent", "billRedemption"];
    fields.forEach(f => { const el = document.getElementById(f); if(el) el.value = ""; });
    
    document.getElementById("billResult").innerHTML = "";
    window.currentBill = null; 

    showPage("driverPage");
    setupInputListeners();
}

function openBillDetails() {
    const localDate = new Date().toLocaleDateString('sv').split(' ')[0];
    document.getElementById("historyFilterStart").value = localDate;
    document.getElementById("historyFilterEnd").value = localDate;
    loadBillHistory();
    showPage("billDetailsPage");
}

function openPaymentsLedger() {
    if (!currentDriver) return;
    
    document.getElementById("ledgerCurrentBalance").innerText = "₹" + (currentDriver.ledgerBalance || 0).toFixed(2);
    document.getElementById("ledgerCurrentAdvance").innerText = "₹" + (currentDriver.dailyOfficeAdvance || 0).toFixed(2);
    
    document.getElementById("ledgerFuel").value = "";
    document.getElementById("ledgerVehicleExpense").value = "";
    document.getElementById("ledgerBillCollected").value = "";
    document.getElementById("ledgerDailyAdvance").value = "";

    showPage("paymentsLedgerPage");
}

function liveUpdateLedgerDisplay() {
    if (!currentDriver) return;
    
    let baseBalance = parseFloat(currentDriver.ledgerBalance) || 0;
    let typedCollected = parseFloat(document.getElementById("ledgerBillCollected").value) || 0;
    
    let liveRemainingBalance = baseBalance + typedCollected;
    
    let baseAdvance = parseFloat(currentDriver.dailyOfficeAdvance) || 0;
    let typedAdvance = parseFloat(document.getElementById("ledgerDailyAdvance").value) || 0;
    let liveTotalAdvance = baseAdvance + typedAdvance;

    document.getElementById("ledgerCurrentBalance").innerText = "₹" + liveRemainingBalance.toFixed(2);
    document.getElementById("ledgerCurrentAdvance").innerText = "₹" + liveTotalAdvance.toFixed(2);
}

function saveLedgerEntry() {
    if (!currentDriver) return;

    let typedFuel = parseFloat(document.getElementById("ledgerFuel").value) || 0;
    let typedExpense = parseFloat(document.getElementById("ledgerVehicleExpense").value) || 0;
    let typedCollected = parseFloat(document.getElementById("ledgerBillCollected").value) || 0;
    let typedAdvance = parseFloat(document.getElementById("ledgerDailyAdvance").value) || 0;

    currentDriver.fuelVariations = (currentDriver.fuelVariations || 0) + typedFuel;
    currentDriver.vehicleExpenses = (currentDriver.vehicleExpenses || 0) + typedExpense;
    
    let netBalance = (currentDriver.ledgerBalance || 0) + typedCollected;
    currentDriver.ledgerBalance = parseFloat(netBalance.toFixed(2));
    
    currentDriver.dailyOfficeAdvance = (currentDriver.dailyOfficeAdvance || 0) + typedAdvance;

    localStorage.setItem("drivers", JSON.stringify(drivers));
    
    document.getElementById("ledgerCurrentBalance").innerText = "₹" + currentDriver.ledgerBalance.toFixed(2);
    document.getElementById("ledgerCurrentAdvance").innerText = "₹" + currentDriver.dailyOfficeAdvance.toFixed(2);

    document.getElementById("ledgerFuel").value = "";
    document.getElementById("ledgerVehicleExpense").value = "";
    document.getElementById("ledgerBillCollected").value = "";
    document.getElementById("ledgerDailyAdvance").value = "";

    alert("Ledger Balance and Daily Advance saved successfully!");
    showPage("driverMenuPage");
}

function updateDashboard() {
    const totalDrivers = document.getElementById("totalDrivers");
    if (totalDrivers) totalDrivers.innerText = drivers.length;
}

function handleInputChange() {
    window.currentBill = null;
    const billResult = document.getElementById("billResult");
    if (billResult && billResult.innerHTML !== "" && !billResult.innerHTML.includes("Inputs changed")) {
        billResult.innerHTML = "<p style='text-align:center; color:#6d7175; font-size:13px; margin-top:10px;'>⚠️ Inputs changed. Click Calculate again.</p>";
    }
}

function setupInputListeners() {
    const inputs = document.querySelectorAll("#driverPage input");
    inputs.forEach(input => {
        input.oninput = handleInputChange; 
    });
}

function calculateBill() {
    if (!currentDriver) return;

    let vehicleNum = document.getElementById("vehicleNumber").value.trim().toUpperCase() || "N/A";
    let dateFrom = document.getElementById("weekStart").value;
    let dateUpTo = document.getElementById("weekEnd").value;
    
    let formattedFrom = dateFrom ? new Date(dateFrom).toLocaleDateString() : "-";
    let formattedUpTo = dateUpTo ? new Date(dateUpTo).toLocaleDateString() : "-";

    let trips = parseFloat(document.getElementById("tripCount").value) || 0;
    let cash = parseFloat(document.getElementById("cashCollection").value) || 0;
    let earnings = parseFloat(document.getElementById("totalEarnings").value) || 0;
    let drivePass = parseFloat(document.getElementById("drivePass").value) || 0;
    let toll = parseFloat(document.getElementById("toll").value) || 0;
    let insurance = parseFloat(document.getElementById("insurance").value) || 0;
    let fine = parseFloat(document.getElementById("trafficFine").value) || 0;
    let rent = parseFloat(document.getElementById("dailyRent").value) || 0;
    let oldBal = parseFloat(document.getElementById("oldBalance").value) || 0;
    let additionalRent = parseFloat(document.getElementById("additionalRent").value) || 0;
    let redemption = parseFloat(document.getElementById("billRedemption").value) || 0;
    
    let fuelVar = parseFloat(document.getElementById("fuelVariations").value) || 0;
    let vehExp = parseFloat(document.getElementById("vehicleExpenses").value) || 0;
    let collected = parseFloat(document.getElementById("amountCollected").value) || 0;

    let variation = cash - earnings;
    let totalBill = variation + drivePass + insurance + fine + rent + oldBal + additionalRent + fuelVar + vehExp - toll - redemption;
    let finalBalance = totalBill - collected;
    let displayRefund = Math.abs(finalBalance);

    window.currentBill = {
        vehicleNum, dateFrom: formattedFrom, dateUpTo: formattedUpTo, rawDateFrom: dateFrom, rawDateUpTo: dateUpTo,
        trips, cash, earnings, variation, drivePass, toll, insurance, fine, rent, oldBalance: oldBal, 
        additionalRent, redemption, fuelVariations: fuelVar, vehicleExpenses: vehExp, collected, totalBill, finalBalance
    };

    let statusHTML = "";
    if (finalBalance > 0) {
        statusHTML = `
            <div style="background:#fbeae5; color:#d82c0d; border: 1px solid #f7d2ca; padding: 12px; border-radius: 8px; font-size:15px; font-weight:bold; display:flex; align-items:center; justify-content:center; width:100%; box-sizing:border-box;">
                ⚠️ Driver owes Office: ₹${finalBalance.toFixed(2)}
            </div>`;
    } else if (finalBalance < 0) {
        statusHTML = `
            <div style="background:#e3f1df; color:#008060; border: 1px solid #cbe5c3; padding: 12px; border-radius: 8px; font-size:15px; font-weight:bold; display:flex; align-items:center; justify-content:center; width:100%; box-sizing:border-box;">
                ✅ Office owes Driver: ₹${displayRefund.toFixed(2)}
            </div>`;
    } else {
        statusHTML = `
            <div style="background:#f1f2f4; color:#202223; padding: 12px; border-radius: 8px; font-size:15px; font-weight:bold; text-align:center; width:100%; box-sizing:border-box;">
                💥 Account Settled
            </div>`;
    }

    document.getElementById("billResult").innerHTML = `
        <div id="invoiceCapture" style="padding: 24px; background: #ffffff; color: #202223; border-radius: 12px; font-family: Arial, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.08); width: 100%; max-width: 500px; margin: 15px auto; border: 1px solid #e1e3e5; box-sizing: border-box;">
            <div style="text-align:center; margin-bottom: 20px; border-bottom: 2px solid #202223; padding-bottom: 10px;">
                <h2 style="margin:0; color:#008060; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">HAPPY CAB'S</h2>
                <p style="margin:4px 0 0 0; color:#6d7175; font-size:11px; text-transform: uppercase; font-weight:bold; letter-spacing:1px;">Official Digital Invoice</p>
            </div>
            
            <div style="font-size:14px; margin-bottom:20px; background:#f1f2f4; padding:15px; border-radius:8px; line-height:1.6; color:#202223;">
                <b>Driver Name:</b> ${currentDriver.name}<br>
                <b>Vehicle No:</b> ${vehicleNum}<br>
                <b>Phone No:</b> ${currentDriver.phone}<br>
                <b>Statement Period:</b> ${formattedFrom} to ${formattedUpTo}
            </div>

            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Total Trips:</span> <b>${trips}</b></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Cash Collection:</span> <span>₹${cash.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Total Earnings:</span> <span>₹${earnings.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Uber Variation:</span> <b>₹${variation.toFixed(2)}</b></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Drive Pass:</span> <span>₹${drivePass.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Traffic Fine:</span> <span>₹${fine.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Insurance:</span> <span>₹${insurance.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#e34a31; font-weight:600;"><span>Toll Deductions (-):</span> <span style="color:#e34a31;">₹${toll.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Daily Rent:</span> <span>₹${rent.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Old Balance:</span> <span>₹${oldBal.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#e34a31; font-weight:600;"><span>Bill Redemption (-):</span> <span style="color:#e34a31;">₹${redemption.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Additional Rent:</span> <span>₹${additionalRent.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Fuel Variations (+):</span> <span>₹${fuelVar.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Vehicle Expenses (+):</span> <span>₹${vehExp.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#6d7175;"><span>Amount Collected:</span> <span style="color:#6d7175;">₹${collected.toFixed(2)}</span></div>
            
            <div style="display:flex; justify-content:space-between; padding:12px 0 4px 0; font-size:1.5rem; font-weight:800; color:#202223; border-top:2px solid #202223; margin-top:10px;">
                <span>TOTAL BILL:</span> 
                <span>₹${totalBill.toFixed(2)}</span>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#6d7175;">
                <span>Advance/Collected:</span> 
                <span>₹${collected.toFixed(2)}</span>
            </div>
            
            <div style="margin-top:15px; width:100%;">
                ${statusHTML}
            </div>
        </div>
    `;
}

function saveBill() {
    if (!currentDriver || !window.currentBill) { alert("Please Calculate Bill First"); return; }
    
    currentDriver.ledgerBalance = window.currentBill.finalBalance;
    
    currentDriver.fuelVariations = 0;
    currentDriver.vehicleExpenses = 0;
    currentDriver.billAmountCollected = 0;
    currentDriver.dailyOfficeAdvance = 0;

    currentDriver.bills.push({ date: new Date().toLocaleDateString(), ...window.currentBill });
    localStorage.setItem("drivers", JSON.stringify(drivers));
}

function loadBillHistory() {
    const history = document.getElementById("billHistory");
    const totalSummaryDiv = document.getElementById("billHistoryTotalSummary");
    if (!history) return;
    history.innerHTML = "";
    
    if (!currentDriver || !currentDriver.bills || currentDriver.bills.length === 0) {
        totalSummaryDiv.innerHTML = "No bills found.";
        return;
    }

    let filterStart = document.getElementById("historyFilterStart").value;
    let filterEnd = document.getElementById("historyFilterEnd").value;

    let filteredBills = currentDriver.bills.filter(b => {
        if(!filterStart || !filterEnd) return true;
        return b.rawDateFrom >= filterStart && b.rawDateUpTo <= filterEnd;
    });

    let sumTrips = 0, sumCash = 0, sumEarnings = 0, sumTotalBill = 0, sumFinalBalance = 0;

    filteredBills.slice().reverse().forEach(bill => {
        sumTrips += (bill.trips || 0);
        sumCash += (bill.cash || 0);
        sumEarnings += (bill.earnings || 0);
        sumTotalBill += (bill.totalBill || 0);
        sumFinalBalance += (bill.finalBalance || 0);

        history.innerHTML += `
        <div class="bill-item">
            <div><b>📅 Date:</b> ${bill.dateFrom} to ${bill.dateUpTo} | 🚗 ${bill.vehicleNum}</div>
            <div>Trips: ${bill.trips} | Cash: ₹${bill.cash.toFixed(2)} | Earnings: ₹${bill.earnings.toFixed(2)}</div>
            <div>Fuel Var: ₹${(bill.fuelVariations || 0).toFixed(2)} | Veh Exp: ₹${(bill.vehicleExpenses || 0).toFixed(2)}</div>
            <div><b>Total Bill:</b> ₹${bill.totalBill.toFixed(2)} | <b>Final Balance:</b> ₹${bill.finalBalance.toFixed(2)}</div>
        </div>`;
    });

    totalSummaryDiv.innerHTML = `
        <b>Total Accumulated Summary (${filteredBills.length} Bills):</b><br>
        Total Trips: ${sumTrips}<br>
        Total Cash Collection: ₹${sumCash.toFixed(2)}<br>
        Total Earnings: ₹${sumEarnings.toFixed(2)}<br>
        Total Bill Amount: ₹${sumTotalBill.toFixed(2)}<br>
        Net Final Balance: ₹${sumFinalBalance.toFixed(2)}
    `;
}

function renderControlPanelSummary() {
    const container = document.getElementById("controlPanelSummaryResult");
    if(!container) return;
    container.innerHTML = "";

    let start = document.getElementById("summaryStart").value;
    let end = document.getElementById("summaryEnd").value;

    let totalTrips = 0, totalCash = 0, totalEarnings = 0, totalBillAmount = 0;
    let htmlBlock = "";

    drivers.forEach(d => {
        let matchingBills = d.bills.filter(b => {
            if(!start || !end) return true;
            return b.rawDateFrom >= start && b.rawDateUpTo <= end;
        });

        if(matchingBills.length > 0) {
            htmlBlock += `<h3 style="margin-top:10px; color:#008060;">👤 ${d.name}</h3>`;
            matchingBills.forEach(b => {
                totalTrips += (b.trips || 0);
                totalCash += (b.cash || 0);
                totalEarnings += (b.earnings || 0);
                totalBillAmount += (b.totalBill || 0);

                htmlBlock += `
                <div class="bill-item" style="background:#fff;">
                    <b>Period:</b> ${b.dateFrom} - ${b.dateUpTo} | <b>Vehicle:</b> ${b.vehicleNum}<br>
                    Trips: ${b.trips} | Cash: ₹${b.cash.toFixed(2)} | Earnings: ₹${b.earnings.toFixed(2)} | Total Bill: ₹${b.totalBill.toFixed(2)}
                </div>`;
            });
        }
    });

    container.innerHTML = `
        <div style="background:#1e293b; color:white; padding:15px; border-radius:8px; margin-bottom:15px; font-size:14px;">
            <b>All Drivers Cumulative Summary:</b><br>
            Combined Trips: ${totalTrips}<br>
            Combined Cash: ₹${totalCash.toFixed(2)}<br>
            Combined Earnings: ₹${totalEarnings.toFixed(2)}<br>
            Combined Total Bills: ₹${totalBillAmount.toFixed(2)}
        </div>
        ${htmlBlock || '<p style="text-align:center;color:#64748b;">No bills found for selected dates.</p>'}
    `;
}

// AUTOMATICALLY SAVES THE BILL WHEN WHATSAPP BUTTON IS CLICKED
function sendWhatsAppBill() {
    if (!window.currentBill || !currentDriver) { alert("Please calculate the bill first!"); return; }
    
    // Automatically saves data logs and resets temporary fields to 0
    saveBill();

    const invoiceElement = document.getElementById("invoiceCapture");
    if (!invoiceElement) return;

    html2canvas(invoiceElement, { 
        scale: 3, 
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
    }).then(canvas => {
        canvas.toBlob(blob => {
            const file = new File([blob], `Bill_${currentDriver.name.replace(/\s+/g, '_')}.png`, { type: "image/png" });
            const b = window.currentBill;
            
            let statusText = "";
            if (b.finalBalance > 0) {
                statusText = `⚠️ *Driver owes Office:* ₹${b.finalBalance.toFixed(2)}`;
            } else if (b.finalBalance < 0) {
                statusText = `✅ *Office owes Driver:* ₹${Math.abs(b.finalBalance).toFixed(2)}`;
            } else {
                statusText = `💥 *Account Settled*`;
            }

            let msgText = `🚕 *HAPPY CAB’S BILLING*\n\n🙋‍♂️ *Driver:* ${currentDriver.name}\n🚗 *Vehicle:* ${b.vehicleNum}\n📅 *Period:* ${b.dateFrom} to ${b.dateUpTo}\n📋 *TOTAL BILL:* ₹${b.totalBill.toFixed(2)}\n💰 *Advance Received:* ₹${b.collected.toFixed(2)}\n\n${statusText}`;

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Invoice Summary', text: msgText })
                .then(() => {
                     showPage("driverMenuPage");
                })
                .catch(e => console.log(e));
            } else {
                const image = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                document.body.appendChild(downloadLink);
                downloadLink.href = image;
                downloadLink.download = `Bill_${currentDriver.name}.png`;
                downloadLink.click();
                document.body.removeChild(downloadLink);
                alert("Bill Saved Automatically & Image Downloaded! Share it manually via WhatsApp.");
                showPage("driverMenuPage");
            }
        }, "image/png");
    });
}

function exportBackup() {
    const blob = new Blob([JSON.stringify(drivers, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `happy_cabs_backup_${Date.now()}.json`;
    a.click();
}

function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            drivers = JSON.parse(e.target.result);
            localStorage.setItem("drivers", JSON.stringify(drivers));
            renderDrivers();
            updateDashboard();
            alert("Backup Restored!");
        } catch { alert("Invalid File Format"); }
    };
    reader.readAsText(file);
}

function searchDriver() {
    let search = document.getElementById("searchDriver").value.toLowerCase();
    document.querySelectorAll(".driver-card").forEach(card => {
        let name = card.querySelector("h3").innerText.toLowerCase();
        let phone = card.querySelector("p").innerText.toLowerCase();
        card.style.display = (name.includes(search) || phone.includes(search)) ? "" : "none";
    });
}

function clearSearch() {
    document.getElementById("searchDriver").value = "";
    searchDriver();
}

function deleteDriver(id) {
    if (!confirm("Delete Driver? Data logs will be erased permanently.")) return;
    drivers = drivers.filter(d => d.id !== id);
    localStorage.setItem("drivers", JSON.stringify(drivers));
    
    if (currentDriver && currentDriver.id === id) {
        currentDriver = null;
    }

    renderDrivers();
    updateDashboard();
    showPage("homePage");
}

function nextField(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        const inputs = Array.from(document.querySelectorAll("#driverPage input:not([readonly])")); 
        const index = inputs.indexOf(event.target);
        if (index !== -1 && index < inputs.length - 1) inputs[index + 1].focus();
    }
}
