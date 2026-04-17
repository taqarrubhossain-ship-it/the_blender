/* ==========================================
   1. CONNECTION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let completedCourses = [];

/* ==========================================
   2. DATABASE FUNCTIONS 
   ========================================== */
async function fetchMajorData(selectedCollege, selectedMajor) {
    const { data, error } = await db
        .from('major_requirements') 
        .select('*')
        .eq('college', selectedCollege)
        .eq('major_name', selectedMajor);

    if (error) {
        console.error('Error fetching from Supabase:', error);
        return null;
    }
    return data;
}

/* ==========================================
   3. SMART SYNC & TRIGGER LOGIC
   ========================================== */
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    const dashboard = document.getElementById('dashboard');
    const inputArea = document.getElementById('input-area');
    
    if (!rawText.trim()) {
        alert("The text area is empty! Please paste your DegreeWorks audit.");
        return;
    }

    let detectedCol = "CCNY"; 
    if (rawText.includes("Hunter")) detectedCol = "Hunter";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    let detectedMaj = "";
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes("biology")) detectedMaj = "Biology";
    else if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
    else if (lowerText.includes("psychology")) detectedMaj = "Psychology";
    else detectedMaj = "Biology";

    const lines = rawText.split('\n');
    const tempCompleted = [];
    const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/i;

    lines.forEach(line => {
        const match = line.match(universalRegex);
        if (match) {
            const subject = match[1].toUpperCase();
            const number = match[2];
            const normalizedCode = `${subject} ${number}`;
            const isInProgress = /In-Progress|IP|\(IP\)|Registered|REG/i.test(line);
            if (!isInProgress) tempCompleted.push(normalizedCode);
        }
    });

    completedCourses = [...new Set(tempCompleted)];
    const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
    const gpa = gpaMatch ? gpaMatch[1] : "N/A";

    inputArea.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-profile').innerText = `Syncing ${detectedMaj}...`;
    document.getElementById('collegeSelect').value = detectedCol;
    document.getElementById('majorSelect').value = detectedMaj;

    const courses = await fetchMajorData(detectedCol, detectedMaj);
    
    if (courses && courses.length > 0) {
        renderLockedDashboard(`${detectedCol} - ${detectedMaj}`, courses);
        document.getElementById('openChatBtn').style.display = "block";
        document.getElementById('chatHistory').innerHTML = `<p class="bot-msg">2026-2027 Audit Analyzed! Found <b>${completedCourses.length}</b> requirements met. GPA: <b>${gpa}</b>.</p>`;
    }
});

/* ==========================================
   4. UI & MANUAL EXPLORE
   ========================================== */
const drawer = document.getElementById('advisorDrawer');
document.getElementById('openChatBtn').addEventListener('click', () => drawer.classList.add('open'));
document.getElementById('closeChat').addEventListener('click', () => drawer.classList.remove('open'));

document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const col = document.getElementById('collegeSelect').value;
    const maj = document.getElementById('majorSelect').value;
    if (col && maj) {
        completedCourses = []; 
        const courses = await fetchMajorData(col, maj);
        if (courses && courses.length > 0) {
            renderLockedDashboard(`${col} - ${maj}`, courses);
            document.getElementById('openChatBtn').style.display = "block";
        }
    }
});

function openGlobalSearch(courseCode) {
    const parts = courseCode.split(' ');
    const courseNum = parts.length > 1 ? parts[1] : parts[0];
    navigator.clipboard.writeText(courseNum).then(() => {
        alert(`Course ${courseNum} copied! Opening Global Search...`);
        window.open('https://globalsearch.cuny.edu/CFGlobalSearchTool/search.jsp', '_blank');
    });
}

/* ==========================================
   5. RENDERING LOGIC (Updated for 2026 Complex Reqs)
   ========================================== */
function renderLockedDashboard(title, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-profile').innerText = `${title} Explorer`;
    document.getElementById('detected-major').innerText = `Path: ${title}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    recList.innerHTML = ""; 
    permitList.innerHTML = "";

    courses.forEach(course => {
        const alreadyDone = completedCourses.includes(course.course_code);
        
        // Complex Logic: Check if all requirements in the string are met
        const checkMet = (reqStr) => {
            if (!reqStr || reqStr === "None") return true;
            // Basic check: looks for course codes within the requirement string
            const reqCodes = reqStr.match(/[A-Z]{2,4}\s?\d{3,5}/g) || [];
            return reqCodes.every(code => completedCourses.includes(code.replace(/\s/g, ' ')));
        };

        const isPreMet = checkMet(course.prerequisites);
        const isCoMet = checkMet(course.corequisites);
        const isFullyUnlocked = isPreMet && isCoMet;
        
        const showSearch = !alreadyDone && isFullyUnlocked;

        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isFullyUnlocked ? 'is-locked' : 'is-available')}">
                <div style="flex: 1;">
                    <span class="category-tag">${course.category || 'Requirement'}</span><br>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    <div class="req-details" style="font-size: 0.75rem; margin: 5px 0; color: #666;">
                        ${course.prerequisites !== "None" ? `<b>Pre-req:</b> ${course.prerequisites}` : ''}
                        ${course.corequisites !== "None" ? `<br><b>Co-req:</b> ${course.corequisites}` : ''}
                    </div>
                    ${alreadyDone ? 
                        '<span class="status-text" style="color:#2ecc71">✅ Completed</span>' : 
                        (!isFullyUnlocked ? 
                            `<span class="prereq-hint" style="color:#e74c3c">🔒 Requirements Not Met</span>` : 
                            '<span class="status-text" style="color:#3498db">🟢 Ready to Take</span>'
                        )
                    }
                </div>
                ${showSearch ? `
                    <button class="search-btn" onclick="openGlobalSearch('${course.course_code}')">🔍 Find</button>
                ` : ''}
            </div>
        `;

        if (course.is_epermit) permitList.innerHTML += cardHTML;
        else recList.innerHTML += cardHTML;
    });
}

/* ==========================================
   6. AI ADVISOR ENGINE (Gemini Integration Ready)
   ========================================== */
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendChat');
const chatHistory = document.getElementById('chatHistory');

function addMessage(text, isBot = false) {
    const msg = document.createElement('p');
    msg.className = isBot ? 'bot-msg' : 'user-msg';
    msg.innerHTML = text;
    chatHistory.appendChild(msg);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// NOTE: This currently uses logic, but is ready to be swapped for your Gemini Edge Function!
async function handleChat() {
    const query = chatInput.value.trim().toLowerCase();
    if (!query) return;

    addMessage(chatInput.value, false);
    chatInput.value = "";

    setTimeout(() => {
        let response = "I'm analyzing the 2026-2027 CUNY requirements. Try asking about ePermits or what to take next!";
        if (query.includes("next")) {
            response = "Based on your audit, you should prioritize your Corequisites like <b>BIO 20600</b> so you don't delay your 22800 sequence.";
        } else if (query.includes("epermit")) {
            response = "Classes like <b>BIO 31100</b> are marked as ePermit friendly in my database!";
        }
        addMessage(response, true);
    }, 600);
}

sendBtn.addEventListener('click', handleChat);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });
