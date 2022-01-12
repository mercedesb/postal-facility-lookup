# postal-facility-lookup

This repo was made in order to find the facility zipcode for postal SCFs and DDUs when we're missing them.

The input to this script is a file in the root called `missingfacilityzips.csv` which is a CSV file with 3 columns. The first column is the zip code served (5-digit code), the second is the facility type ('scf' or 'ddu') and the third is the facility's zip code.

## SCF process

1. Load up the `FACILITY.csv` (from the USPS https://fast.usps.com/fast/fastApp/resources/dropShipFileDownload.action > Facility File)
2. Load up the SCF file (from the USPS https://fast.usps.com/fast/fastApp/resources/labelListFiles.action > L002 3-Digit ZIP Code Prefix Matrix) 
   1. I had to munge this file a bit to get it to be a valid CSV
3. Find a matching SCF from the SCF file. Then find the facility for that SCF from the facility file by matching on city, state, and where the type is "Main Post Office"

## DDU process
1. Load up the DDU file (from Dietrich Direct https://www.dietrich-direct.com/Mailing-Logistics.htm)
2. Load up the fallback DDU file (from the USPS https://fast.usps.com/fast/fastApp/resources/labelListFilesSearch.action > L606 5-Digit Scheme - Standard Mail, First-Class Mail, and Package Services Parcels)
3. Find a matching DDU from the DDU file
4. If no matching DDU, find a match from the fallback file
   1. Looks for an explicit match or matches on the range if no explicit match is found