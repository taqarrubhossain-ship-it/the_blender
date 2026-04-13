/* ==========================================
   1. CONNECTION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

// Use 'db' to avoid conflict with the global 'supabase' object from the CDN
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State management: starts empty until transcript is "read" or major is selected
let completedCourses = [];

/* ==========================================
   2. DATABASE FUNCTIONS 
   ========================================== */
async function fetchMajorData(selectedMajor) {
    const { data, error } = await db
        .from('major_requirements') 
        .select('*')
        .eq('major_name', selectedMajor);

    if (error) {
        console.error('Error fetching data:', error);
        return null;
    }
    return data;
}

/* ==========================================
   3. EVENT LISTENERS
   ========================================== */

// Handle Manual Selection (Option B)
document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const selected = document.getElementById('majorSelect').value;
    if (selected) {
        completedCourses = []; // Exploration mode: nothing is finished yet
        this.innerText = "Loading...";
        
        const courses = await fetchMajorData(selected);
        renderLockedDashboard(selected, courses);
        
        this.innerText = "View Requirements";
    } else {
        alert("Please select a major first!");
    }
});

// Handle Transcript Upload (Option A)
document.getElementById('transcriptUpload').addEventListener('change', async function(e) {
    // Matches the ID in your HTML
    const inputArea = document.getElementById('input-area');
    inputArea.innerHTML = `<div class="card" style="grid-column: span 2;"><h3>Detecting Major Requirements...</h3><div class='loader'></div></div>`;
    
    // Simulation: What the student has already finished
    completedCourses = ["BIO 100", "MATH 150", "ENG 101", "PSY 101"]; 
    
    // Simulation: Change this string to test "Biology", "Computer Science", or "Psychology"
    const simulatedMajor = "Psychology"; 
    
    const courses = await fetchMajorData(simulatedMajor);
    
    setTimeout(() => {
        renderLockedDashboard(simulatedMajor, courses);
    }, 1200);
});

/* ==========================================
   4. RENDERING LOGIC 
   ========================================== */
function renderLockedDashboard(major, courses) {
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    document.getElementById('user-profile').innerText = `${major} Explorer`;
    document.getElementById('detected-major').innerText = `Major: ${major}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    
    recList.innerHTML = ""; 
    permitList.innerHTML = "";

    if (!courses || courses.length === 0) {
        recList.innerHTML = `<p>No courses found for ${major} in the database. Please check your Supabase entries.</p>`;
        return;
    }

    courses.forEach(course => {
        // Logic check: Is there a prerequisite? If so, is it in our completed list?
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        
        const cardHTML = `
            <div class="course-card ${!isMet ? 'is-locked' : ''}">
                <div>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    ${!isMet ? 
                        `<span class="prereq-hint">Requires: ${course.prerequisite}</span>` : 
                        '<span style="color:var(--success-green); font-size:0.7rem;">✓ Eligible</span>'}
                </div>
                <div>${isMet ? '<button class="add-btn">+</button>' : '<span class="lock-icon">🔒</span>'}</div>
            </div>
        `;

        if (!course.is_epermit) {
            recList.innerHTML += cardHTML;
        } else {
            permitList.innerHTML += cardHTML;
        }
    });
    
    renderGenericTimeline();
}

function renderGenericTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = `
        <div class="semester-box"><h4>Next Semester</h4><p>Focus on clearing missing prerequisites.</p></div>
        <div class="semester-box"><h4>Year 3</h4><p>Core upper-level requirements.</p></div>
        <div class="semester-box"><h4>Year 4</h4><p>Capstone and final electives.</p></div>
    `;
}
