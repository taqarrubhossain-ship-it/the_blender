// Mock Database: In a real app, this would be a JSON file or API
const majorRequirements = {
    "Biology": {
        core: ["BIOL 203 (Genetics)", "CHEM 222 (Organic Chem)"],
        epermit: [{code: "BIOL 300", campus: "Baruch"}, {code: "BIOL 230", campus: "CCNY"}]
    },
    "Computer Science": {
        core: ["CSCI 235 (Software Design)", "MATH 155 (Calculus II)"],
        epermit: [{code: "CSCI 340", campus: "Hunter"}, {code: "MATH 210", campus: "Queens"}]
    },
    "Psychology": {
        core: ["PSYCH 248 (Stats)", "PSYCH 250 (Developmental)"],
        epermit: [{code: "PSYCH 300", campus: "Lehman"}, {code: "SOC 101", campus: "John Jay"}]
    }
};

document.getElementById('transcriptUpload').addEventListener('change', function(e) {
    const campus = document.getElementById('campusSelect').value;
    
    // UI Feedback: Simulate "Reading" the PDF/Text
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `<h3>Analyzing Transcript for ${campus.toUpperCase()}...</h3><div class='loader'></div>`;
    
    setTimeout(() => {
        // Mock Logic: In reality, your backend would parse the text to find the major
        // For this demo, we'll randomly pick a major to show it works for any.
        const majors = Object.keys(majorRequirements);
        const detectedMajor = majors[Math.floor(Math.random() * majors.length)];
        
        renderUniversalDashboard(detectedMajor, campus);
    }, 1500);
});

function renderUniversalDashboard(major, campus) {
    document.getElementById('upload-area').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Update Profile Header
    document.getElementById('user-profile').innerText = `${major} Student | ${campus.charAt(0).toUpperCase() + campus.slice(1)}`;
    document.getElementById('detected-major').innerText = `Major: ${major}`;
    document.getElementById('credits-count').innerText = `Credits Earned: ${Math.floor(Math.random() * 40) + 20}`;

    const data = majorRequirements[major];

    // Render Major Specific Recommendations
    const recList = document.getElementById('recommendation-list');
    recList.innerHTML = ""; // Clear
    data.core.forEach(course => {
        recList.innerHTML += `
            <div class="course-card">
                <div><strong>${course}</strong><br><small>Required for Degree Progress</small></div>
                <button class="add-btn">+</button>
            </div>`;
    });

    // Render Major Specific ePermits
    const permitList = document.getElementById('epermit-list');
    permitList.innerHTML = ""; // Clear
    data.epermit.forEach(item => {
        permitList.innerHTML += `
            <div class="course-card" style="border-left-color: #27AE60">
                <div><strong>${item.code}</strong> <span class="epermit-tag">${item.campus}</span></div>
                <button class="add-btn">+</button>
            </div>`;
    });

    renderGenericTimeline();
}

function renderGenericTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = "";
    ["Upcoming Semester", "Following Semester", "Final Year"].forEach(label => {
        timeline.innerHTML += `
            <div class="semester-box">
                <h4>${label}</h4>
                <p style="font-size: 0.8rem">3x Major Courses<br>1x General Ed<br>1x Elective</p>
            </div>`;
    });
}
