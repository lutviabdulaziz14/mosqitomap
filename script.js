
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";

import {
    ref,
    onValue,
    set,
    update,
    remove
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";

import {
    auth,
    database
} from "./firebase-config.js";

// ==========================================
// MOSQUITOMAP - JAVASCRIPT
// Versi 1.0 - Data Simulasi
// ==========================================



 // ==========================================
 // DATA PERANGKAT DARI FIREBASE
 // ==========================================

let locations = [];

// Data awal hanya digunakan jika database masih kosong.
// Data ini akan dimasukkan satu kali ke Firebase.
const initialLocations = [
    {
        id: "MM-001",
        name: "Area Hutan Produksi",
        lat: -6.2000,
        lng: 106.8166,
        temperature: 30.2,
        humidity: 82,
        status: "Aktif",
        standingWater: "Ditemukan",
        vegetation: "Lebat",
        drainage: "Kurang baik"
    },
    {
        id: "MM-002",
        name: "Area Pertambangan",
        lat: -6.2100,
        lng: 106.8300,
        temperature: 29.5,
        humidity: 76,
        status: "Aktif",
        standingWater: "Tidak ditemukan",
        vegetation: "Sedang",
        drainage: "Baik"
    },
    {
        id: "MM-003",
        name: "Area Perumahan",
        lat: -6.1900,
        lng: 106.8350,
        temperature: 28.1,
        humidity: 68,
        status: "Aktif",
        standingWater: "Tidak ditemukan",
        vegetation: "Rendah",
        drainage: "Baik"
    },
    {
        id: "MM-004",
        name: "Area Genangan Air",
        lat: -6.2150,
        lng: 106.8050,
        temperature: 31.0,
        humidity: 85,
        status: "Aktif",
        standingWater: "Ditemukan",
        vegetation: "Lebat",
        drainage: "Kurang baik"
    }
];

// 2. KLASIFIKASI PRIORITAS SIMULASI

function getPriority(location) {
    const temp = location.temperature;
    const humidity = location.humidity;

    // Ambang ini hanya untuk demonstrasi UI.
    // Belum merupakan model risiko biologis tervalidasi.

    if (temp >= 30 && humidity >= 80) {
        return "Tinggi";
    }

    if (temp >= 28 && humidity >= 70) {
        return "Sedang";
    }

    return "Rendah";
}


// 3. TANGGAL DAN WAKTU

function updateDate() {
    const now = new Date();

    document.getElementById("currentDate").textContent =
        now.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
}

updateDate();


// 4. MENGHITUNG RINGKASAN DASHBOARD

function updateStatistics() {
    const averageTemp =
        locations.reduce((sum, item) => sum + item.temperature, 0)
        / locations.length;

    const averageHumidity =
        locations.reduce((sum, item) => sum + item.humidity, 0)
        / locations.length;

    const highPriority = locations.filter(
        item => getPriority(item) === "Tinggi"
    ).length;

    document.getElementById("averageTemperature").textContent =
        averageTemp.toFixed(1) + "°C";

    document.getElementById("averageHumidity").textContent =
        Math.round(averageHumidity) + "%";

    document.getElementById("activeDevices").textContent =
        locations.filter(item => item.status === "Aktif").length
        + " / " + locations.length;

    document.getElementById("highPriority").textContent =
        highPriority;
}


// 5. MENAMPILKAN DAFTAR PRIORITAS

function renderPriority() {
    const container = document.getElementById("priorityList");

    container.innerHTML = "";

    locations.forEach(item => {
        const priority = getPriority(item);

        const badgeClass = {
            "Rendah": "badge-low",
            "Sedang": "badge-medium",
            "Tinggi": "badge-high"
        }[priority];

        const element = document.createElement("div");

        element.className = "priority-item";

        element.innerHTML = `
            <div class="priority-top">
                <span class="priority-name">${item.name}</span>
                <span class="priority-badge ${badgeClass}">
                    ${priority}
                </span>
            </div>

            <div class="priority-detail">
                Suhu ${item.temperature.toFixed(1)}°C
                &nbsp; | &nbsp;
                Kelembapan ${item.humidity}%
            </div>
        `;

        container.appendChild(element);
    });
}


// 6. INISIALISASI PETA LEAFLET

const map = L.map("map").setView([-6.205, 106.820], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
}).addTo(map);

