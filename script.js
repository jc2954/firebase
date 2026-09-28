import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB5lgiYRo56Pq6FVIlqZaypBxRcCF5GL0Y",
    authDomain: "minderreminder-31e86.firebaseapp.com",
    projectId: "minderreminder-31e86",
    storageBucket: "minderreminder-31e86.firebasestorage.app",
    messagingSenderId: "340767495547",
    appId: "1:340767495547:web:5881b965612ddb506499de"
};

// Initialize Firebase Realtime Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const fname = document.getElementById("firstname");
const userlist = document.getElementById("userlist");
const rightside = document.getElementById("rightside");
const usersRef = ref(db, 'users');
const totalBalloons = 10;
let poppedCount = 0;

// Track currently active gamer key & cached snapshot data
let activeGamerKey = null;
let currentUsersData = {};

// ==============================================================================
// 1. ADD USER
// ==============================================================================
fname.addEventListener("keypress", async function (event) {
    if (event.key === 'Enter') {
        const nameValue = fname.value.trim();
        if (!nameValue) return;

        try {
            await push(usersRef, {
                firstname: nameValue,
                time: Date.now(),
                popped: { red: 0, green: 0, purple: 0 }
            });
            fname.value = "";
        } catch (e) {
            console.error("Error adding user: ", e);
        }
    }
});

// ==============================================================================
// 2. READ & RENDER USER LIST WITH POPPED BALLOON COUNTS
// ==============================================================================
function renderUsers(data) {
    currentUsersData = data || {};

    userlist.innerHTML = `
        <h3>All Users</h3>
        <p style="font-size:0.82rem; color:#64748b; margin-top:0.2rem; margin-bottom:1rem;">
            Click <strong>[Claim as Gamer]</strong> next to a user, then click any balloon to pop it!
        </p>
    `;

    if (data) {
        const ul = document.createElement("ul");

        Object.keys(data).forEach((key) => {
            const user = data[key];
            const isSelectedGamer = (key === activeGamerKey);

            const li = document.createElement("li");
            if (isSelectedGamer) {
                li.classList.add("active-gamer-row");
            }

            // User Header Row (Name + Gamer Badge + Actions)
            const headerRow = document.createElement("div");
            headerRow.className = "user-header-row";

            const nameContainer = document.createElement("div");
            const nameSpan = document.createElement("span");
            nameSpan.className = "user-name";
            nameSpan.textContent = user.firstname;
            nameContainer.appendChild(nameSpan);

            if (isSelectedGamer) {
                const activeBadge = document.createElement("span");
                activeBadge.className = "active-badge";
                activeBadge.textContent = "🎮 Playing";
                nameContainer.appendChild(activeBadge);
            }

            const actionsDiv = document.createElement("div");
            actionsDiv.className = "user-actions";

            const claimBtn = document.createElement("a");
            claimBtn.href = "#";
            claimBtn.className = "action-btn claim-btn";
            claimBtn.textContent = isSelectedGamer ? "✓ Active Gamer" : "[Claim as Gamer]";
            claimBtn.addEventListener("click", (e) => {
                e.preventDefault();
                activeGamerKey = key;
                renderUsers(currentUsersData);
            });

            const deleteBtn = document.createElement("a");
            deleteBtn.href = "#";
            deleteBtn.className = "action-btn delete-btn";
            deleteBtn.textContent = "[Delete]";
            deleteBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                if (activeGamerKey === key) activeGamerKey = null;
                await deleteUser(key);
            });

            actionsDiv.appendChild(claimBtn);
            actionsDiv.appendChild(deleteBtn);

            headerRow.appendChild(nameContainer);
            headerRow.appendChild(actionsDiv);

            // Popped Balloon Score Badges
            const popped = user.popped || { red: 0, green: 0, purple: 0 };
            const scoreRow = document.createElement("div");
            scoreRow.className = "scores-container";

            scoreRow.innerHTML = `
                <span class="score-badge score-red">🔴 Red: ${popped.red || 0}</span>
                <span class="score-badge score-green">🟢 Green: ${popped.green || 0}</span>
                <span class="score-badge score-purple">🟣 Purple: ${popped.purple || 0}</span>
            `;

            li.appendChild(headerRow);
            li.appendChild(scoreRow);
            ul.appendChild(li);
        });

        userlist.appendChild(ul);
    } else {
        userlist.innerHTML += "<p>No users found yet.</p>";
    }
}

