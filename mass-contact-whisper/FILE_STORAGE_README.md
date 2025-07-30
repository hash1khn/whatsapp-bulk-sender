# File Storage System for Contacts

This document describes the file-based storage system that stores contacts as actual CSV files within the project directory.

## Overview

The application now supports **true local file storage** using the File System Access API, allowing contacts to be stored as CSV files within your project directory. This means:

- ✅ **Contacts are stored in actual files** in the `data/` directory
- ✅ **Files are included in Git** when you push to GitHub
- ✅ **Data persists across devices** when you clone the repository
- ✅ **No browser storage limitations**
- ✅ **Easy backup and version control**

## File Structure

```
mass-contact-whisper/
├── data/
│   ├── contacts.csv          # Main contacts file
│   └── contacts_backup.csv   # Backup file (optional)
├── src/
│   └── lib/
│       ├── fileStorage.ts    # File storage service
│       └── storage.ts        # Main storage interface
└── ...
```

## How It Works

### 1. File System Access API
The system uses the modern **File System Access API** (available in Chrome, Edge, and other Chromium-based browsers) to:
- Read contacts from CSV files
- Write contacts to CSV files
- Allow users to select their contacts file
- Provide file-based backup and restore

### 2. Fallback to Browser Storage
If the File System Access API is not supported:
- Contacts are stored in browser localStorage
- All functionality still works
- Data can be exported as CSV files

### 3. Automatic Migration
- Existing localStorage data is automatically migrated
- No data loss during transition
- Seamless user experience

## Setup Instructions

### For New Users

1. **Start the application** in a modern browser (Chrome, Edge, etc.)
2. **Navigate to Contacts page**
3. **Click "Select Contacts File"** in the Storage Status section
4. **Choose or create** a `contacts.csv` file in your `data/` directory
5. **Start adding contacts** - they'll be saved to the file

### For Existing Users

1. **Your existing contacts** will be automatically loaded
2. **Click "Select Contacts File"** to enable file storage
3. **Choose the `data/contacts.csv`** file in your project
4. **Your contacts will be migrated** to the file automatically

## CSV File Format

The contacts are stored in this format:

```csv
"ID","Supplier Name","Vehicle Make","Conditions","Part Category","WhatsApp Number"
"example-1","ABC Motors","Toyota","new;used","Engine Parts;Transmission","+1234567890"
"example-2","XYZ Auto","Honda","new","Brake Pads;Suspension","+0987654321"
```

### Fields Explained

- **ID**: Unique identifier (auto-generated if not provided)
- **Supplier Name**: Name of the supplier or business
- **Vehicle Make**: Make of the vehicle (e.g., Toyota, Honda, BMW)
- **Conditions**: Semicolon-separated list (new, used, aftermarket)
- **Part Category**: Semicolon-separated list of part categories (e.g., Engine Parts, Brake Pads)
- **WhatsApp Number**: Contact's WhatsApp number in international format

## Browser Requirements

### Supported Browsers
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ✅ Other Chromium-based browsers

### Requirements
- **HTTPS or localhost** (File System Access API requires secure context)
- **Modern browser** with File System Access API support
- **User permission** to access files

### Fallback
- **Firefox, Safari**: Uses browser localStorage with CSV export/import
- **Older browsers**: Falls back to localStorage
- **No internet**: Works offline with localStorage

## Features

### 1. File-Based Storage
- Contacts stored in actual CSV files
- Files included in Git repository
- Version control for contact data
- Easy backup and sharing

### 2. Automatic Backup
- Creates backup files automatically
- Restore from backup functionality
- Dual storage (file + localStorage)

### 3. Import/Export
- Import from CSV files
- Export to CSV files
- Template download
- Bulk operations

### 4. Migration Support
- Automatic migration from localStorage
- Preserves existing data
- No data loss

## Usage Examples

### Adding a New Contact
1. Fill in the contact form
2. Click "Add Contact"
3. Contact is saved to the CSV file
4. File is automatically updated

### Importing Contacts
1. Prepare a CSV file with your contacts
2. Use the "Import CSV" feature
3. Select your file
4. Contacts are imported and saved to the main file

### Exporting Contacts
1. Click "Export Contacts" in CSV Management
2. CSV file is downloaded
3. Contains all current contacts

### Creating Backup
1. Click "Create Backup" in CSV Management
2. Choose location for backup file
3. Backup is created with timestamp

## Git Integration

### Including in Repository
The `data/` directory is tracked by Git, so:
- Contacts are included when you push to GitHub
- Other developers get the same contacts when they clone
- Version control tracks changes to contacts
- Easy collaboration on contact data

### Example Git Workflow
```bash
# Add contacts
git add data/contacts.csv
git commit -m "Add new supplier contacts"
git push origin main

# Other developers
git pull origin main
# They now have the updated contacts
```

## Troubleshooting

### File System Access Not Available
**Problem**: "Your browser doesn't support file system access"

**Solutions**:
1. Use Chrome, Edge, or other Chromium-based browser
2. Ensure you're on HTTPS or localhost
3. Check browser permissions
4. Use localStorage fallback (still works)

### File Selection Fails
**Problem**: Can't select contacts file

**Solutions**:
1. Make sure the file is a CSV file
2. Check file permissions
3. Try creating a new file
4. Use the template as a starting point

### Data Not Saving
**Problem**: Contacts not being saved to file

**Solutions**:
1. Check if file is selected
2. Verify file permissions
3. Check browser console for errors
4. Try refreshing the page

### Migration Issues
**Problem**: Existing contacts not migrated

**Solutions**:
1. Check localStorage for existing data
2. Manually export from localStorage
3. Import the exported data
4. Contact support if needed

## Security Considerations

### File Access
- Only files you explicitly select are accessed
- No automatic file system scanning
- User permission required for each file
- Secure context required (HTTPS/localhost)

### Data Privacy
- Contacts are stored locally on your device
- No data sent to external servers
- File contents are private to you
- Backup files are also local

## Future Enhancements

### Planned Features
- Cloud storage integration (Google Drive, Dropbox)
- Real-time collaboration
- Advanced search and filtering
- Bulk operations optimization
- API integration for external data sources

### Technical Improvements
- Better error handling
- Offline-first architecture
- Progressive Web App features
- Mobile app support

## Support

### Getting Help
1. Check browser compatibility
2. Verify file permissions
3. Check browser console for errors
4. Try the localStorage fallback
5. Contact support with error details

### Browser Console
Open browser DevTools (F12) and check:
- Console for error messages
- Network tab for file operations
- Application tab for localStorage data

### File Permissions
Ensure your browser has permission to:
- Read files from your computer
- Write files to your computer
- Access the file system

## Conclusion

The file storage system provides a robust, Git-friendly solution for contact management. Your contacts are now stored as actual files in your project directory, making them:

- **Version controlled** with Git
- **Portable** across devices
- **Backup-friendly** with automatic backups
- **Collaborative** for team projects
- **Reliable** with fallback options

This system ensures your contact data is always safe, accessible, and under your control. 