let mapMarkers = [];


function renderMap() {
    // Hapus marker lama
    mapMarkers.forEach(marker => {
        map.removeLayer(marker);
    });

    mapMarkers = [];

    const priorityFilter = document.getElementById("priorityFilter");

    const selectedPriority = priorityFilter
        ? priorityFilter.value
        : "Semua";

    // Filter lokasi berdasarkan prioritas
    const filteredLocations = locations.filter(item => {
        const latitude = Number(item.latitude ?? item.lat);
        const longitude = Number(item.longitude ?? item.lng);

        // Pastikan koordinat valid
        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            return false;
        }

        const priority = getPriority(item);

        return selectedPriority === "Semua" ||
               priority === selectedPriority;
    });

    const markerCoordinates = [];

    filteredLocations.forEach(item => {

        const latitude = Number(item.latitude ?? item.lat);
        const longitude = Number(item.longitude ?? item.lng);

        const priority = getPriority(item);

        const markerColor = {
            "Rendah": "#27a76a",
            "Sedang": "#e7a52c",
            "Tinggi": "#e24e4e"
        }[priority] || "#27a76a";

        // Membuat ikon marker
        const customIcon = L.divIcon({
            className: "custom-map-marker",
            html: `
                <div style="
                    width: 17px;
                    height: 17px;
                    background: ${markerColor};
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 1px 7px rgba(0,0,0,0.35);
                "></div>
            `,
            iconSize: [17, 17],
            iconAnchor: [8, 8]
        });

        // Membuat titik lokasi
        const marker = L.marker(
            [latitude, longitude],
            { icon: customIcon }
        ).addTo(map);

        // Popup informasi perangkat
        marker.bindPopup(`
            <div style="font-family:Arial; min-width:150px;">
                <strong>${item.name || item.id}</strong>
                <hr>
                ID: ${item.id}<br>
                Suhu: ${Number(item.temperature || 0).toFixed(1)}°C<br>
                Kelembapan: ${Number(item.humidity || 0)}%<br>
                Prioritas: <strong>${priority}</strong><br>
                Status: ${item.status || "Tidak diketahui"}
            </div>
        `);

        // Klik marker untuk menampilkan detail perangkat
        marker.on("click", () => {
            showDeviceDetail(item.id);
        });

        mapMarkers.push(marker);
        markerCoordinates.push([latitude, longitude]);
    });

    // Sesuaikan tampilan peta dengan titik yang tersedia
    if (markerCoordinates.length > 0) {
        map.fitBounds(markerCoordinates, {
            padding: [40, 40],
            maxZoom: 15
        });
    }
}



// 7. MENAMPILKAN TABEL LOKASI

