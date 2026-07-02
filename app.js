let drivers = JSON.parse(localStorage.getItem("drivers")) || [];
let currentDriver = null;

window.onload = () => {
    showPage("homePage"); 
    renderDrivers();
    updateDashboard();
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

    drivers.push({ id: Date.now(), name: name, phone: phone, bills: [] });
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
        <div class="driver-card" onclick="openDriver(${driver.id})">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-weight:600;">${driver.name}</h3>
                <span onclick="event.stopPropagation(); deleteDriver(${driver.id})" style="color:#d82c0d; font-size:20px; cursor:pointer; padding:4px;">🗑️</span>
            </div>
            <p>📱 ${driver.phone}</p>
        </div>`;
    });
}

function openDriver(id, preserveBill = false) {
    currentDriver = drivers.find(d => d.id === id);
    if (!currentDriver) return;

    document.getElementById("driverTitle").innerText = currentDriver.name;
    document.getElementById("driverPhoneText").innerText = "📱 Phone: " + currentDriver.phone;
    
    if (!preserveBill) {
        document.getElementById("vehicleNumber").value = "";
        
        const localDate = new Date().toLocaleDateString('sv').split(' ')[0];
        document.getElementById("weekStart").value = localDate;
        document.getElementById("weekEnd").value = localDate;

        const fields = ["tripCount", "cashCollection", "totalEarnings", "drivePass", "toll", "insurance", "trafficFine", "dailyRent", "oldBalance", "additionalRent", "billRedemption", "fuelExpensesField", "officeAdvanceField", "amountCollected"];
        fields.forEach(f => { const el = document.getElementById(f); if(el) el.value = ""; });
        
        document.getElementById("payPreviousBalance").value = 0;
        document.getElementById("payBillReceived").value = 0;
        document.getElementById("payFuelVariations").value = 0;
        document.getElementById("payVehicleExpenses").value = 0;
        document.getElementById("payAmountCollected").value = 0;
        document.getElementById("payOfficeAdvance").value = 0;
        
        document.getElementById("oldBalanceDisplayBox").innerText = "Old Balance View: ₹0.00";
        document.getElementById("historyFilterDate").value = "";
        document.getElementById("dateFilteredBills").innerHTML = "";
        document.getElementById("dateFilteredTotal").innerHTML = "";
        
        document.getElementById("billResult").innerHTML = "";
        window.currentBill = null; 
    }

    showPage("driverPage");
    loadBillHistory();
    setupInputListeners();
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
    // Select normal interactive input fields to protect programmatic updates from breaking input focus
    const interactiveInputs = document.querySelectorAll("#createBillPage input:not([readonly])");
    interactiveInputs.forEach(input => {
        input.oninput = handleInputChange;
    });
}

function syncPaymentsTab() {
    let prevBal = parseFloat(document.getElementById("payPreviousBalance").value) || 0;
    let billRec = parseFloat(document.getElementById("payBillReceived").value) || 0;
    let fuelVar = parseFloat(document.getElementById("payFuelVariations").value) || 0;
    let vehExp = parseFloat(document.getElementById("payVehicleExpenses").value) || 0;
    let officeAdv = parseFloat(document.getElementById("payOfficeAdvance").value) || 0;
    let amtCollected = parseFloat(document.getElementById("payAmountCollected").value) || 0;
    
    let computedOldBalance = prevBal - billRec;
    let totalFuelAndExp = fuelVar + vehExp;
    
    // Safely populates fields without continuous focus stealing or loop glitches
    document.getElementById("oldBalance").value = computedOldBalance;
    document.getElementById("fuelExpensesField").value = totalFuelAndExp;
    document.getElementById("officeAdvanceField").value = officeAdv;
    document.getElementById("amountCollected").value = amtCollected;
    
    document.getElementById("oldBalanceDisplayBox").innerText = `Old Balance View: ₹${computedOldBalance.toFixed(2)}`;
    handleInputChange();
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
    let oldBalance = parseFloat(document.getElementById("oldBalance").value) || 0;
    let additionalRent = parseFloat(document.getElementById("additionalRent").value) || 0;
    let redemption = parseFloat(document.getElementById("billRedemption").value) || 0;
    
    let fuelExpenses = parseFloat(document.getElementById("fuelExpensesField").value) || 0;
    let officeAdvance = parseFloat(document.getElementById("officeAdvanceField").value) || 0;
    let amountCollected = parseFloat(document.getElementById("amountCollected").value) || 0;

    let variation = cash - earnings;
    
    // MATHEMATICALLY PERFECT COMPUTATION LOGIC
    let totalBill = variation + drivePass + insurance + fine + rent + oldBalance + additionalRent + fuelExpenses + officeAdvance - toll - redemption;
    let finalBalance = totalBill - amountCollected;
    let displayRefund = Math.abs(finalBalance);

    window.currentBill = {
        vehicleNum, dateFrom: formattedFrom, dateUpTo: formattedUpTo, dateRaw: dateUpTo || new Date().toLocaleDateString('sv').split(' ')[0], trips, cash, earnings, variation, drivePass, toll, insurance, fine, rent, oldBalance, additionalRent, redemption, fuelExpenses, officeAdvance, amountCollected, totalBill, finalBalance
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
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#e34a31; font-weight:600;"><span>Toll Deductions (-):</span> <span>₹${toll.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Daily Rent:</span> <span>₹${rent.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Old Balance:</span> <span>₹${oldBalance.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#e34a31; font-weight:600;"><span>Bill Redemption (-):</span> <span>₹${redemption.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Additional Rent:</span> <span>₹${additionalRent.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Fuel & Vehicle Exp:</span> <span>₹${fuelExpenses.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5;"><span>Office Advance:</span> <span>₹${officeAdvance.toFixed(2)}</span></div>
            
            <div style="display:flex; justify-content:space-between; padding:12px 0 4px 0; font-size:1.3rem; font-weight:800; color:#202223; border-top:2px solid #202223; margin-top:10px;">
                <span>TOTAL BILL:</span> 
                <span>₹${totalBill.toFixed(2)}</span>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:14px; padding:8px 0; border-bottom:1px dashed #e1e3e5; color:#202223; font-weight:600;">
                <span>Amount Collected (-):</span> 
                <span>₹${amountCollected.toFixed(2)}</span>
            </div>
            
            <div style="margin-top:15px; width:100%;">
                ${statusHTML}
            </div>
        </div>
    `;
}

