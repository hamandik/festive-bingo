console.log("Festive Bingo app.js loaded — v2025-12-16-2");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔥 REPLACE WITH YOUR REAL FIREBASE CONFIG (same project as before)
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
const storage = getStorage(app);

const ADMIN = "hamandik";
let name = localStorage.getItem("bingoName");

if (name) {
  const keep = confirm(`Continue as "${name}"?\n\nPress Cancel to switch user or log in as admin.`);
  if (!keep) {
    localStorage.removeItem("bingoName");
    name = null;
  }
}

while (!name) {
  const input = prompt("Enter your name (players: your name, admin: hamandik):");
  if (input && input.trim()) {
    name = input.trim();
    localStorage.setItem("bingoName", name);
  }
}


const isAdmin = name.toLowerCase() === ADMIN;
const labels = [
  "The Holly & The Ivy","12 Days of Christmas","Town Christmas Tree","Decorated House","Festive Strava Art",
  "Christmas Food","Christmas Song/Film","Nativity Scene","Festive Run","Baubles Route",
  "Visit Bethlehem","Real Donkey","North Star","The Grinch","Penguins",
  "Ice Badge","Snowflake","Reindeer Selfie","Sleigh","Christmas Jumper"
];

const grid = document.getElementById("myGrid");
const playersDiv = document.getElementById("players");
const banner = document.getElementById("banner");

const title = document.getElementById("myTitle");

if (isAdmin) {
  // Admin has no personal card
  title.style.display = "none";
  grid.style.display = "none";
} else {
  title.innerText = `${name}'s Bingo Card`;
}


if (!isAdmin) {
  labels.forEach((label,i)=>{
    const cell=document.createElement("div");
    cell.className="cell empty";
    cell.innerHTML=`<div class="label">${label}<span class="upload">Tap to upload</span></div>`;
    cell.onclick=()=>upload(i);
    grid.appendChild(cell);
  });
  setDoc(doc(db,"cards",name),{}, {merge:true});
}

async function upload(i){
  const input=document.createElement("input");
  input.type="file";
  input.accept="image/*";
  input.onchange=async()=>{
    const file=input.files[0];
    if(!file) return;
    const r=ref(storage,`cards/${name}/${i}.jpg`);
    await uploadBytes(r,file);
    const url=await getDownloadURL(r);
    await updateDoc(doc(db,"cards",name),{[i]:url});
  };
  input.click();
}

if(!isAdmin){
  onSnapshot(doc(db,"cards",name),snap=>{
    const data=snap.data()||{};
    let filled=0;
    [...grid.children].forEach((c,i)=>{
      c.innerHTML="";
      if(data[i]){
        filled++;
        c.className="cell filled";
        c.innerHTML=`<img src="${data[i]}"><div class="label">${labels[i]}</div>`;
      } else {
        c.className="cell empty";
        c.innerHTML=`<div class="label">${labels[i]}<span class="upload">Tap to upload</span></div>`;
      }
    });
    banner.style.display = filled===20 ? "block":"none";
  });
}

onSnapshot(collection(db,"cards"),snap=>{
  playersDiv.innerHTML="";

  snap.forEach(d=>{
    console.log("CARD DOC:", d.id, d.data());    
    if(!isAdmin && d.id===name) return;

    const wrapper = document.createElement("div");
    wrapper.className = "player";

    const title = document.createElement("h3");
    title.textContent = d.id;
    wrapper.appendChild(title);

    // Admin delete button
    if(isAdmin){
      const btn = document.createElement("button");
      btn.className="adminBtn";
      btn.textContent="Delete Card";
      btn.onclick=async()=>{
        if(confirm("Delete card?")){
          const data=d.data();
          for(const k in data){
            await deleteObject(ref(storage,`cards/${d.id}/${k}.jpg`)).catch(()=>{});
          }
          await deleteDoc(doc(db,"cards",d.id));
        }
      };
      wrapper.appendChild(btn);
    }

    // Create read-only grid
    const gridView = document.createElement("div");
    gridView.style.display="grid";
    gridView.style.gridTemplateColumns="repeat(5,1fr)";
    gridView.style.gap="6px";
    gridView.style.marginTop="6px";

    const data = d.data();

    labels.forEach((label,i)=>{
      const cell = document.createElement("div");
      cell.className="cell";

      if(data[i]){
        cell.classList.add("filled");
        cell.innerHTML = `
          <img src="${data[i]}">
          <div class="label">${label}</div>
        `;
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
