import os
import requests
from supabase import create_client

# 1. SETUP
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# CUNY Semester Codes (e.g., 1269 = Fall 2026, 1272 = Spring 2027)
CURRENT_TERM = "1269" 
COLLEGE_CODE = "CTY01" # CCNY Code

def check_cuny_availability(subject, catalog_num):
    """Checks CUNY's internal API for active class sections."""
    try:
        # We query the Global Search backend directly for speed
        search_url = f"https://api.cuny.edu/registration/class-search/v1/terms/{CURRENT_TERM}/colleges/{COLLEGE_CODE}/subjects/{subject}/catalog-numbers/{catalog_num}"
        # Note: This is a conceptual endpoint; real scraping often requires 
        # handling specific headers or session cookies.
        response = requests.get(search_url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            # If sections exist, the course is 'offered'
            return len(data.get('sections', [])) > 0
        return False
    except Exception as e:
        print(f"⚠️ Error checking {subject} {catalog_num}: {e}")
        return False

def sync_live_status():
    print("🚀 Starting Live Availability Sync...")
    
    # Get all courses from your library
    courses = supabase.table("course_library").select("course_id, subject_code, course_num").execute()
    
    for course in courses.data:
        c_id = course['course_id']
        subj = course['subject_code']
        num = course['course_num']
        
        # Check CUNY
        is_active = check_cuny_availability(subj, num)
        
        # Update the 'semester_availability' table
        # This uses 'upsert' which means: "Update if exists, insert if it doesn't"
        supabase.table("semester_availability").upsert({
            "course_id": c_id,
            "is_offered_current": is_active,
            "active_semester_code": "Fall 2026",
            "last_updated": "now()"
        }).execute()
        
        status_icon = "🟢" if is_active else "⚪"
        print(f"{status_icon} {c_id}: Offered = {is_active}")

if __name__ == "__main__":
    sync_live_status()
