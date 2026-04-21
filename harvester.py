import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# 1. SETUP: Connect to your "Pantry" (Supabase)
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def sync_ccny_biology():
    print("🚀 Starting CCNY Biology Catalog Sync...")
    
    # YOUR PROTOCOL: [College] Catalog [Major]
    # Source: CCNY Undergraduate Bulletin for Biology BS
    catalog_url = "https://ccny-undergraduate.catalog.cuny.edu/programs/BIOL-BS"
    
    try:
        response = requests.get(catalog_url)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # LOGIC: In the Bulletin, core classes are often in a 'program-requirements' div
        # For this test, we are manually mapping the 'Ground Truth' codes 
        # that our scraper will eventually automate for 20+ colleges.
        
        major_data = [
            {"id": "CCNY-BIO-10100", "name": "Biological Foundations I", "type": "Core"},
            {"id": "CCNY-BIO-10200", "name": "Biological Foundations II", "type": "Core"},
            {"id": "CCNY-BIO-20600", "name": "Introduction to Genetics", "type": "Core"},
            {"id": "CCNY-BIO-22800", "name": "Ecology and Evolution", "type": "Core"},
            {"id": "CCNY-BIO-31100", "name": "Molecular Biology", "type": "Elective"},
        ]

        for course in major_data:
            # Upsert into Library (The Details)
            supabase.table("course_library").upsert({
                "course_id": course["id"],
                "course_name": course["name"],
                "subject_code": "BIO",
                "course_num": course["id"].split('-')[-1]
            }).execute()

            # Upsert into Rules (The Requirements)
            supabase.table("major_rules").upsert({
                "college_name": "CCNY",
                "major_name": "Biology",
                "course_id": course["id"],
                "requirement_type": course["type"]
            }).execute()

        print("✅ CCNY Biology Rules Updated in Supabase!")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_ccny_biology()
