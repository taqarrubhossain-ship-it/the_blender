import os
import requests
from supabase import create_client

# 1. SETUP - Syncing with GitHub Secrets
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

# The strategic combination targets
COLLEGES = {
    "CCNY": "CTY01",
    "Hunter": "HTR01",
    "Baruch": "BCH01"
}
# Subject codes for your expansion plan
SUBJECTS = ["BIOL", "CSCI", "MATH", "PHYS", "CHEM"]
TERM = "1269" # Fall 2026

def get_coursicle_logic(subject, course_num):
    """
    Simulates the Coursicle 'Rules' extraction.
    Ensures your strategic data pipeline has a placeholder for prereqs.
    """
    return f"Prereq: {subject} sequence or Department Approval"

def sync_fusion_pipeline():
    print("🚀 Starting Strategic Pipeline Sync (Virtual Fallback)...")
    
    for college_name, college_code in COLLEGES.items():
        print(f"🏛️  Populating ecosystem for {college_name}...")
        
        for subject in SUBJECTS:
            # Note: We are using a list of 'Core' courses to build your library
            # This ensures your UI is never empty while the API is blocked.
            discovery_list = [
                {"num": "10100", "name": f"Foundations of {subject} I"},
                {"num": "10200", "name": f"Foundations of {subject} II"},
                {"num": "20100", "name": f"Advanced {subject} Theory"},
                {"num": "30100", "name": f"{subject} Research Seminar"}
            ]
            
            for c in discovery_list:
                c_id = f"{college_name}-{subject}-{c['num']}"
                
                try:
                    # 1. THE MAP: Populate Course Library (Rules)
                    supabase.table("course_library").upsert({
                        "course_id": c_id,
                        "subject_code": subject,
                        "course_num": c['num'],
                        "course_name": c['name'],
                        "credits": 4,
                        "prereq_logic": get_coursicle_logic(subject, c['num'])
                    }).execute()

                    # 2. THE PULSE: Set Live Availability (Status)
                    # Marking as 'True' so they turn BLUE in your UI for testing
                    supabase.table("semester_availability").upsert({
                        "course_id": c_id,
                        "is_offered_current": True,
                        "active_semester_code": "Fall 2026",
                        "last_updated": "now()"
                    }).execute()
                
                except Exception as e:
                    print(f"⚠️  Database write error for {c_id}: {e}")

            print(f"✅ {college_name}: {subject} ecosystem initialized.")

if __name__ == "__main__":
    sync_fusion_pipeline()
    print("✨ Sync Complete. Check your website for Blue 'Ready to Take' cards!")
