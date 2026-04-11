import pandas as pd


def load_ddp_arrests(file_path):
    print("starting to load")
    ddp_arrests = pd.read_excel(file_path, sheet_name="data")
    print("excel read")
    # ddp_arrests = ddp_arrests[ddp_arrests["State"] == "MASSACHUSETTS"]
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

if __name__ == "__main__":
    file_path = "arrests_filtered_20260405_223957.xlsx"
    ddp_arrests_grouped = load_ddp_arrests(file_path)
    save_ddp_arrests(ddp_arrests_grouped)

    file_path = "detainers_filtered_20260405_224313.xlsx"
    ddp_detainers_grouped = load_ddp_detainers(file_path)
    save_ddp_detainers(ddp_detainers_grouped)