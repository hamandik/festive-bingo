import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, getDoc, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* 🔥 FIREBASE CONFIG */
// Your web app's Firebase configuration

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

/* 🎯 Labels */
const labels = [
  "The Holly & The Ivy","Something from the 12 Days of Christmas","Town or village’s main Christmas tree","House covered top to toe in decorations","Strava Art in the shape of something festive",
  "Something you would eat on Christmas Day","A Christmas song or film","A Nativity Scene","Run on Christmas Eve or Day wearing something festive","Do the club ‘Baubles’ run/walk route",
  "Visit Bethlehem","Real Life Donkey","The North Star","The Grinch","Penguins",
  "Ice badge on Garmin","Snowflake","Take a selfie with a reindeer","A sleigh","Photo with a person in a Christmas jumper"
];

/* 👤 Name handling */
let playerName = localStorage.getItem("festiveBingoName");
const ADMIN_NAME = "hamandik";
const myGrid = document.getElementById("myGrid");
const allPlayersDiv = document.getElementById("allPlayers");

if (playerName) {
  if (playerName.toLowerCase() !== ADMIN_NAME) {
    const continueName = confirm(`Continue as "${playerName}"? Press Cancel to switch user.`);
    if (!continueName) playerName = null;
  }
}

if (!playerName) {
  let input = "";
  while (!input || !input.trim()) {
    input = prompt("Enter your name (this is how you access your card):");
    if (!input) alert("Name is required.");
  }
  playerName = input.trim();
  localStorage.setItem("festiveBingoName", playerName);
}

const isAdmin = playerName.toLowerCase() === ADMIN_NAME;

if (!isAdmin) document.getElementById("myTitle").textContent = `${playerName}'s Bingo Card`;

/* 🏗 Build grid */
if (!isAdmin) {
  labels.forEach((label,index)=>{
    const cell = document.createElement("div");
    cell.className="cell";
    const labelDiv = document.createElement("div");
    labelDiv.className="label";
    labelDiv.innerHTML=`${label}<div class="upload-hint">Tap to upload</div>`;
    cell.appendChild(labelDiv);
    cell.onclick = ()=>uploadPhoto(index);
    myGrid.appendChild(cell);
  });
}

/* 🗃 Ensure card exists */
if (!isAdmin) setDoc(doc(db,"cards",playerName),{}, {merge:true});

/* 📸 Upload / replace */
async function uploadPhoto(index){
  const input=document.createElement("input");
  input.type="file";
  input.accept="image/*";
  input.onchange=async()=>{
    if(!input.files[0]) return;
    const file=input.files[0];
    const resizedFile = await resizeImage(file,800,800);
    const fileRef=ref(storage,`cards/${playerName}/${index}.jpg`);
    await uploadBytes(fileRef,resizedFile);
    const url=await getDownloadURL(fileRef);
    await updateDoc(doc(db,"cards",playerName),{ [index]: url });
  };
  input.click();
}

/* Resize image */
function resizeImage(file,maxWidth,maxHeight){
  return new Promise((resolve)=>{
    const img=document.createElement("img");
    const reader=new FileReader();
    reader.onload=e=>{
      img.src=e.target.result;
      img.onload=()=>{
        const canvas=document.createElement("canvas");
        let {width,height}=img;
        if(width>maxWidth){ height*=maxWidth/width; width=maxWidth; }
        if(height>maxHeight){ width*=maxHeight/height; height=maxHeight; }
        canvas.width=width; canvas.height=height;
        const ctx=canvas.getContext("2d");
        ctx.drawImage(img,0,0,width,height);
        canvas.toBlob(blob=>resolve(new File([blob],file.name,{type:file.type})));
      };
    };
    reader.readAsDataURL(file);
  });
}

/* 🔄 Live update my card */
if(!isAdmin){
  onSnapshot(doc(db,"cards",playerName),(snap)=>{
    const data=snap.data()||{};
    [...myGrid.children].forEach((cell,i)=>{
      cell.innerHTML="";
      if(data[i]){
        cell.classList.add("filled");
        const img=document.createElement("img");
        img.src=data[i];
        const lbl=document.createElement("div");
        lbl.className="label";
        lbl.textContent=labels[i];
        cell.appendChild(img);
        cell.appendChild(lbl);
      }else{
        cell.classList.remove("filled");
        const lbl=document.createElement("div");
        lbl.className="label";
        lbl.innerHTML=`${labels[i]}<div class="upload-hint">Tap to upload</div>`;
        cell.appendChild(lbl);
      }
    });
    checkBingoCompletion(data);
  });
}

/* 👥 All players view & admin controls */
onSnapshot(collection(db,"cards"),(snapshot)=>{
  allPlayersDiv.innerHTML="";
  snapshot.forEach(docSnap=>{
    const name=docSnap.id;
    if(!isAdmin && name===playerName) return;
    const wrapper=document.createElement("div");
    wrapper.className="player-card";
    wrapper.innerHTML=`<h3>${name}</h3>`;
    const grid=document.createElement("div");
    grid.className="grid";
    labels.forEach((label,i)=>{
      const cell=document.createElement("div");
      cell.className="cell";
      if(docSnap.data()[i]){
        const img=document.createElement("img");
        img.src=docSnap.data()[i];
        const lbl=document.createElement("div");
        lbl.className="label";
        lbl.textContent=label;
        cell.appendChild(img);
        cell.appendChild(lbl);
      }else{ cell.textContent=label; }
      grid.appendChild(cell);
    });
    wrapper.appendChild(grid);
    if(isAdmin){
      const delBtn=document.createElement("button");
      delBtn.className="admin-btn";
      delBtn.textContent="Delete Card";
      delBtn.onclick=async()=>{
        if(confirm(`Delete ${name}'s card?`)){
          const cardRef=doc(db,"cards",name);
          const cardSnap=await getDoc(cardRef);
          if(cardSnap.exists()){
            const data=cardSnap.data();
            for(const i in data){
              const imgRef=ref(storage,`cards/${name}/${i}.jpg`);
              await deleteObject(imgRef).catch(()=>{});
            }
            await cardRef.delete();
          }
        }
      };
      wrapper.appendChild(delBtn);
    }
    allPlayersDiv.appendChild(wrapper);
  });
});

/* 🎉 Bingo complete + row/column highlight function */
function checkBingoCompletion(data) {
  const filledIndexes = Object.keys(data).map(n => parseInt(n));
  const total = labels.length;

  // Banner
  if(filledIndexes.length === total) {
    if(!document.getElementById("bingoBanner")){
      const banner = document.createElement("div");
      banner.id="bingoBanner";
      banner.textContent="🎉 BINGO COMPLETE! 🎉";
      document.body.insertBefore(banner,myGrid);
    }
  } else {
    const existingBanner=document.getElementById("bingoBanner");
    if(existingBanner) existingBanner.remove();
  }

  // Rows/columns highlight
  const rows=4, cols=5;
  const gridChildren=[...myGrid.children];
  gridChildren.forEach(cell=>cell.style.boxShadow="");
  // Rows
  for(let r=0;r<rows;r++){
    let complete=true;
    for(let c=0;c<cols;c++){ if(!data[r*cols+c]) complete=false; }
    if(complete) for(let c=0;c<cols;c++) gridChildren[r*cols+c].style.boxShadow="0 0 10px 3px gold";
  }
  // Columns
  for(let c=0;c<cols;c++){
    let complete=true;
    for(let r=0;r<rows;r++){ if(!data[r*cols+c]) complete=false; }
    if(complete) for(let r=0;r<rows;r++) gridChildren[r*cols+c].style.boxShadow="0 0 10px 3px cyan";
  }
}