function renderTable(search = "") {
    const table = document.getElementById("locationTable");

    table.innerHTML = "";

    const filteredLocations = locations.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase())
    );

    filteredLocations.forEach(item => {
        const priority = getPriority(item);

        const badgeClass = {
            "Rendah": "badge-low",
            "Sedang": "badge-medium",
            "Tinggi": "badge-high"
        }[priority];

        const row = document.createElement("tr");

        row.innerHTML = `
            <td class="device-id">${item.id}</td>
            <td>${item.name}</td>
            <td>${item.temperature.toFixed(1)}°C</td>
            <td>${item.humidity}%</td>
            <td class="${item.status === "Aktif" ? "status-active" : ""}">
                ● ${item.status}
            </td>
            <td>
                <span class="priority-badge ${badgeClass}">
                    ${priority}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="edit-button"
                            onclick="editDevice('${item.id}')">
                        Edit
                    </button>

                    <button class="delete-button"
                            onclick="deleteDevice('${item.id}')">
                        Hapus
                    </button>
                </div>
            </td>
        `;

        table.appendChild(row);
    });

    if (filteredLocations.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;">
                    Lokasi tidak ditemukan.
                </td>
            </tr>
        `;
    }
}


// 8. GRAFIK SUHU DAN KELEMBAPAN

function createChartData(count) {
    const labels = [];
    const temperatures = [];
    const humidity = [];

    for (let i = 0; i < count; i++) {
        labels.push("Periode " + (i + 1));

        temperatures.push(
            Number((27 + Math.random() * 5).toFixed(1))
        );

        humidity.push(
            Math.round(65 + Math.random() * 25)
        );
    }

    return { labels, temperatures, humidity };
}

const initialChartData = createChartData(6);


 // ==========================================
 // GRAFIK DATA PERANGKAT
 // ==========================================

const environmentChart = new Chart(
    document.getElementById("environmentChart"),
    {
        type: "line",

        data: {
            labels: [],
            datasets: [
                {
                    label: "Suhu (°C)",
                    data: [],
                    borderColor: "#16834b",
                    backgroundColor: "rgba(22,131,75,0.10)",
                    fill: true,
                    tension: 0.35,
                    yAxisID: "y"
                },
                {
                    label: "Kelembapan (%)",
                    data: [],
                    borderColor: "#4295d1",
                    backgroundColor: "rgba(66,149,209,0.08)",
                    fill: false,
                    tension: 0.35,
                    yAxisID: "y1"
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    position: "bottom"
                }
            },

            scales: {
                x: {
                    grid: { display: false },
                    title: {
                        display: true,
                        text: "ID Perangkat"
                    }
                },

                y: {
                    type: "linear",
                    position: "left",
                    min: 20,
                    max: 40,
                    title: {
                        display: true,
                        text: "Suhu (°C)"
                    }
                },

                y1: {
                    type: "linear",
                    position: "right",
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Kelembapan (%)"
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    }
);

function updateEnvironmentChart() {

    environmentChart.data.labels =
        locations.map(item => item.id);

    environmentChart.data.datasets[0].data =
        locations.map(item => item.temperature);

    environmentChart.data.datasets[1].data =
        locations.map(item => item.humidity);

    environmentChart.update();
}



// 9. MENGUBAH PERIODE GRAFIK

document.getElementById("chartPeriod").addEventListener(
    "change",
    function () {
        const count = Number(this.value);
        const data = createChartData(count);

        environmentChart.data.labels = data.labels;
        environmentChart.data.datasets[0].data = data.temperatures;
        environmentChart.data.datasets[1].data = data.humidity;

        environmentChart.update();
    }
);


// 10. PENCARIAN LOKASI

document.getElementById("searchLocation").addEventListener(
    "input",
    function () {
        renderTable(this.value);
    }
);


// 11. REKOMENDASI TINDAKAN


// 11. REKOMENDASI TINDAKAN DINAMIS

function renderRecommendations() {
    const container = document.getElementById("recommendationList");

    container.innerHTML = "";

    // Jika belum ada perangkat
    if (!locations || locations.length === 0) {
        container.innerHTML = `
            <div class="recommendation-item">
                <h4>Belum ada data lokasi</h4>
                <p>Tambahkan perangkat untuk memperoleh rekomendasi tindakan lingkungan.</p>
            </div>
        `;
        return;
    }

    locations.forEach(item => {
        const recommendations = [];

        const temperature = Number(item.temperature);
        const humidity = Number(item.humidity);

        const water = String(item.standing_water || "")
            .toLowerCase().trim();

        const vegetation = String(item.vegetation || "")
            .toLowerCase().trim();

        const drainage = String(item.drainage || "")
            .toLowerCase().trim();

        const priority = getPriority(item);

        // 1. Suhu dan kelembapan
        if (temperature >= 30 && humidity >= 80) {
            recommendations.push({
                tag: "Prioritas Tinggi",
                title: "Lakukan pemeriksaan lingkungan",
                description:
                    "Kombinasi suhu dan kelembapan menunjukkan kondisi yang perlu diperiksa lebih lanjut. Periksa area sekitar untuk menemukan potensi tempat perkembangbiakan nyamuk."
            });
        } else if (humidity >= 80) {
            recommendations.push({
                tag: "Monitoring",
                title: "Periksa area dengan kelembapan tinggi",
                description:
                    "Lakukan pemeriksaan pada area yang lembap, terutama lokasi yang kurang mendapatkan sirkulasi udara."
            });
        }

        // 2. Genangan air
        if (water === "ada" || water === "ya") {
            recommendations.push({
                tag: "Pencegahan",
                title: "Tangani genangan air",
                description:
                    "Identifikasi sumber genangan, kuras atau hilangkan air yang tidak diperlukan, dan tutup wadah penampungan air."
            });
        } else if (water === "tidak") {
            recommendations.push({
                tag: "Pemeliharaan",
                title: "Pertahankan kondisi bebas genangan",
                description:
                    "Lakukan pemeriksaan berkala untuk memastikan tidak muncul genangan air baru di sekitar lokasi."
            });
        } else {
            recommendations.push({
                tag: "Inspeksi",
                title: "Verifikasi kondisi genangan air",
                description:
                    "Data genangan air belum tersedia atau belum diketahui. Lakukan observasi langsung di lapangan."
            });
        }

        // 3. Vegetasi
        if (
            vegetation === "lebat" ||
            vegetation === "tinggi"
        ) {
            recommendations.push({
                tag: "Pemeliharaan",
                title: "Kendalikan pertumbuhan vegetasi",
                description:
                    "Pangkas vegetasi yang terlalu lebat dan bersihkan area yang berpotensi menahan kelembapan."
            });
        } else if (
            vegetation === "sedang" ||
            vegetation === "rendah"
        ) {
            recommendations.push({
                tag: "Monitoring",
                title: "Pantau kondisi vegetasi",
                description:
                    "Pertahankan kebersihan area dan lakukan pemantauan pertumbuhan vegetasi secara berkala."
            });
        }

        // 4. Drainase
        if (
            drainage === "buruk" ||
            drainage === "tidak baik"
        ) {
            recommendations.push({
                tag: "Perbaikan",
                title: "Perbaiki sistem drainase",
                description:
                    "Periksa saluran air, bersihkan sumbatan, dan lakukan perbaikan agar air dapat mengalir dengan baik."
            });
        } else if (drainage === "baik") {
            recommendations.push({
                tag: "Pemeliharaan",
                title: "Pertahankan fungsi drainase",
                description:
                    "Pastikan saluran air tetap bersih dan tidak mengalami penyumbatan."
            });
        } else {
            recommendations.push({
                tag: "Inspeksi",
                title: "Periksa kondisi drainase",
                description:
                    "Lakukan pemeriksaan lapangan untuk memastikan kondisi dan fungsi saluran drainase."
            });
        }

        // Jika tidak ada rekomendasi khusus
        if (recommendations.length === 0) {
            recommendations.push({
                tag: "Monitoring",
                title: "Lanjutkan pemantauan lingkungan",
                description:
                    "Pertahankan pemantauan suhu, kelembapan, dan kondisi lingkungan secara berkala."
            });
        }

        // Membuat kartu rekomendasi per lokasi
        const element = document.createElement("div");
        element.className = "recommendation-item";

        element.innerHTML = `
            <span class="recommendation-tag">
                ${priority}
            </span>

            <h4>${item.name || item.id}</h4>

            <p>
                ID Perangkat: ${item.id}
            </p>

            <hr>

            ${recommendations.map(rec => `
                <div class="recommendation-detail">
                    <span class="recommendation-tag">
                        ${rec.tag}
                    </span>
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                </div>
            `).join("")}
        `;

        container.appendChild(element);
    });
}



// 12. REFRESH DATA SIMULASI


 // ==========================================
 // REFRESH DASHBOARD
 // ==========================================

document.getElementById("refreshButton").addEventListener(
    "click",
    function () {
        // Data utama diperbarui otomatis oleh listener Firebase.
        updateDashboard();

        this.textContent = "✓ Dashboard Diperbarui";

        setTimeout(() => {
            this.textContent = "↻ Refresh Data";
        }, 1200);
    }
);



// 13. NAVIGASI SIDEBAR

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", function () {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");
    });
});


// 14. FUNGSI UPDATE SELURUH DASHBOARD

 function updateDashboard() {
    updateStatistics();
    renderPriority();
    renderMap();

    renderTable(
        document.getElementById("searchLocation").value
    );

    renderRecommendations();
    updateEnvironmentChart();
    renderRecommendations();
}


function showDeviceDetail(deviceId) {

    const item = locations.find(
        device => device.id === deviceId
    );

    if (!item) {
        console.warn("Perangkat tidak ditemukan:", deviceId);
        return;
    }

    const priority = getPriority(item);

    const badgeClass = {
        "Rendah": "badge-low",
        "Sedang": "badge-medium",
        "Tinggi": "badge-high"
    }[priority];

    // Tampilkan panel detail
    document.getElementById("detailEmpty").hidden = true;
    document.getElementById("detailContent").hidden = false;

    // Informasi perangkat
    document.getElementById("detailId").textContent =
        item.id || "-";

    document.getElementById("detailName").textContent =
        item.name || "-";

    document.getElementById("detailStatus").textContent =
        item.status || "Tidak diketahui";

    // Data sensor
    document.getElementById("detailTemperature").textContent =
        Number(item.temperature ?? 0).toFixed(1) + "°C";

    document.getElementById("detailHumidity").textContent =
        Number(item.humidity ?? 0) + "%";

    // Koordinat lokasi
    document.getElementById("detailLatitude").textContent =
        Number.isFinite(Number(item.latitude))
            ? Number(item.latitude).toFixed(4)
            : "-";

    document.getElementById("detailLongitude").textContent =
        Number.isFinite(Number(item.longitude))
            ? Number(item.longitude).toFixed(4)
            : "-";

    // Observasi lingkungan
    document.getElementById("detailWater").textContent =
        item.standing_water || "Tidak diketahui";

    document.getElementById("detailVegetation").textContent =
        item.vegetation || "Tidak diketahui";

    document.getElementById("detailDrainage").textContent =
        item.drainage || "Tidak diketahui";

    // Kategori prioritas
    const priorityElement =
        document.getElementById("detailPriority");

    priorityElement.textContent =
        "Prioritas " + priority;

    priorityElement.className =
        "priority-badge " + badgeClass;

    // Gulir menuju detail perangkat
    document.getElementById("deviceDetail").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}

// Fungsi untuk tombol di dalam popup peta
function selectDevice(deviceId) {
    showDeviceDetail(deviceId);
}

document.getElementById("priorityFilter").addEventListener(
    "change",
    function () {
        renderMap();
    }
);

// ==========================================
// 15. MANAJEMEN DATA PERANGKAT
// ==========================================


 // ==========================================
 // MANAJEMEN DATA PERANGKAT - FIREBASE
 // ==========================================

const deviceModal = document.getElementById("deviceModal");
const deviceForm = document.getElementById("deviceForm");

let editingDeviceId = null;

// MEMBUKA MODAL

function openDeviceModal() {
    deviceModal.classList.add("show");
}

// MENUTUP MODAL

function closeDeviceModal() {
    deviceModal.classList.remove("show");
    deviceForm.reset();

    editingDeviceId = null;

    document.getElementById("deviceId").disabled = false;

    document.getElementById("modalTitle").textContent =
        "Tambah Perangkat";
}

// TOMBOL TAMBAH

document.getElementById("addDeviceButton").addEventListener(
    "click",
    function () {
        closeDeviceModal();
        openDeviceModal();
    }
);

// TOMBOL TUTUP DAN BATAL

document.getElementById("closeModalButton").addEventListener(
    "click",
    closeDeviceModal
);

document.getElementById("cancelModalButton").addEventListener(
    "click",
    closeDeviceModal
);

// EDIT PERANGKAT

function editDevice(deviceId) {

    const item = locations.find(
        device => device.id === deviceId
    );

    if (!item) return;

    editingDeviceId = deviceId;

    document.getElementById("modalTitle").textContent =
        "Edit Perangkat";

    document.getElementById("deviceId").value = item.id;
    document.getElementById("deviceId").disabled = true;

    document.getElementById("deviceName").value = item.name;
    document.getElementById("deviceLatitude").value = item.lat;
    document.getElementById("deviceLongitude").value = item.lng;

    document.getElementById("deviceTemperature").value =
        item.temperature;

    document.getElementById("deviceHumidity").value =
        item.humidity;

    document.getElementById("deviceStatus").value = item.status;

    document.getElementById("deviceWater").value =
        item.standingWater;

    document.getElementById("deviceVegetation").value =
        item.vegetation;

    document.getElementById("deviceDrainage").value =
        item.drainage;

    openDeviceModal();
}

// SIMPAN PERANGKAT KE FIREBASE

deviceForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const id = document.getElementById("deviceId").value
        .trim().toUpperCase();

    const name = document.getElementById("deviceName").value.trim();

    const lat = Number(
        document.getElementById("deviceLatitude").value
    );

    const lng = Number(
        document.getElementById("deviceLongitude").value
    );

    const temperature = Number(
        document.getElementById("deviceTemperature").value
    );

    const humidity = Number(
        document.getElementById("deviceHumidity").value
    );

    if (!/^MM-[A-Z0-9-]+$/.test(id)) {
        alert("Format ID harus diawali MM-, contoh MM-005.");
        return;
    }

    if (!name) {
        alert("Nama lokasi wajib diisi.");
        return;
    }

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        alert("Latitude tidak valid.");
        return;
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        alert("Longitude tidak valid.");
        return;
    }

    if (!Number.isFinite(temperature) ||
        temperature < -40 || temperature > 80) {
        alert("Nilai suhu tidak valid.");
        return;
    }

    if (!Number.isFinite(humidity) ||
        humidity < 0 || humidity > 100) {
        alert("Nilai kelembapan tidak valid.");
        return;
    }

    const duplicate = locations.some(
        item => item.id === id && item.id !== editingDeviceId
    );

    if (duplicate) {
        alert("ID perangkat sudah digunakan.");
        return;
    }

    const deviceData = {
        info: {
            name: name,
            latitude: lat,
            longitude: lng,
            standing_water:
                document.getElementById("deviceWater").value,
            vegetation:
                document.getElementById("deviceVegetation").value,
            drainage:
                document.getElementById("deviceDrainage").value
        },

        current: {
            temperature: temperature,
            humidity: humidity,
            timestamp: Date.now()
        },

        status: document.getElementById("deviceStatus").value
    };

    try {

        if (editingDeviceId) {

            // Memperbarui data perangkat tanpa menghapus history
            await update(
                ref(database, "devices/" + editingDeviceId),
                deviceData
            );

            alert("Data perangkat berhasil diperbarui.");

        } else {

            // Menyimpan perangkat baru
            await set(
                ref(database, "devices/" + id),
                deviceData
            );

            alert("Perangkat berhasil ditambahkan ke Firebase.");
        }

        closeDeviceModal();

    } catch (error) {

        console.error("Gagal menyimpan perangkat:", error);

        alert("Gagal menyimpan data. Periksa koneksi dan aturan Firebase.");
    }
});

// HAPUS PERANGKAT

async function deleteDevice(deviceId) {

    const item = locations.find(
        device => device.id === deviceId
    );

    if (!item) return;

    const confirmation = confirm(
        "Apakah Anda yakin ingin menghapus perangkat " +
        item.id + " - " + item.name + "?"
    );

    if (!confirmation) return;

    try {

        await remove(
            ref(database, "devices/" + deviceId)
        );

        alert("Perangkat berhasil dihapus dari Firebase.");

    } catch (error) {

        console.error("Gagal menghapus perangkat:", error);

        alert("Gagal menghapus data perangkat.");
    }
}

// Membuat fungsi dapat dipanggil dari tombol HTML dan popup peta
window.editDevice = editDevice;
window.deleteDevice = deleteDevice;
window.selectDevice = selectDevice;



 // ==========================================
 // AUTENTIKASI DAN SINKRONISASI FIREBASE
 // ==========================================

const authOverlay = document.getElementById("authOverlay");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");

let unsubscribeDevices = null;

// LOGIN

loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const loginButton = document.getElementById("loginButton");

    loginButton.disabled = true;
    loginButton.textContent = "Memproses...";
    loginError.textContent = "";

    try {

        await signInWithEmailAndPassword(auth, email, password);

        loginForm.reset();

    } catch (error) {

        console.error("Login gagal:", error);

        loginError.textContent =
            "Login gagal. Periksa email dan password.";

    } finally {

        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});

// LOGOUT

logoutButton.addEventListener("click", async function() {

    try {

        await signOut(auth);

    } catch (error) {

        console.error("Logout gagal:", error);

        alert("Tidak dapat keluar dari akun.");
    }
});

// MENDENGARKAN STATUS LOGIN


onAuthStateChanged(auth, (user) => {

    if (user) {
        console.log("Login berhasil:", user.email);

        document.getElementById("authOverlay").style.display = "none";

        const logoutButton = document.getElementById("logoutButton");
        logoutButton.hidden = false;

        // Dengarkan perubahan data Firebase
        const devicesRef = ref(database, "devices");

        
        onValue(devicesRef, (snapshot) => {

            const data = snapshot.val();

            locations = [];

            if (data) {
                Object.keys(data).forEach((id) => {

                    const device = data[id];

                    const latitude = Number(device.info?.latitude);
                    const longitude = Number(device.info?.longitude);

                    // Validasi koordinat
                    const validCoordinates =
                        Number.isFinite(latitude) &&
                        Number.isFinite(longitude) &&
                        latitude >= -90 &&
                        latitude <= 90 &&
                        longitude >= -180 &&
                        longitude <= 180;

                    locations.push({
                        id: id,
                        name: device.info?.name || id,

                        latitude: Number(device.info?.latitude),
                        longitude: Number(device.info?.longitude),

                        temperature: Number(device.current?.temperature ?? 0),
                        humidity: Number(device.current?.humidity ?? 0),

                        standing_water: device.info?.standing_water || "Tidak diketahui",
                        vegetation: device.info?.vegetation || "Tidak diketahui",
                        drainage: device.info?.drainage || "Tidak diketahui",

                        status: device.status || "Tidak Aktif",
                        timestamp: device.current?.timestamp || null
                    });
                });
            }

            console.log("Data perangkat dari Firebase:", locations);

            updateDashboard();

            // Memperbarui ukuran peta
            if (map) {
                setTimeout(() => {
                    map.invalidateSize();
                }, 200);
            }

        });


    } else {

        console.log("Pengguna belum login");

        document.getElementById("authOverlay").style.display = "flex";
        document.getElementById("logoutButton").hidden = true;

        locations = [];

        updateDashboard();
    }

});
