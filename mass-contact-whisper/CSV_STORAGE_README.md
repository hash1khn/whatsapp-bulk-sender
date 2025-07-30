# CSV Storage System for Contacts

This document describes the new CSV-based storage system for contacts in the mass contactor application.

## Overview

The application now uses a CSV-based storage system instead of browser localStorage for better data management, portability, and reliability. Contacts are stored in a structured CSV format that can be easily imported, exported, and backed up.

## CSV Format

The CSV file uses the following structure:

```csv
"ID","Supplier Name","Part Type","Conditions","WhatsApp Number"
"example-id-1","ABC Motors","Engine Parts","new;used","+1234567890"
"example-id-2","XYZ Auto","Brake Pads","new","+0987654321"
```

### Fields

- **ID**: Unique identifier for each contact (auto-generated if not provided)
- **Supplier Name**: Name of the supplier or business
- **Part Type**: Type of automotive parts they deal with
- **Conditions**: Semicolon-separated list of conditions (new, used, aftermarket)
- **WhatsApp Number**: Contact's WhatsApp number in international format

## Features

### 1. CSV Import
- Import contacts from CSV files
- Supports both old format (4 columns) and new format (5 columns with ID)
- Automatic validation and error handling
- Backward compatibility with existing data

### 2. CSV Export
- Export all contacts as a properly formatted CSV file
- Includes all contact data with proper escaping
- Ready for backup or sharing

### 3. Template Download
- Download a CSV template with example data
- Shows the correct format for manual data entry
- Includes sample contacts for reference

### 4. Backup & Restore
- Create automatic backups of contact data
- Restore from previous backups
- Protects against data loss

### 5. Migration
- Automatic migration from old localStorage format
- Preserves existing contact data
- Seamless transition to new system

## Usage

### Importing Contacts

1. **Download Template**: Use the "Download Template" button to get the correct CSV format
2. **Prepare Data**: Fill in your contact data following the template format
3. **Import**: Use the CSV Import component to upload your file
4. **Validation**: The system will validate and import your contacts

### Exporting Contacts

1. **Export**: Use the "Export Contacts" button in the CSV Management section
2. **Download**: The CSV file will be automatically downloaded
3. **Backup**: Save the file for backup purposes

### Backup & Restore

1. **Create Backup**: Use "Create Backup" to save current contacts
2. **Restore**: Use "Restore Backup" to recover from a previous backup
3. **Automatic**: Backups are created automatically during operations

## Technical Implementation

### Storage Service

The system uses `CsvStorageService` for all CSV operations:

```typescript
// Read contacts from CSV
const contacts = await CsvStorageService.getAllContacts();

// Save contacts to CSV
await CsvStorageService.saveAllContacts(contacts);

// Import from CSV string
await CsvStorageService.importContactsFromCsv(csvContent);

// Export as CSV string
const csvContent = await CsvStorageService.exportContactsAsCsv();
```

### Data Migration

The system automatically migrates existing localStorage data:

1. Checks for existing contacts in localStorage
2. Converts old format to new format
3. Saves to CSV storage
4. Removes old localStorage data

### Error Handling

- Invalid CSV format detection
- Missing or malformed data handling
- Graceful fallback to localStorage
- User-friendly error messages

## Benefits

### 1. Data Portability
- CSV files can be opened in Excel, Google Sheets, etc.
- Easy to share and collaborate
- Standard format for data exchange

### 2. Reliability
- No browser storage limitations
- Automatic backups prevent data loss
- Better error handling and recovery

### 3. Scalability
- Handles large contact lists efficiently
- No localStorage size restrictions
- Better performance with large datasets

### 4. User Control
- Users can manually edit CSV files
- Full control over data format
- Easy to integrate with external systems

## File Locations

- **CSV Storage Service**: `src/lib/csvStorage.ts`
- **Updated Storage Service**: `src/lib/storage.ts`
- **CSV Import Component**: `src/components/CsvImport.tsx`
- **CSV Management Component**: `src/components/CsvManagement.tsx`
- **Updated Contacts Hook**: `src/hooks/useContacts.ts`

## Migration Notes

### For Existing Users

1. **Automatic Migration**: Existing contacts will be automatically migrated
2. **No Data Loss**: All existing data is preserved
3. **Backward Compatibility**: Old import/export methods still work
4. **Seamless Transition**: No user action required

### For New Users

1. **Start Fresh**: New installations use CSV storage by default
2. **Template Available**: Download template for easy data entry
3. **Best Practices**: Follow the template format for best results

## Troubleshooting

### Common Issues

1. **Import Fails**: Check CSV format matches template
2. **Export Empty**: Ensure contacts exist before exporting
3. **Backup Fails**: Check browser permissions for file operations

### Support

- Use the template for correct CSV format
- Check browser console for detailed error messages
- Ensure all required fields are filled
- Validate WhatsApp numbers are in international format

## Future Enhancements

- Cloud storage integration
- Real-time collaboration
- Advanced filtering and search
- Bulk operations optimization
- API integration for external data sources 