import xarray as xr
import matplotlib.pyplot as plt

# Open the GRIB2 file
ds = xr.open_dataset("hrrr.t00z.wrfsfcf01.grib2", engine="cfgrib")

# Print the variables
print(ds)

# Extract 2-meter temperature
temp_2m = ds["t2m"]
print(temp_2m)

# Plot the data
temp_2m.plot()
plt.title("2-Meter Temperature")
plt.show()