function saveBill() {
    if (!currentDriver || !window.currentBill) { alert("Please Calculate Bill First"); return; }
    
    currentDriver.bills.push({ 
        id: Date.now(),
        date: new Date().toLocaleDateString(), 
        ...window.currentBill 
    });
    
    localStorage.setItem("drivers", JSON.stringify(drivers));
    loadBillHistory();
    alert("Bill Saved to History Logs!");
}

function loadBillHistory() {
    const history = document.getElementById("billHistory");
    if (!history) return;
    history.innerHTML = "";
    if (!currentDriver || !currentDriver.bills || currentDriver.bills.length === 0) return;

    currentDriver.bills.slice().reverse().forEach(bill => {
        history.innerHTML += `
        <div class="bill-item">
            <span>🚗 ${bill.vehicleNum || 'N/A'} | 📅 ${bill.dateFrom || bill.date}</span>
            <strong>₹${bill.totalBill.toFixed(2)}</strong>
        </div>`;
    });
}

function filterHistoryByDate() {
    const chosenDate = document.getElementById("historyFilterDate").value;
    const recordsBox = document.getElementById("dateFilteredBills");
    const totalsBox = document.getElementById("dateFilteredTotal");
    
    if(!recordsBox || !totalsBox || !currentDriver) return;
    recordsBox.innerHTML = "";
    totalsBox.innerHTML = "";
    
    if(!chosenDate) return;
    
    let localFormat = new Date(chosenDate).toLocaleDateString();
    let matches = currentDriver.bills.filter(b => b.date === localFormat || b.dateRaw === chosenDate);
    
    if(matches.length === 0) {
        recordsBox.innerHTML = "<p style='color:#64748b; font-size:13px;'>No bills found on this date.</p>";
        return;
    }
    
    let sumTotal = 0;
    matches.forEach((bill, index) => {
        sumTotal += bill.totalBill;
        recordsBox.innerHTML += `
            <div style="border:1px solid #cbd5e1; padding:10px; border-radius:6px; margin-bottom:8px; font-size:13px; background:#f8fafc; line-height:1.5;">
                <b>Invoice #${index+1} (${bill.vehicleNum})</b><br>
                Trips: ${bill.trips} | Rent: ₹${bill.rent}<br>
                Collected Field: ₹${bill.amountCollected}<br>
                <strong>Total Bill Amount: ₹${bill.totalBill.toFixed(2)}</strong>
            </div>
        `;
    });
    
    totalsBox.innerHTML = `Total Accumulated Bill Amount: ₹${sumTotal.toFixed(2)}`;
}

