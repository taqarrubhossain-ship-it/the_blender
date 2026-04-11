// 1. Connection Config
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mock Data: This stays at the top as a "Global Variable" for now
let completedCourses = ["ENG 101", "MATH 150", "BIO 100"];
/* ==========================================
   2. DATABASE FUNCTIONS 
   (The "Fetchers" - This is your #2)
   ========================================== */
async function fetchMajorData(selectedMajor) {
    const { data, error } = await supabase
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
   (The Interactivity - This is your #3)
   ========================================== */

// Handle Manual Selection
document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const selected = document.getElementById('majorSelect').value;
    if (selected) {
        // Reset completed courses for manual exploration mode
        completedCourses = []; 
        
        // Change button text to show it's working
        this.innerText = "Loading...";
        
        const courses = await fetchMajorData(selected);
        renderLockedDashboard(selected, courses);
        
        this.innerText = "View Requirements";
    }
});

// Handle Transcript Upload
document.getElementById('transcriptUpload').addEventListener('change', async function(e) {
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `<h3>Checking Prerequisites...</h3><div class='loader'></div>`;
    
    // Simulate finding specific courses in their transcript
    completedCourses = ["BIO 100", "MATH 150", "ENG 101"]; 
    
    // In a real app, you'd detect the major from the text. 
    // For now, let's pull 'Biology' from the DB as a test.
    const courses = await fetchMajorData("Biology");
    
    setTimeout(() => {
        renderLockedDashboard("Biology", courses);
    }, 1000);
});

/* ==========================================
   4. RENDERING LOGIC 
   (The Visuals - This is your #4)
   ========================================== */
function renderLockedDashboard(major, courses) {
    // Hide the input area and show the dashboard
    document.getElementById('input-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Update the UI headers
    document.getElementById('user-profile').innerText = `${major} Explorer`;
    document.getElementById('detected-major').innerText = `Major: ${major}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    
    // Clear old data
    recList.innerHTML = ""; 
    permitList.innerHTML = "";

    if (!courses) return;

    courses.forEach(course => {
        // LOGIC: Check if they've met the prerequisite stored in Supabase
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        
        const cardHTML = `
            <div class="course-card ${!isMet ? 'is-locked' : ''}">
                <div>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    ${!isMet ? `<span class="prereq-hint">Requires: ${course.prerequisite}</span>` : ''}
                </div>
                <div>${isMet ? '<button class="add-btn">+</button>' : '<span class="lock-icon">🔒</span>'}</div>
            </div>
        `;

        // Sort into either "Major Requirements" or "ePermit" based on DB column
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
        <div class="semester-box"><h4>Year 3</h4><p>Upper level major requirements.</p></div>
    `;
}
// Mock Data: Courses completed by the student (simulated from transcript)
const completedCourses = ["ENG 101", "MATH 150", "BIO 100"];

const majorRequirements = {
    "Biology": [
        { code: "BIOL 203", name: "Genetics", prereq: "BIO 100", type: "core" },
        { code: "CHEM 222", name: "Organic Chem", prereq: "CHEM 101", type: "core" },
        { code: "BIOL 300", name: "Cell Biology", prereq: "BIOL 203", type: "epermit", campus: "Baruch" }
    ],
    "Computer Science": [
        { code: "CSCI 135", name: "Software Design", prereq: "CSCI 127", type: "core" },
        { code: "MATH 155", name: "Calculus II", prereq: "MATH 150", type: "core" },
        { code: "CSCI 340", name: "Operating Systems", prereq: "CSCI 235", type: "epermit", campus: "Hunter" }
    ]
};

document.getElementById('transcriptUpload').addEventListener('change', function(e) {
    const campus = document.getElementById('campusSelect').value;
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `<h3>Checking Prerequisites...</h3><div class='loader'></div>`;
    
    setTimeout(() => {
        // For testing, we'll cycle through Biology then Computer Science
        const major = (Math.random() > 0.5) ? "Biology" : "Computer Science";
        renderLockedDashboard(major, campus);
    }, 1200);
});

function renderLockedDashboard(major, campus) {
    document.getElementById('upload-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('user-profile').innerText = `${major} | ${campus.toUpperCase()}`;

    const recList = document.getElementById('recommendation-list');
    const permitList = document.getElementById('epermit-list');
    recList.innerHTML = ""; 
    permitList.innerHTML = "";

    majorRequirements[major].forEach(course => {
        const isMet = completedCourses.includes(course.prereq);
        const cardHTML = `
            <div class="course-card ${!isMet ? 'is-locked' : ''}">
                <div>
                    <strong>${course.code}</strong> - ${course.name}
                    ${!isMet ? `<span class="prereq-hint">Requires: ${course.prereq}</span>` : ''}
                </div>
                <div>${isMet ? '<button class="add-btn">+</button>' : '<span class="lock-icon">🔒</span>'}</div>
            </div>
        `;

        if (course.type === "core") {
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
        <div class="semester-box"><h4>Year 3</h4><p>Upper level major requirements.</p></div>
    `;
}