// Real-time listener for users data
onValue(usersRef, (snapshot) => {
    renderUsers(snapshot.val());
});

// ==============================================================================
// 3. DELETE USER
// ==============================================================================
async function deleteUser(key) {
    try {
        const itemRef = ref(db, `users/${key}`);
        await remove(itemRef);
    } catch (e) {
        console.error("Error deleting user: ", e);
    }
}

// ==============================================================================
// 4. BALLOON POPPING & GAME LOGIC
// ==============================================================================
function createSingleBalloon() {
    if (!rightside) return;

    const colors = ["red", "green", "purple"];
    const balloon = document.createElement("div");
    const speed = 10;

    const color = colors[Math.floor(Math.random() * colors.length)];
    balloon.className = `balloon ${color}`;
    balloon.dataset.color = color;

    const randomLeft = Math.floor(Math.random() * 75) + 10;
    const randomTop = Math.floor(Math.random() * 75) + 10;
    const randomDelay = (Math.random() * 2.5).toFixed(2);

    balloon.style.left = `${randomLeft}%`;
    balloon.style.top = `${randomTop}%`;
    balloon.style.animationDelay = `${randomDelay}s`;


    // Click to pop balloon
    balloon.addEventListener("click", async () => {
        if (!activeGamerKey) {
            alert("Please click [Claim as Gamer] next to a user before popping balloons!");
            return;
        }

        // Trigger popping animation
        balloon.classList.add("popping");

        // Calculate and update popped count for active gamer in Firebase
        const activeUserData = currentUsersData[activeGamerKey] || {};
        const currentPopped = activeUserData.popped || { red: 0, green: 0, purple: 0 };
        const currentCount = currentPopped[color] || 0;

        try {
            const poppedRef = ref(db, `users/${activeGamerKey}/popped`);
            await update(poppedRef, {
                [color]: currentCount + 1
            });
        } catch (err) {
            console.error("Error updating balloon count: ", err);
        }

        // Remove popped balloon after animation finishes (no respawn)
        setTimeout(() => {
            balloon.remove();
            poppedCount++;
            if (poppedCount === 10) {
                startGameBtn.style.display = "block";
                poppedCount = 0;
            }
            // createSingleBalloon(); // Uncomment this to respawn a new balloon after popping
        }, 300);
    });


    rightside.appendChild(balloon);
}

function initBalloons() {
    if (!rightside) return;
    // Remove existing balloons (keep the button)
    rightside.querySelectorAll('.balloon').forEach(b => b.remove());
    for (let i = 0; i < 10; i++) {
        createSingleBalloon();
    }

}

// Wire up the Start Game button
const startGameBtn = document.getElementById("startGameBtn");
if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
        if (!activeGamerKey) {
            alert("Please click [Claim as Gamer] next to a user first!");
            return;
        }
        startGameBtn.style.display = "none"; // Hide button once game starts
        initBalloons();
    });
}

function balloonMoveUp() {
    rightside.querySelectorAll('.balloon').forEach(b => {
        b.style.top = (parseInt(b.style.top) - Math.floor(Math.random() * 5)) + "%";
        if (parseInt(b.style.top) <= 1) {
            b.remove();
        }
    })
    if (rightside.querySelectorAll('.balloon').length === 0) startGameBtn.style.display = "block";
}

setInterval(balloonMoveUp, 2000);