function loadControlPanelSummary() {
    const filterDate = document.getElementById("summaryFilterDate").value;
    const container = document.getElementById("summaryResultsContainer");
    if(!container) return;
    container.innerHTML = "";
    
    if(!filterDate) return;
    
    let searchFormat = new Date(filterDate).toLocaleDateString();
    let combinedHTML = "";
    let grandRevenue = 0;
    
    drivers.forEach(driver => {
        let matchingBills = driver.bills.filter(b => b.date === searchFormat || b.dateRaw === filterDate);
        if(matchingBills.length > 0) {
            combinedHTML += `
                <div style="margin-bottom:15px; padding:12px; border:1px solid #94a3b8; border-radius:8px; background:#ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <h4 style="margin:0 0 6px 0; color:#1e293b; font-size:14px;">🙋‍♂️ Driver: ${driver.name}</h4>
            `;
            matchingBills.forEach((bill, idx) => {
                grandRevenue += bill.totalBill;
                combinedHTML += `
                    <div style="font-size:12px; padding:6px 0; border-top:1px dashed #e2e8f0; line-height:1.6; color:#334155;">
                        <b>Car:</b> ${bill.vehicleNum} | <b>Period:</b> ${bill.dateFrom} - ${bill.dateUpTo}<br>
                        <b>Trips:</b> ${bill.trips} | <b>Rent:</b> ₹${bill.rent} | <b>Uber Var:</b> ₹${bill.variation}<br>
                        <b>Old Balance:</b> ₹${bill.oldBalance} | <b>Collected:</b> ₹${bill.amountCollected}<br>
                        <strong>Bill Total: ₹${bill.totalBill.toFixed(2)} | Balance Status: ₹${bill.finalBalance.toFixed(2)}</strong>
                    </div>
                `;
            });
            combinedHTML += `</div>`;
        }
    });
    
    if(combinedHTML === "") {
        container.innerHTML = "<p style='color:#64748b; text-align:center; font-size:13px;'>No entry data found for selected date.</p>";
    } else {
        container.innerHTML = `
            <div style="padding:12px; background:#008060; color:white; border-radius:6px; margin-bottom:12px; font-weight:bold; font-size:14px; text-align:center;">
                System Net Total: ₹${grandRevenue.toFixed(2)}
            </div>
            ${combinedHTML}
        `;
    }
}

function sendWhatsAppBill() {
    if (!window.currentBill || !currentDriver) { alert("Please calculate the bill first!"); return; }
    
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

            let msgText = `🚕 *HAPPY CAB’S BILLING*\n\n🙋‍♂️ *Driver:* ${currentDriver.name}\n🚗 *Vehicle:* ${b.vehicleNum}\n📅 *Period:* ${b.dateFrom} to ${b.dateUpTo}\n📋 *TOTAL BILL:* ₹${b.totalBill.toFixed(2)}\n💰 *Collected Amount:* ₹${b.amountCollected.toFixed(2)}\n\n${statusText}`;

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Invoice Summary', text: msgText }).catch(e => console.log(e));
            } else {
                const image = canvas.toDataURL("image/png");
                const downloadLink = document.createElement("a");
                document.body.appendChild(downloadLink);
                downloadLink.href = image;
                downloadLink.download = `Bill_${currentDriver.name}.png`;
                downloadLink.click();
                document.body.removeChild(downloadLink);
                alert("Bill Image Auto-Saved! Share it manually via WhatsApp.");
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
    if (!confirm("Delete Driver permanently? All saved data logs will be erased.")) return;
    drivers = drivers.filter(d => d.id !== id);
    localStorage.setItem("drivers", JSON.stringify(drivers));
    
    if (currentDriver && currentDriver.id === id) {
        currentDriver = null;
    }

    renderDrivers();
    updateDashboard();
    showPage("homePage");
}

function editDriver(id) {
    const driver = drivers.find(d => d.id === id);
    if (!driver) return;
    const newName = prompt("Driver Name", driver.name);
    const newPhone = prompt("Phone Number", driver.phone);
    if (!newName || !newPhone) return;

    driver.name = newName.trim();
    driver.phone = newPhone.trim();
    localStorage.setItem("drivers", JSON.stringify(drivers));
    renderDrivers();
    updateDashboard();
    openDriver(id, true); 
}

function nextField(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        const inputs = Array.from(document.querySelectorAll("#createBillPage input:not([readonly])")); 
        const index = inputs.indexOf(event.target);
        if (index !== -1 && index < inputs.length - 1) inputs[index + 1].focus();
    }
}