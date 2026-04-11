/* ==========================================
   1. CONNECTION CONFIG
   ========================================== */
const SUPABASE_URL = 'https://mwwanyhnrbyrndnzqygp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gKsUflWwvYveDY3CtY6Sww_Q9WMOJAg';

// FIX: Ensure this variable name matches what you use in your functions
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State management: what the user has finished
let completedCourses = ["ENG 101", "MATH 150", "BIO 100"];

/* ==========================================
   2. DATABASE FUNCTIONS 
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
   ========================================== */

// Handle Manual Selection
document.getElementById('viewMajorBtn').addEventListener('click', async function() {
    const selected = document.getElementById('majorSelect').value;
    if (selected) {
        completedCourses = []; // Exploration mode starts empty
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
    
    // Simulate finding specific courses in transcript
    completedCourses = ["BIO 100", "MATH 150", "ENG 101"]; 
    
    // Fetch data from Supabase
    const courses = await fetchMajorData("Biology");
    
    setTimeout(() => {
        renderLockedDashboard("Biology", courses);
    }, 1000);
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
        recList.innerHTML = "<p>No courses found for this major in database.</p>";
        return;
    }

    courses.forEach(course => {
        // Match these keys EXACTLY to your Supabase column names
        const isMet = !course.prerequisite || completedCourses.includes(course.prerequisite);
        
        const cardHTML = `
            <div class="course-card ${!isMet ? 'is-locked' : ''}">
                <div>
                    <strong>${course.course_code}</strong> - ${course.course_name}
                    ${!isMet ? `<span class="prereq-hint">Requires: ${course.prerequisite}</span>` : '<span style="color:green; font-size:0.7rem;">✓ Eligible</span>'}
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
        <div class="semester-box"><h4>Year 3</h4><p>Upper level major requirements.</p></div>
    `;
}
