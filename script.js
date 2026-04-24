/* ==========================================
   1. CONNECTION & SESSION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load progress and simulated user from Local Storage
let completedCourses = JSON.parse(localStorage.getItem('pathfinder_completed')) || [];
let currentUser = localStorage.getItem('pathfinder_user') || null;

/* ==========================================
   2. SIMULATED AUTH LOGIC (Replaces Google Auth)
   ========================================== */
function handleAuthAction() {
    if (!currentUser) {
        // SIMULATED LOGIN
        const username = prompt("Enter Name or Student ID for Demo Login:");
        if (username) {
            currentUser = username;
            localStorage.setItem('pathfinder_user', username);
            updateAuthUI();
        }
    } else {
        // LOGOUT/RESET
        if (confirm("Logout and clear demo session?")) {
            localStorage.removeItem('pathfinder_user');
            localStorage.removeItem('pathfinder_completed');
            location.reload();
        }
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const profileHeader = document.getElementById('user-profile');
    
    if (currentUser) {
        if (loginBtn) loginBtn.innerText = "Logout";
        if (profileHeader) profileHeader.innerHTML = `Welcome, <strong>${currentUser}</strong>`;
    } else {
        if (loginBtn) loginBtn.innerText = "Login";
    }
}

/* ==========================================
   3. ROUTING LOGIC (Back Button Fix)
   ========================================== */
function updateURL(college, major) {
    const newUrl = `${window.location.pathname}?college=${encodeURIComponent(college)}&major=${encodeURIComponent(major)}`;
    window.history.pushState({ college, major }, '', newUrl);
}

async function autoLoadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const col = params.get('college');
    const maj = params.get('major');
    
    if (col && maj) {
        const courses = await fetchMajorData(col, maj);
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${col} - ${maj}`, courses);
        }
    }
}

window.onpopstate = function(event) {
    if (event.state) {
        autoLoadFromURL();
    } else {
        location.reload();
    }
};

autoLoadFromURL();

/* ==========================================
   4. DATABASE FUNCTIONS
   ========================================== */
async function fetchMajorData(selectedCollege, selectedMajor, degreeType = 'B.S.') {
    try {
        console.log(`Attempting Fetch: ${selectedCollege} | ${selectedMajor} | ${degreeType}`);
        
        let { data, error } = await db
            .from('student_roadmap') 
            .select('*')
            .eq('college_name', selectedCollege)
            .eq('major_name', selectedMajor)
            .eq('degree_type', degreeType);

        if (error) throw error;

        if (!data || data.length === 0) {
            const { data: fallbackData, error: fallbackError } = await db
                .from('student_roadmap')
                .select('*')
                .eq('college_name', selectedCollege)
                .eq('major_name', selectedMajor);
            
            if (fallbackError) throw fallbackError;
            return fallbackData;
        }
        return data;
    } catch (err) {
        console.error('Database Connection Failed:', err.message);
        return null;
    }
}

/* ==========================================
   5. SMART SYNC & TRIGGER LOGIC
   ========================================== */
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
    syncBtn.addEventListener('click', async function() {
        const rawText = document.getElementById('dwPaste').value;
        const dashboard = document.getElementById('dashboard');
        const inputArea = document.getElementById('input-area');
        const statusHeader = document.getElementById('user-profile');
        
        if (!rawText.trim()) {
            alert("The text area is empty! Please paste your DegreeWorks audit.");
            return;
        }

        let detectedCol = rawText.includes("Hunter") ? "Hunter" : (rawText.includes("Baruch") ? "Baruch" : "CCNY");
        let detectedMaj = "Biology";
        const lowerText = rawText.toLowerCase();
        if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
        else if (lowerText.includes("psychology")) detectedMaj = "Psychology";

        let detectedDeg = rawText.includes("Bachelor of Arts") ? "B.A." : "B.S.";

        updateURL(detectedCol, detectedMaj);

        const lines = rawText.split('\n');
        const tempCompleted = [];
        const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/i;

        lines.forEach(line => {
            const match = line.match(universalRegex);
            if (match && !/In-Progress|IP|\(IP\)|Registered|REG/i.test(line)) {
                tempCompleted.push(`${match[1].toUpperCase()} ${match[2]}`);
            }
        });

        completedCourses = [...new Set(tempCompleted)];
        // Save progress to LocalStorage for persistence
        localStorage.setItem('pathfinder_completed', JSON.stringify(completedCourses));

        const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
        const gpa = gpaMatch ? gpaMatch[1] : "N/A";

        inputArea.classList.add('hidden');
        dashboard.classList.remove('hidden');
        if(statusHeader && !currentUser) statusHeader.innerText = `Analyzing ${detectedMaj}...`;
        
        document.getElementById('collegeSelect').value = detectedCol;
        document.getElementById('majorSelect').value = detectedMaj;

        const courses = await fetchMajorData(detectedCol, detectedMaj, detectedDeg);
        
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${detectedCol} - ${detectedMaj} (${detectedDeg})`, courses);
            document.getElementById('openChatBtn').style.display = "block";
            document.getElementById('chatHistory').innerHTML = `<p class="bot-msg">Audit Analyzed! Found <b>${completedCourses.length}</b> requirements. GPA: <b>${gpa}</b>.</p>`;
        }
    });
}

