import os
import xarray as xr
import json
import requests
from datetime import datetime

# Function to download the latest HRRR file
def download_hrrr():
    current_date = datetime.utcnow().strftime("%Y%m%d")
    file_url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/hrrr/prod/hrrr.{current_date}/conus/hrrr.t00z.wrfsfcf01.grib2"
    file_name = "hrrr_latest.grib2"

    print(f"Downloading: {file_url}")

    # Use curl instead of wget
    response = requests.get(file_url, stream=True)

    if response.status_code == 200:
        with open(file_name, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    f.write(chunk)
        print("Download complete.")
    else:
        raise FileNotFoundError("HRRR file download failed!")

    return file_name


# Function to process HRRR and extract temperature data
def process_hrrr(file_name):
    ds = xr.open_dataset(file_name, engine="cfgrib")
    
    # Extract data
    temp_2m = ds["t2m"].values - 273.15  # Convert Kelvin to Celsius
    lats = ds["latitude"].values
    lons = ds["longitude"].values

    # Format data into JSON-friendly structure
    data = {"temperature": temp_2m.tolist(), "latitude": lats.tolist(), "longitude": lons.tolist()}

    # Save as JSON
    with open("hrrr_forecast.json", "w") as f:
        json.dump(data, f)

    print("HRRR forecast saved as JSON.")

# Run the pipeline
try:
    file_name = download_hrrr()
    process_hrrr(file_name)
except Exception as e:
    print(f"Error processing HRRR: {e}")
