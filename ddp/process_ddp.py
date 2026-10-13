import pandas as pd
import psycopg
import os
import time
from dotenv import load_dotenv


def load_ddp_arrests(file_path):
    print("starting to load")
    ddp_arrests = pd.read_excel(file_path, sheet_name="data")
    print("excel read")
    # group by apprehension site landmark and count the number of arrests for each landmark
    ddp_arrests_grouped = ddp_arrests.groupby("apprehension_site_landmark").agg({"apprehension_site_landmark": "count"})
    ddp_arrests_grouped.rename(columns={"apprehension_site_landmark": "Arrests"}, inplace=True)
    ddp_arrests_grouped.reset_index(inplace=True)
    ddp_arrests_grouped.rename(columns={"apprehension_site_landmark": "Site", "Arrests": "Number"}, inplace=True)
    return ddp_arrests_grouped

def save_ddp_arrests(ddp_arrests_grouped):
    # save the grouped arrests to a csv
    ddp_arrests_grouped.to_csv("../public/files/arrests_march.csv", index=False)
    # save the list of all apprehension sites to csv
    ddp_arrests_grouped["Site"].to_csv("ddp_apprehension_sites.csv", index=False)

def load_ddp_detainers(file_path):
    print("starting to load detainers")
    ddp_detainers = pd.read_excel(file_path, sheet_name="data")
    print("excel read")
    # group by facility_city and count number of detainers for each city
    ddp_detainers_grouped = ddp_detainers.groupby("facility_city").agg({"facility_city": "count"})
    ddp_detainers_grouped.rename(columns={"facility_city": "Number"}, inplace=True)
    ddp_detainers_grouped.reset_index(inplace=True)
    ddp_detainers_grouped.rename(columns={"facility_city": "Site"}, inplace=True)
    return ddp_detainers_grouped

def save_ddp_detainers(ddp_detainers_grouped):
    # save the grouped detainers to a csv
    ddp_detainers_grouped.to_csv("../public/files/detain_march.csv", index=False)
    # save the list of all facility cities to csv
    ddp_detainers_grouped["Site"].to_csv("ddp_facility_cities.csv", index=False)


def get_db_connection():
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    return psycopg.connect(os.environ["DATABASE_URL"])


def upload_arrests(file_path):
    print("Reading arrests excel...")
    df = pd.read_excel(file_path, sheet_name="data")
    print(f"Read {len(df)} arrest rows")

    rows = []
    for _, row in df.iterrows():
        app_date = str(row["apprehension_date"].date()) if pd.notna(row.get("apprehension_date")) else None
        if app_date is None:
            continue
        app_time = str(row["apprehension_date_time"].time()) if pd.notna(row.get("apprehension_date_time")) else None
        birth_year = int(row["birth_year"]) if pd.notna(row.get("birth_year")) else 0
        gender = str(row["gender"]) if pd.notna(row.get("gender")) else "Unknown"
        citizenship = str(row["citizenship_country"]) if pd.notna(row.get("citizenship_country")) else "Unknown"
        landmark = str(row["apprehension_site_landmark"]) if pd.notna(row.get("apprehension_site_landmark")) else "Unknown"
        rows.append((app_date, app_time, birth_year, gender, citizenship, landmark))

    print(f"Prepared {len(rows)} rows, uploading...")
    start = time.time()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM "Arrest"')
    cur.executemany(
        'INSERT INTO "Arrest" ("ApprehensionDate", "ApprehensionTime", "BirthYear", "Gender", "CitizenshipCountry", "ApprehensionSiteLandmark") VALUES (%s, %s, %s, %s, %s, %s)',
        rows
    )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Inserted {len(rows)} arrests in {time.time() - start:.1f}s")


def upload_detainers(file_path):
    print("Reading detainers excel...")
    df = pd.read_excel(file_path, sheet_name="data")
    print(f"Read {len(df)} detainer rows")

    rows = []
    for _, row in df.iterrows():
        date = str(row["detainer_prepare_date"].date()) if pd.notna(row.get("detainer_prepare_date")) else None
        if date is None:
            continue
        birth_year = int(row["birth_year"]) if pd.notna(row.get("birth_year")) else 0
        gender = str(row["gender"]) if pd.notna(row.get("gender")) else "Unknown"
        citizenship = str(row["citizenship_country"]) if pd.notna(row.get("citizenship_country")) else "Unknown"
        facility = str(row["detention_facility"]) if pd.notna(row.get("detention_facility")) else "Unknown"
        city = str(row["facility_city"]) if pd.notna(row.get("facility_city")) else "Unknown"
        rows.append((date, birth_year, gender, citizenship, facility, city))

    print(f"Prepared {len(rows)} rows, uploading...")
    start = time.time()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('DELETE FROM "Detainer"')
    cur.executemany(
        'INSERT INTO "Detainer" ("Date", "BirthYear", "Gender", "CitizenshipCountry", "DetentionFacility", "FacilityCity") VALUES (%s, %s, %s, %s, %s, %s)',
        rows
    )
    conn.commit()
    cur.close()
    conn.close()
    print(f"Inserted {len(rows)} detainers in {time.time() - start:.1f}s")


if __name__ == "__main__":
    file_path = "arrests_filtered_20260405_223957.xlsx"
    ddp_arrests_grouped = load_ddp_arrests(file_path)
    save_ddp_arrests(ddp_arrests_grouped)

    file_path = "detainers_filtered_20260405_224313.xlsx"
    ddp_detainers_grouped = load_ddp_detainers(file_path)
    save_ddp_detainers(ddp_detainers_grouped)

    # Upload to database
    print("\n--- Uploading to database ---")
    upload_arrests("arrests_filtered_20260405_223957.xlsx")
    upload_detainers("detainers_filtered_20260405_224313.xlsx")