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
   3. SMART SYNC & TRIGGER LOGIC (OPTIMIZED)
   ========================================== */
document.getElementById('syncBtn').addEventListener('click', async function() {
    const rawText = document.getElementById('dwPaste').value;
    const dashboard = document.getElementById('dashboard');
    const inputArea = document.getElementById('input-area');
    
    if (!rawText.trim()) {
        alert("The text area is empty! Please paste your DegreeWorks audit.");
        return;
    }

    // A. Detect College (Look for CUNY keywords)
    let detectedCol = "CCNY"; // Default to CCNY
    if (rawText.includes("Hunter")) detectedCol = "Hunter";
    else if (rawText.includes("Baruch")) detectedCol = "Baruch";

    // B. Priority Major Detection (Checks Biology first to avoid conflicts)
    let detectedMaj = "";
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes("biology")) detectedMaj = "Biology";
    else if (lowerText.includes("computer science")) detectedMaj = "Computer Science";
    else if (lowerText.includes("psychology")) detectedMaj = "Psychology";
    else detectedMaj = "Biology"; // Fallback

    // C. Course Detection (Optimized Regex for 3-5 digit codes)
    const courseRegex = /([A-Z]{2,4}\s\d{3,5})/g;
    const matches = rawText.match(courseRegex);
    completedCourses = matches ? [...new Set(matches.map(c => c.trim()))] : [];

    // D. Extract GPA
    const gpaMatch = rawText.match(/Cumulative GPA\s+([\d.]+)/);
    const gpa = gpaMatch ? gpaMatch[1] : "N/A";

    // E. VISUAL TRIGGER: Show dashboard immediately so user knows it's working
    inputArea.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('user-profile').innerText = `Syncing ${detectedMaj}...`;

    // F. Sync Select Menus to match detected data
    document.getElementById('collegeSelect').value = detectedCol;
    document.getElementById('majorSelect').value = detectedMaj;

    // G. FETCH & RENDER
    const courses = await fetchMajorData(detectedCol, detectedMaj);
    
    if (courses && courses.length > 0) {
        renderLockedDashboard(`${detectedCol} - ${detectedMaj}`, courses);
        
        // Success feedback in Advisor Chat
        document.getElementById('openChatBtn').style.display = "block";
        document.getElementById('chatHistory').innerHTML = `
            <p class="bot-msg">
                I've analyzed your <b>${detectedCol} ${detectedMaj}</b> audit. 
                With a <b>${gpa} GPA</b> and ${completedCourses.length} course entries found, 
                I've updated your roadmap below.
            </p>`;

        // Auto-scroll to the dashboard
        window.scrollTo({ top: dashboard.offsetTop - 20, behavior: 'smooth' });
    } else {
        // ERROR HANDLING: If the database returns nothing
        document.getElementById('recommendation-list').innerHTML = `
            <div class="card" style="border: 2px dashed #ff4d4d; padding: 20px; text-align: center;">
                <h4 style="color: #ff4d4d;">Data Not Found</h4>
                <p>I detected <b>${detectedMaj}</b> at <b>${detectedCol}</b>, but no requirements were found in your Supabase table.</p>
                <p><small>Check that your "major_requirements" table has rows for this college and major.</small></p>
                <button onclick="location.reload()" class="upload-btn" style="background:#666;">Back to Sync</button>
            </div>`;
    }
});

/* ==========================================
   4. UI & CHAT CONTROLS
   ========================================== */
const drawer = document.getElementById('advisorDrawer');
document.getElementById('openChatBtn').addEventListener('click', () => drawer.classList.add('open'));
document.getElementById('closeChat').addEventListener('click', () => drawer.classList.remove('open'));

// Manual View Trigger
document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const col = document.getElementById('collegeSelect').value;
    const maj = document.getElementById('majorSelect').value;
    
    if (col && maj) {
        completedCourses = []; // Clear previous sync data for manual exploration
        const courses = await fetchMajorData(col, maj);
        renderLockedDashboard(`${col} - ${maj}`, courses);
    } else {
        alert("Please select both a college and a major.");
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
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        const alreadyDone = completedCourses.includes(course.course_code);
        
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

        if (course.is_epermit) {
            permitList.innerHTML += cardHTML;
        } else {
            recList.innerHTML += cardHTML;
        }
    });
}