/* ==========================================
   6. RENDERING LOGIC
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    const catalogUrl = courses[0]?.program_url || "#";
    const profileEl = document.getElementById('user-profile');
    
    // Maintain the Welcome message if logged in, otherwise show Title
    if(profileEl && !currentUser) {
        profileEl.innerHTML = `${title} Explorer <br> <a href="${catalogUrl}" target="_blank" style="font-size:0.7rem; color:#2196F3; text-decoration:none;">Official Catalog ↗</a>`;
    }
    
    document.getElementById('detected-major').innerText = `Path: ${title}`;
    const recList = document.getElementById('recommendation-list');
    recList.innerHTML = ""; 

    courses.forEach(course => {
        const displayCode = course.course_id.split('-').slice(1).join(' ');
        const alreadyDone = completedCourses.includes(displayCode);
        const ruleText = course.prereq_logic || course.prerequisites || "None";
        const semesterLabel = course.active_semester_code || "Fall 2026";

        const checkMet = (reqStr) => {
            if (!reqStr || reqStr === "None") return true;
            const reqCodes = reqStr.match(/[A-Z]{2,4}\s?\d{3,5}/g) || [];
            return reqCodes.every(code => completedCourses.includes(code.replace(/\s/g, ' ')));
        };

        const isFullyUnlocked = checkMet(ruleText);

        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isFullyUnlocked ? 'is-locked' : (course.is_offered_current ? 'is-available' : 'is-wait'))}">
                <div style="flex: 1;">
                    <span class="category-tag">${course.requirement_type || "Major Core"}</span><br>
                    <strong>${displayCode}</strong> - ${course.course_name}
                    <div class="req-details" style="font-size: 0.75rem; margin: 8px 0; color: #555; background: #f4f4f4; padding: 4px; border-radius: 4px;">
                        <b>Prerequisites:</b> ${ruleText}
                    </div>
                    ${alreadyDone ? '✅ Completed' : (!isFullyUnlocked ? '🔒 Locked' : '● Available')}
                </div>
            </div>`;
        recList.innerHTML += cardHTML;
    });
}

/* ==========================================
   7. INITIALIZATION
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAuthAction);
    }
    
    // UI Drawer listeners
    const openChatBtn = document.getElementById('openChatBtn');
    const closeChatBtn = document.getElementById('closeChat');
    const drawer = document.getElementById('advisorDrawer');
    if(openChatBtn) openChatBtn.addEventListener('click', () => drawer.classList.add('open'));
    if(closeChatBtn) closeChatBtn.addEventListener('click', () => drawer.classList.remove('open'));
});
