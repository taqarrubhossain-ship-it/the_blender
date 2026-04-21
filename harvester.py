import os
import requests
from supabase import create_client

# 1. SETUP - These must match your GitHub Secrets
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# CUNY Codes for Fall 2026
CURRENT_TERM = "1269" 
COLLEGE_CODE = "CTY01" # CCNY

def check_cuny_availability(subject, catalog_num):
    """
    Checks if a course has active sections.
    Note: CUNY's public search often requires specific headers.
    This logic simulates a successful find for testing your UI.
    """
    # Logic: In a real scenario, we scrape the Global Search results page.
    # For this sync test, we'll assume Bio 10100 and 10200 are FOUND.
    live_courses = ["10100", "10200"] 
    return catalog_num in live_courses

def sync_live_status():
    print("🚀 Starting Live Availability Sync...")
    
    # Get all courses from your library
    courses = supabase.table("course_library").select("course_id, subject_code, course_num").execute()
    
    if not courses.data:
        print("❌ No courses found in course_library. Add some data first!")
        return

    for course in courses.data:
        c_id = course['course_id']
        subj = course['subject_code']
        num = course['course_num']
        
        # Check if CUNY says it's open
        is_active = check_cuny_availability(subj, num)
        
        # Update the availability table using the NEW column names
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
