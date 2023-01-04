# BCOEM Auto Label Printer
Web app to automatically check in and print labels for BCOEM using a dedicated label printer

## Requirements
### Hardware
- PC running Microsoft Windows (will work on Mac, but label printing is very slow)
- Dymo 450 or 450XL USB label printer
- HID compliant laser scanner with Code31 compatibility. Must put CRLF at end of scan output.

### Software
- Chrome or Firefox Web Browser
- MySQL database
- [Dymo Connect Web Framework](https://s3.amazonaws.com/download.dymo.com/dymo/Software/Win/DCDSetup1.3.2.18.exe) installed and running

## Setup
### Server
1. Deploy the NodeJS application with the following environmental variables set:
  - `DB_ADDRESS="https://some.mysql.database.com:3306"`
  - `DB_NAME="mysql_database_name"`
  - `DB_USERNAME="mysql_database_username_with_write_access"`
  - `DB_PASSWORD="mysql_database_password_for_username"`
  - `PASSPHRASE="simple_passphrase_that_is_easy_to_remember`
2. Run `index.js` to start the server. Databases should be auto-initialized

### BCOEM - can be done in advance
1. Enter the BCOEM instance base URL
2. Enter the QR code password. 
  - If you have not set up a QR passcode, you can set it up in the BCOEM Admin panel under `Competition Preparation` -> `Competition Info` -> `QR Code Log On Password`
3. If you are using multiple BCOEM instances, enter the entry prefix. If not, leave it blank.
  - For example, if splitting beers and meads and meads have a "M000001" format on the label, enter `M` here on the mead BCOEM instance. 
4. Ensure the Instance appears under "Instance Status" as connected.
  - If the instance disconnects after some time, click the circular arrow to attempt to reconnect
  - To remove an instance, click the red "X" button next to it

### Entry Master List - can be done in advance
1. Download the master list excel template [here](https://github.com/CIA-Homebrew/bcoem-auto-label-printer/raw/main/UPLOAD_TEMPLATE.xlsx)
2. Update the list with your competition / BCOEM data
3. Navigate to the `/setup` page
4. Click "Import Entries (.xlsx)"
5. If you are using multiple BCOEM instances, enter the entry prefix. If not, leave it blank.
  - For example, if splitting beers and meads and meads have a "M000001" format on the label, enter `M` here on the mead BCOEM instance. 
6. Select your excel file when prompted to upload

### System - needs to be done on each check in station machine
1. Navigate to the `/setup` page
2. Enter the passphrase from step 1 under passphrase
3. Set a SystemId. Each check in station should have a unique ID.
4. If desired, set a base counter value. 

## Check In
1. Navigate to the `/` (home) page
2. Ensure the instance status(es) are shown as "Connected"
  - If an instance is disconnected, navigate to the `/setup` page and click the refresh icon to attempt to reconnect
3. Place cursor in the "Entry Number Input" text box
4. Use laser scanner to scan entries
  - After scanning, the printer should print 4 labels
5. Place the top sticker (without a barcode) on the cap of the bottle, and the bottom sticker (with barcode) on the corresponding bottle entry label
6. Distribute bottles to respective boxes per label data

## Validation
1. Navigate to the `/verify` page
2. Enter a box number
3. Collect all the entry labels from that box
4. In order, scan the large entry label followed by the small sticker label
5. Entries that are validated will be highlighted in green on the list
  - Entries that are invalid will be highlighted in red
6. To re-print a entry labels sticker, press the "Reprint Label" button on the entry number row
