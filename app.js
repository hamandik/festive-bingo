console.log("Festive Bingo app.js loaded — v2025-12-22");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  deleteDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/** 🔥 Your Firebase config (OK to be public) */
const firebaseConfig = {
  apiKey: "AIzaSyBelqwWBNr1w5ZHs9YUOvZ4eH1INdqpmiY",
  authDomain: "festive-bingo.firebaseapp.com",
  projectId: "festive-bingo",
  storageBucket: "festive-bingo.firebasestorage.app",
  messagingSenderId: "1008823865996",
  appId: "1:1008823865996:web:1b754bc64b7c19d9ee21a9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app, "gs://festive-bingo.firebasestorage.app");


/** ===== Admin (device-only) ===== */
const ADMIN_PASSWORD = "k99h"; // change if you want
let isAdmin = localStorage.getItem("isAdmin") === "true";

document.addEventListener("keydown", (e) => {
  // Ctrl + Alt + A
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") {
    const pw = prompt("Admin password:");
    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem("isAdmin", "true");
      alert("Admin mode enabled on this device.");
      location.reload();
    } else {
      alert("Incorrect password.");
    }
  }
});

/** ===== Name prompt ===== */
let name = localStorage.getItem("bingoName");

if (name) {
  const keep = confirm(`Continue as "${name}"?`);
  if (!keep) {
    localStorage.removeItem("bingoName");
    name = null;
  }
}

while (!name && !isAdmin) {
  const input = prompt("Enter your name:");
  if (input && input.trim()) {
    name = input.trim();
    localStorage.setItem("bingoName", name);
  }
}

/** ===== Labels ===== */
const labels = [
  "The Holly & The Ivy","12 Days of Christmas","Town Christmas Tree","Decorated House","Festive Strava Art",
  "Christmas Food","Christmas Song/Film","Nativity Scene","Festive Run","Baubles Route",
  "Visit Bethlehem","Real Donkey","North Star","The Grinch","Penguins",
  "Angel","Snowflake","Reindeer Selfie","Sleigh","Christmas Jumper"
];

/** ===== DOM ===== */
const grid = document.getElementById("myGrid");
const playersDiv = document.getElementById("players");
const banner = document.getElementById("banner");
const titleEl = document.getElementById("myTitle");
const firstBingoBanner = document.getElementById("firstBingoBanner");

/** ===== First-to-BINGO banner (visible to all) ===== */
if (firstBingoBanner) {
  onSnapshot(doc(db, "meta", "firstBingo"), (snap) => {
    if (snap.exists()) {
      firstBingoBanner.style.display = "block";
      firstBingoBanner.textContent = `🏆 First to BINGO: ${snap.data().name}`;
    }
  });
}

/** ===== Title + hide personal card for admin ===== */
if (isAdmin) {
  if (titleEl) titleEl.style.display = "none";
  if (grid) grid.style.display = "none";
} else {
  if (titleEl) titleEl.innerText = `${name}'s Bingo Card`;
}

/** ===== Build my personal grid (players only) ===== */
async function upload(i) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  // 🔑 MUST be attached for iOS
  input.style.display = "none";
  document.body.appendChild(input);

  input.onchange = async () => {
    console.log("📸 File chooser triggered");

    const file = input.files && input.files[0];
    if (!file) {
      console.log("❌ No file selected");
      document.body.removeChild(input);
      return;
    }

    console.log("✅ File selected:", file.name, file.type);

    try {
      const r = ref(storage, `cards/${name}/${i}.jpg`);

      await uploadBytes(r, file, {
        contentType: "image/jpeg"
      });

      const url = await getDownloadURL(r);
      await updateDoc(doc(db, "cards", name), { [i]: url });

      console.log("✅ Upload complete");
    } catch (err) {
      console.error("🔥 Upload failed", err);
      alert("Upload failed. Please try again.");
    }

    document.body.removeChild(input);
  };

  input.click();
}


