import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔥 Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBelqwWBNr1w5ZHs9YUOvZ4eH1INdqpmiY",
  authDomain: "festive-bingo.firebaseapp.com",
  projectId: "festive-bingo",
  storageBucket: "festive-bingo.firebasestorage.app",
  messagingSenderId: "1008823865996",
  appId: "1:1008823865996:web:1b754bc64b7c19d9ee21a9"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const labels = [
  "The Holly & The Ivy","Something from the 12 Days of Christmas",
  "Town or village’s main Christmas tree","House covered top to toe in decorations",
  "Strava Art in the shape of something festive","Something you would eat on Christmas Day",
  "A Christmas song or film","A Nativity Scene","Run on Christmas Eve or Day wearing something festive",
  "Do the club ‘Baubles’ run/walk route","Visit Bethlehem","Real Life Donkey",
  "The North Star","The Grinch","Penguins","Ice badge on Garmin",
  "Snowflake","Take a selfie with a reindeer","A sleigh","Photo with a person in a Christmas jumper"
];

const gridContainer = document.getElementById("grid");
const allCardsContainer = document.getElementById("allCards");

signInAnonymously(auth);

onAuthStateChanged(auth, async user => {
  if (!user) return;
  const userId = user.uid;
  let name = localStorage.getItem("name");

  if (!name) {
    name = prompt("Enter your name:");
    localStorage.setItem("name", name);
    await setDoc(doc(db, "users", userId), { name });
  } else {
    await setDoc(doc(db, "users", userId), { name }, { merge: true });
  }

  renderOwnCard(userId);
  renderAllCards();
});

async function renderOwnCard(userId) {
  gridContainer.innerHTML = "";
  for (let i = 0; i < labels.length; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;

    const storageRef = ref(storage, `users/${userId}/${i}.jpg`);
    let url = null;
    try { url = await getDownloadURL(storageRef); } catch {}

    if (url) {
      cell.innerHTML = `
        <div class="cellContent">
          <img src="${url}" />
          <span class="cellLabel filled">${labels[i]}</span>
        </div>`;
    } else {
      cell.innerHTML = `
        <div class="cellContent">
          <span class="cellLabel empty">${labels[i]}<br><small>Tap to upload</small></span>
        </div>`;
    }

    cell.onclick = () => handleCellClick(userId, i, cell);
    gridContainer.appendChild(cell);
  }
}

async function handleCellClick(userId, index, cell) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";

  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = ref(storage, `users/${userId}/${index}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    cell.innerHTML = `
      <div class="cellContent">
        <img src="${url}" />
        <span class="cellLabel filled">${labels[index]}</span>
      </div>`;

    renderAllCards();
  };

  input.click();
}

async function renderAllCards() {
  allCardsContainer.innerHTML = "";
  const snapshot = await getDocs(collection(db, "users"));
  for (const docSnap of snapshot.docs) {
    const userCard = document.createElement("div");
    userCard.className = "userCard";
    userCard.innerHTML = `<h3>${docSnap.data().name}</h3>`;

    const grid = document.createElement("div");
    grid.className = "grid";

    for (let i = 0; i < labels.length; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";

      const storageRef = ref(storage, `users/${docSnap.id}/${i}.jpg`);
      let url = null;
      try { url = await getDownloadURL(storageRef); } catch {}

      if (url) {
        cell.innerHTML = `
          <div class="cellContent">
            <img src="${url}" />
            <span class="cellLabel filled">${labels[i]}</span>
          </div>`;
      } else {
        cell.innerHTML = `
          <div class="cellContent">
            <span class="cellLabel empty">${labels[i]}</span>
          </div>`;
      }

      grid.appendChild(cell);
    }

    userCard.appendChild(grid);
    allCardsContainer.appendChild(userCard);
  }
}
