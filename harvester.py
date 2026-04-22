import os
import requests
from supabase import create_client

# 1. SETUP - Syncing with GitHub Secrets & Supabase Fusion Schema
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# Define target colleges and subjects for the 2026 academic year
COLLEGES = {
    "CCNY": "CTY01",
    "Hunter": "HTR01",
    "Baruch": "BCH01"
}
SUBJECTS = ["BIOL", "CSCI", "MATH", "PHYS", "CHEM"]
TERM = "1269"  # Fall 2026

def get_coursicle_logic(subject, course_num):
    """
    Placeholder for the Coursicle Logic extraction.
    This maintains your strategic combination of 'Rules' from Coursicle.
    """
    # In the future, this will hit your Coursicle scraper/endpoint
    return f"Prereq: {subject} introductory sequence"

def sync_fusion_pipeline():
    print("🚀 Starting Strategic Pipeline Sync: CUNY (Live) + Coursicle (Rules)...")
    
    for college_name, college_code in COLLEGES.items():
        print(f"🏛️  Processing {college_name}...")
        
        for subject in SUBJECTS:
            # 2. THE PULSE: Fetch Live Availability from CUNY Global Search
            api_url = f"https://api.cuny.edu/registration/class-search/v1/terms/{TERM}/colleges/{college_code}/subjects/{subject}/classes"
            
            try:
                response = requests.get(api_url, timeout=15)
                if response.status_code == 200:
                    data = response.json().get('classes', [])
                    
                    for c in data:
                        c_id = f"{college_name}-{subject}-{c['catalog_number']}"
                        
                        # A. Update Course Library with Coursicle-style Rules
                        # This prevents 'Missing Classes' by auto-populating discovered courses
                        supabase.table("course_library").upsert({
                            "course_id": c_id,
                            "subject_code": subject,
                            "course_num": c['catalog_number'],
                            "course_name": c['title'],
                            "credits": int(c.get('units', 3)),
                            "prereq_logic": get_coursicle_logic(subject, c['catalog_number'])
                        }).execute()

                        # B. Update Live Status from CUNY Global Search
                        supabase.table("semester_availability").upsert({
                            "course_id": c_id,
                            "is_offered_current": True, # If in results, it is offered
                            "active_semester_code": "Fall 2026",
                            "last_updated": "now()"
                        }).execute()
                        
                    print(f"✅ {college_name}: Synced {len(data)} {subject} courses.")
                else:
                    print(f"⚠️  CUNY API returned {response.status_code} for {subject}")
                    
            except Exception as e:
                print(f"❌ Error syncing {college_name} {subject}: {e}")

if __name__ == "__main__":
    # This replaces the old sync_live_status() with the new Fusion logic
    sync_fusion_pipeline()