async function main() {
let smallBingoCelebrated = false;
let fullBingoCelebrated = false;

if (!isAdmin) {
  // Create 20 empty cells once
  grid.innerHTML = "";
  labels.forEach((label, i) => {
    const cell = document.createElement("div");
    cell.className = "cell empty";
    cell.innerHTML = `<div class="label">${label}<span class="upload">Tap to upload</span></div>`;
    cell.onclick = () => upload(i);
    grid.appendChild(cell);
  });

  // Ensure my card doc exists
  await setDoc(doc(db, "cards", name), {}, { merge: true });

  // Live render my card
  onSnapshot(doc(db, "cards", name), async (snap) => {
    const data = snap.data() || {};
    const cells = [...grid.children];

    // render cells
    cells.forEach((c, i) => {
      c.innerHTML = "";
      c.style.outline = "none";

      if (data[i]) {
        c.className = "cell filled";
        c.innerHTML = `<img src="${data[i]}"><div class="label">${labels[i]}</div>`;
      } else {
        c.className = "cell empty";
        c.innerHTML = `<div class="label">${labels[i]}<span class="upload">Tap to upload</span></div>`;
      }
    });

    // check rows & columns (4x5)
    const rows = 4;
    const cols = 5;
    let bingoHit = false;

    // rows
    for (let r = 0; r < rows; r++) {
      let complete = true;
      for (let c = 0; c < cols; c++) {
        if (!data[r * cols + c]) complete = false;
      }
      if (complete) {
        bingoHit = true;
        for (let c = 0; c < cols; c++) {
          cells[r * cols + c].style.outline = "4px solid gold";
        }
      }
    }

    // columns
    for (let c = 0; c < cols; c++) {
      let complete = true;
      for (let r = 0; r < rows; r++) {
        if (!data[r * cols + c]) complete = false;
      }
      if (complete) {
        bingoHit = true;
        for (let r = 0; r < rows; r++) {
          cells[r * cols + c].style.outline = "4px solid cyan";
        }
      }
    }

    // SMALL celebration (rows/cols)
    if (bingoHit && !smallBingoCelebrated) {
      smallBingoCelebrated = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (!bingoHit) smallBingoCelebrated = false;

    // BIG celebration (full card)
    const filledCount = Object.keys(data).length;

    if (filledCount < 20) {
      fullBingoCelebrated = false;
    }

    if (filledCount === 20 && !fullBingoCelebrated) {
      fullBingoCelebrated = true;

      const overlay = document.getElementById("bingoOverlay");
      if (overlay) overlay.style.display = "flex";

      const end = Date.now() + 2500;
      (function fireworks() {
        confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(fireworks);
      })();

      setTimeout(() => {
        if (overlay) overlay.style.display = "none";
      }, 3000);

      // Claim FIRST TO BINGO (only once globally)
      const firstBingoRef = doc(db, "meta", "firstBingo");
      const existing = await getDoc(firstBingoRef);
      if (!existing.exists()) {
        await setDoc(firstBingoRef, { name, time: serverTimestamp() });
      }
    }
  });
}

/** ===== All players list (visible to everyone) ===== */
onSnapshot(collection(db, "cards"), (snap) => {
  playersDiv.innerHTML = "";

  snap.forEach((d) => {
    if (!isAdmin && d.id === name) return; // players don't see their own card duplicated

    const wrapper = document.createElement("div");
    wrapper.className = "player";

    const h3 = document.createElement("h3");
    h3.textContent = d.id;
    wrapper.appendChild(h3);

    // Admin delete
    if (isAdmin) {
      const btn = document.createElement("button");
      btn.className = "adminBtn";
      btn.textContent = "Delete Card";
      btn.onclick = async () => {
        if (!confirm("Delete card?")) return;

        const data = d.data();
        for (const k in data) {
          await deleteObject(ref(storage, `cards/${d.id}/${k}.jpg`)).catch(() => {});
        }
        await deleteDoc(doc(db, "cards", d.id));
      };
      wrapper.appendChild(btn);
    }

    // read-only grid view
    const gridView = document.createElement("div");
    gridView.style.display = "grid";
    gridView.style.gridTemplateColumns = "repeat(5,1fr)";
    gridView.style.gap = "6px";
    gridView.style.marginTop = "6px";

    const data = d.data();

    labels.forEach((label, i) => {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (data[i]) {
        cell.classList.add("filled");
        cell.innerHTML = `<img src="${data[i]}"><div class="label">${label}</div>`;
      } else {
        cell.classList.add("empty");
        cell.innerHTML = `<div class="label">${label}</div>`;
      }
      gridView.appendChild(cell);
    });

    wrapper.appendChild(gridView);
    playersDiv.appendChild(wrapper);
  });
});
}
main();