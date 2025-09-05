import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timezone
import os

# This mapping is CRUCIAL. It converts the human-readable text found on university websites
# to the precise course IDs used in the JavaScript application's course-data.js file.
# This dictionary MUST be maintained for the tool to function correctly.
COURSE_MAPPING = {
    "English Language Arts 30-1": "ELA30-1",
    "Mathematics 30-1": "MATH30-1",
    "Mathematics 30-2": "MATH30-2",
    "Mathematics 31": "MATH31",
    "Biology 30": "BIO30",
    "Chemistry 30": "CHEM30",
    "Physics 30": "PHY30",
    "Social Studies 30-1": "SS30-1",
    "Art 30": "ART30",
    "Drama 30": "DRAMA30",
    "Instrumental Music 30": "MUSIC30",
    "French 30": "FRENCH30",
    "Spanish 30": "SPANISH30",
    "Computing Science, Advanced": "COMP30", # Example mapping
}

def scrape_ucalgary():
    """
    Scrapes the University of Calgary undergraduate programs for admission requirements.

    NOTE: Web scraping is inherently fragile and depends on the website's HTML structure.
    This function targets a structure observed at a point in time and may need
    adjustments if ucalgary.ca changes its layout.
    """
    university_name = "University of Calgary"
    base_url = "https://www.ucalgary.ca"
    programs_url = f"{base_url}/future-students/undergraduate/explore-programs"
    
    programs_data = {}

    try:
        print(f"Fetching program list from: {programs_url}")
        response = requests.get(programs_url, timeout=10)
        response.raise_for_status() # Raise an exception for HTTP errors
        soup = BeautifulSoup(response.text, 'html.parser')

        # This selector targets the links in the program list table. It is specific
        # and may need updating if the site's design changes.
        program_links = soup.select('td.views-field-title a[href^="/future-students/undergraduate/explore-programs/"]')
        
        print(f"Found {len(program_links)} program links. Beginning scrape...")

        for link in program_links:
            program_name = link.get_text(strip=True)
            program_url = f"{base_url}{link.get('href')}"
            
            print(f"  - Scraping: {program_name}")
            
            try:
                prog_res = requests.get(program_url, timeout=10)
                prog_res.raise_for_status()
                prog_soup = BeautifulSoup(prog_res.text, 'html.parser')

                # Find the admission requirements section. UCalgary often uses a standard component.
                reqs_list = []
                requirements_section = prog_soup.find('div', class_='paragraph--type--requirements-by-faculty')
                
                if requirements_section:
                    # Find all list items, which typically contain the course names.
                    list_items = requirements_section.find_all('li')
                    for item in list_items:
                        course_name_raw = item.get_text(strip=True).split(' (')[0] # Clean text like "Biology 30 (or equivalent)"
                        if course_name_raw in COURSE_MAPPING:
                            reqs_list.append(COURSE_MAPPING[course_name_raw])
                
                if not reqs_list:
                    print(f"    - WARNING: Could not find structured requirements for {program_name}. Skipping.")
                    continue
                    
                programs_data[program_name] = {
                    "url": program_url,
                    "required_courses": sorted(list(set(reqs_list))), # Remove duplicates and sort
                    "min_avg_range": "See website", # This is often presented in a way that is difficult to scrape reliably.
                    "notes": "Admission requirements scraped automatically. Always verify on the official website."
                }
            except requests.exceptions.RequestException as e:
                print(f"    - ERROR: Could not fetch program page {program_url}: {e}")

    except requests.exceptions.RequestException as e:
        print(f"FATAL ERROR: Could not fetch the main program list: {e}")
        return None

    return {
        university_name: {
            "last_scraped": datetime.now(timezone.utc).isoformat(),
            "programs": programs_data
        }
    }

def main():
    """
    Main function to run all scrapers and update the central JSON data file.
    """
    print("Starting the web scraping process...")
    
    # In a real application, you would add calls to scrape other universities here.
    # e.g., ualberta_data = scrape_ualberta()
    ucalgary_data = scrape_ucalgary()
    
    # Determine the absolute path to the JSON file relative to the script's location
    script_dir = os.path.dirname(__file__)
    output_path = os.path.join(script_dir, '..', 'data', 'university_requirements.json')

    # Load the existing data to update it, not overwrite it completely
    try:
        with open(output_path, 'r') as f:
            final_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        final_data = {} # Start with an empty dict if the file doesn't exist or is invalid

    if ucalgary_data:
        # Update the dictionary with the newly scraped data for the specific university
        final_data.update(ucalgary_data)
        print("Successfully scraped and merged University of Calgary data.")
    else:
        print("Scraping for University of Calgary failed. The JSON file will not be updated for this university.")

    # Write the combined data back to the JSON file
    try:
        with open(output_path, 'w') as f:
            json.dump(final_data, f, indent=2)
        print(f"Successfully wrote updated data to {output_path}")
    except IOError as e:
        print(f"ERROR: Could not write to file {output_path}: {e}")
        
    print("Scraping process finished.")

if __name__ == "__main__":
    main()

# --- HOW TO MAKE IT SELF-SUSTAINING ---
# This script can be run automatically on a schedule using a free service like GitHub Actions.
# This ensures the university data is periodically refreshed without any manual intervention.
#
# INSTRUCTIONS FOR AUTOMATION:
#
# 1. Create a file in your repository at this exact path: `.github/workflows/scrape_data.yml`
#
# 2. Add the following content to that YAML file:
#
#    name: Scrape University Data
#
#    on:
#      schedule:
#        # Runs on the 1st day of every month at 5:00 AM UTC.
#        # Use https://crontab.guru to customize the schedule.
#        - cron: '0 5 1 * *'
#      workflow_dispatch: # Allows you to manually trigger the script from the GitHub Actions tab.
#
#    jobs:
#      scrape:
#        runs-on: ubuntu-latest
#        steps:
#          - name: Check out repository
#            uses: actions/checkout@v4
#
#          - name: Set up Python
#            uses: actions/setup-python@v5
#            with:
#              python-version: '3.11'
#
#          - name: Install dependencies
#            run: |
#              python -m pip install --upgrade pip
#              pip install -r scraper/requirements.txt
#
#          - name: Run scraper to update data file
#            run: python scraper/scraper.py
#
#          - name: Commit and push if there are changes
#            run: |
#              git config --global user.name 'GitHub Actions Scraper'
#              git config --global user.email 'actions-bot@github.com'
#              git add data/university_requirements.json
#              # The following command exits with 0 if there are no changes, and 1 if there are changes.
#              git diff --staged --quiet || (git commit -m "Automated: Update university requirements data" && git push)
#
# 3. Commit and push this new `.yml` file to your repository.
#
# Now, the scraper will run automatically on the first of every month. If it finds any changes
# to the admission requirements and updates the `university_requirements.json` file, the GitHub Action
# will automatically commit the new file back to your repository, ensuring the live website
# always has the most recent data. This is the key to a "self-sustaining" tool.