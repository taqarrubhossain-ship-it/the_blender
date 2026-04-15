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
   3. SMART SYNC & TRIGGER LOGIC (UNIVERSAL VERSION)
   ========================================== */
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    const dashboard = document.getElementById('dashboard');
    const inputArea = document.getElementById('input-area');
    
    if (!rawText.trim()) {
        alert("The text area is empty! Please paste your DegreeWorks audit.");
        return;
    }

    // A. Detect College
    let detectedCol = "CCNY"; 
    if (rawText.includes("Hunter")) detectedCol = "Hunter";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    // B. Priority Major Detection
    let detectedMaj = "";
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes("biology")) detectedMaj = "Biology";
    else if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
    else if (lowerText.includes("psychology")) detectedMaj = "Psychology";
    else detectedMaj = "Biology";

    // C. UNIVERSAL PARSING LOGIC
    // We split by line to check for "In-Progress" status per course
    const lines = rawText.split('\n');
    const tempCompleted = [];
    
    // This Regex captures Subject (Group 1) and Number (Group 2) with optional space
    const universalRegex = /([A-Z]{2,4})\s?(\d{3,5})/i;

    lines.forEach(line => {
        const match = line.match(universalRegex);
        if (match) {
            const subject = match[1].toUpperCase();
            const number = match[2];
            const normalizedCode = `${subject} ${number}`; // Always "SUBJ 12345" format

            // Filter out In-Progress/Registered courses
            const isInProgress = /In-Progress|IP|\(IP\)|Registered|REG/i.test(line);
            
            if (!isInProgress) {
                tempCompleted.push(normalizedCode);
            }
        }
    });

    completedCourses = [...new Set(tempCompleted)];
    console.log("Verified Completed Courses:", completedCourses);

    // D. Extract GPA
    const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
    const gpa = gpaMatch ? gpaMatch[1] : "N/A";

    // E. Visual Update
    inputArea.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-profile').innerText = `Syncing ${detectedMaj}...`;
    document.getElementById('collegeSelect').value = detectedCol;
    document.getElementById('majorSelect').value = detectedMaj;

    // F. Fetch & Render
    const courses = await fetchMajorData(detectedCol, detectedMaj);
    
    if (courses && courses.length > 0) {
        renderLockedDashboard(`${detectedCol} - ${detectedMaj}`, courses);
        
        document.getElementById('openChatBtn').style.display = "block";
        document.getElementById('chatHistory').innerHTML = `
            <p class="bot-msg">
                Audit Analyzed! I found <b>${completedCourses.length}</b> completed requirements 
                for your <b>${detectedMaj}</b> degree at <b>${detectedCol}</b>. 
                Your GPA is <b>${gpa}</b>.
            </p>`;

        window.scrollTo({ top: dashboard.offsetTop - 20, behavior: 'smooth' });
    } else {
        document.getElementById('recommendation-list').innerHTML = `
            <div class="card" style="border: 2px dashed #ff4d4d; padding: 20px; text-align: center;">
                <h4 style="color: #ff4d4d;">Data Not Found</h4>
                <p>Recognized ${detectedMaj} at ${detectedCol}, but database rows are missing.</p>
                <button onclick="location.reload()" class="upload-btn">Try Again</button>
            </div>`;
    }
});

/* ==========================================
   4. UI & CHAT CONTROLS
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
        renderLockedDashboard(`${col} - ${maj}`, courses);
    }
});

/* ==========================================
   5. RENDERING LOGIC
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
        // We check the normalized code against our completed list
        const alreadyDone = completedCourses.includes(course.course_code);
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        
        const cardHTML = `
            <div class="course-card ${alreadyDone ? 'is-done' : (!isMet ? 'is-locked' : 'is-available')}">
                <div>
                    <span class="category-tag">${course.category || 'Major Requirement'}</span><br>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    <br>
                    ${alreadyDone ? 
                        '<span class="status-text" style="color:#2ecc71">✅ Completed</span>' : 
                        (!isMet ? 
                            `<span class="prereq-hint" style="color:#e74c3c">🔒 Needs: ${course.prerequisite}</span>` : 
                            '<span class="status-text" style="color:#3498db">🟢 Ready to Take</span>'
                        )
                    }
                </div>
            </div>
        `;

        if (course.is_epermit) permitList.innerHTML += cardHTML;
        else recList.innerHTML += cardHTML;
    });
}
