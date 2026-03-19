// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURATION ---
// ⚠️ এখানে আপনার আগের Firebase Config পেস্ট করুন
const firebaseConfig = {
  apiKey: "AIzaSyAwlZ-01TJA9sLZ30bjCLEiCGHekL8_25k",
  authDomain: "rabby-pomo-site.firebaseapp.com",
  projectId: "rabby-pomo-site",
  storageBucket: "rabby-pomo-site.firebasestorage.app",
  messagingSenderId: "568222053838",
  appId: "1:568222053838:web:f7f99677d43471c435279f",
  measurementId: "G-V1MSW4PP06"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State
let currentUser = null;
let currentPageId = null;

// UI References
const views = {
    login: document.getElementById('loginSection'),
    dashboard: document.getElementById('adminDashboard'),
    page: document.getElementById('pageView')
};
const loader = document.getElementById('loader');

// --- UTILS ---
const showLoader = (show) => loader.classList.toggle('hidden', !show);
const hideAllViews = () => Object.values(views).forEach(el => el.classList.add('hidden'));

function processImageLink(url) {
    if (!url) return 'https://placehold.co/100/1e293b/FFF?text=IMG'; 
    if (url.includes('drive.google.com')) {
        const match = url.match(/[-\w]{25,}/);
        if (match && match[0]) return `https://lh3.googleusercontent.com/d/${match[0]}`;
    }
    return url;
}

// --- THEME HANDLING ---
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Force Dark mode default logic for this new design
if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');

function applyTheme() {
    if (localStorage.getItem('theme') === 'light') {
        html.classList.remove('dark');
        html.classList.add('light');
        themeToggle.innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun text-yellow-400"></i>';
    }
}
applyTheme();

themeToggle.addEventListener('click', () => {
    const isDark = html.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    applyTheme();
});

// --- AUTH & NAVIGATION ---
const urlParams = new URLSearchParams(window.location.search);
const publicPageId = urlParams.get('page');

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (user) {
        logoutBtn.classList.remove('hidden');
        if (!publicPageId) loadDashboard();
        else loadPublicPage(publicPageId);
    } else {
        logoutBtn.classList.add('hidden');
        if (publicPageId) loadPublicPage(publicPageId);
        else {
            hideAllViews();
            views.login.classList.remove('hidden');
        }
    }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
        await signInWithEmailAndPassword(auth, 
            document.getElementById('email').value, 
            document.getElementById('password').value
        );
    } catch (err) { alert("Access Denied: " + err.message); }
    showLoader(false);
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

// --- DASHBOARD RENDER ---
function loadDashboard() {
    hideAllViews();
    views.dashboard.classList.remove('hidden');
    const list = document.getElementById('pagesList');
    
    onSnapshot(query(collection(db, "pages"), orderBy("createdAt", "desc")), (snap) => {
        list.innerHTML = '';
        snap.forEach(d => {
            const data = d.data();
            const div = document.createElement('div');
            // Advanced Card Design
            div.className = "glass-panel p-6 rounded-2xl relative group hover:bg-white/5 transition-all duration-300 border border-white/5";
            div.innerHTML = `
                <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition">
                    <button class="text-red-400 hover:text-red-300 bg-red-500/10 p-2 rounded-full" onclick="deletePage('${d.id}')"><i class="fas fa-trash"></i></button>
                </div>
                <div class="w-12 h-12 bg-gradient-to-br from-brand to-accent rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-brand/20 group-hover:scale-110 transition-transform">
                    <i class="fas fa-layer-group text-white text-lg"></i>
                </div>
                <h3 class="text-xl font-bold text-white dark:text-white light:text-gray-800 mb-2">${data.title}</h3>
                <p class="text-gray-400 text-xs mb-6">Created: ${data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'Just now'}</p>
                
                <button onclick="viewPage('${d.id}')" class="w-full py-2.5 rounded-lg border border-brand/50 text-brand font-semibold hover:bg-brand hover:text-white transition-all flex justify-center items-center gap-2">
                    Manage Page <i class="fas fa-arrow-right text-xs"></i>
                </button>
            `;
            list.appendChild(div);
        });
    });
}

// --- PAGE & CARD RENDER ---
function loadPublicPage(id) {
    hideAllViews();
    views.page.classList.remove('hidden');
    currentPageId = id;

    // Load Title
    onSnapshot(doc(db, "pages", id), (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('pageTitle').innerText = data.title;
            // Update Profile Initials
            const initial = data.title.charAt(0) || 'L';
            document.getElementById('pageProfileImg').src = `https://ui-avatars.com/api/?name=${initial}&background=random&size=128&bold=true`;
        }
    });

    // Admin Controls visibility
    const controls = document.getElementById('pageAdminControls');
    if (currentUser) {
        controls.classList.remove('hidden');
        document.getElementById('backToDash').onclick = () => window.location.href = window.location.pathname;
        document.getElementById('shareBtn').onclick = () => {
            navigator.clipboard.writeText(window.location.href);
            alert("Link copied to clipboard!");
        };
        document.getElementById('editTitleBtn').onclick = () => {
            const t = prompt("Update Page Title:");
            if(t) updateDoc(doc(db, "pages", currentPageId), { title: t });
        };
    }

    // Load Cards
    const container = document.getElementById('cardsContainer');
    onSnapshot(query(collection(db, "pages", id, "cards"), orderBy("createdAt", "asc")), (snap) => {
        container.innerHTML = '';
        snap.forEach((cardSnap, index) => {
            const data = cardSnap.data();
            const imgSrc = processImageLink(data.image);

            const item = document.createElement('div');
            // Staggered Animation
            item.style.animationDelay = `${index * 100}ms`;
            item.className = "relative group animate-fade-up opacity-0 fill-mode-forwards"; 

            let adminTools = '';
            if(currentUser) {
                adminTools = `
                    <div class="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/60 backdrop-blur px-2 py-1 rounded-full border border-white/10">
                        <button class="text-blue-400 p-1.5 hover:scale-110 transition" onclick="openEditCard('${cardSnap.id}', '${data.title}', '${data.image || ''}', '${data.url}')"><i class="fas fa-pen"></i></button>
                        <button class="text-red-400 p-1.5 hover:scale-110 transition" onclick="deleteCard('${cardSnap.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            }

            item.innerHTML = `
                <a href="${data.url}" target="_blank" class="block glass-panel p-3 rounded-xl flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:shadow-lg hover:shadow-brand/20 border-l-4 border-transparent hover:border-brand">
                    <div class="w-14 h-14 rounded-lg overflow-hidden bg-black/30 flex-shrink-0 border border-white/10">
                        <img src="${imgSrc}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100?text=Link'">
                    </div>
                    <div class="flex-grow min-w-0">
                        <h4 class="font-bold text-lg text-white light:text-gray-800 truncate">${data.title}</h4>
                        <p class="text-xs text-gray-500 truncate group-hover:text-brand transition">${data.url}</p>
                    </div>
                    <div class="pr-2 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </a>
                ${adminTools}
            `;
            container.appendChild(item);
        });
    });
}

// Global Actions
window.viewPage = (id) => window.location.href = `?page=${id}`;
window.deletePage = async (id) => confirm("Delete this page completely?") && deleteDoc(doc(db, "pages", id));
window.deleteCard = async (id) => confirm("Remove this card?") && deleteDoc(doc(db, "pages", currentPageId, "cards", id));

// Modals
window.openModal = (id) => document.getElementById(id).classList.remove('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

// Creation & Edits
document.getElementById('savePageBtn').addEventListener('click', async () => {
    const title = document.getElementById('newPageName').value;
    if(!title) return;
    showLoader(true);
    await addDoc(collection(db, "pages"), { title, createdAt: new Date() });
    document.getElementById('newPageName').value = '';
    closeModal('createPageModal');
    showLoader(false);
});

document.getElementById('saveCardBtn').addEventListener('click', async () => {
    const title = document.getElementById('cardTitle').value;
    const image = document.getElementById('cardImage').value;
    const url = document.getElementById('cardLink').value;
    if(!title || !url) return alert("Required fields missing");
    
    showLoader(true);
    await addDoc(collection(db, "pages", currentPageId, "cards"), { title, image, url, createdAt: new Date() });
    document.getElementById('cardTitle').value = ''; 
    document.getElementById('cardLink').value = '';
    closeModal('addCardModal');
    showLoader(false);
});

// Edit Logic
window.openEditCard = (id, title, image, link) => {
    document.getElementById('editCardId').value = id;
    document.getElementById('editCardTitle').value = title;
    document.getElementById('editCardImage').value = image;
    document.getElementById('editCardLink').value = link;
    openModal('editCardModal');
};

document.getElementById('updateCardBtn').addEventListener('click', async () => {
    const cardId = document.getElementById('editCardId').value;
    const title = document.getElementById('editCardTitle').value;
    const image = document.getElementById('editCardImage').value;
    const url = document.getElementById('editCardLink').value;
    
    if(!title || !url) return;
    showLoader(true);
    await updateDoc(doc(db, "pages", currentPageId, "cards", cardId), { title, image, url });
    closeModal('editCardModal');
    showLoader(false);
});
