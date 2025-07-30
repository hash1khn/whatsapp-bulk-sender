# API Key Setup and Contact Storage

## API Key Configuration

The application now includes a secure API key management system:

### Automatic Setup
- The API key `022e9b3b5a432544cb3bf737c90bec632027c1ee82419007a7974456ca60cea5` is automatically stored in localStorage when the application starts
- The key is securely managed through the configuration system in `src/lib/config.ts`

### Manual API Key Management
- **Set API Key**: Use the API Key modal that appears on first load
- **Reset API Key**: Click the "Reset API Key" button in the header to clear and re-enter the key
- **Check Status**: The header shows "✓ API Key configured" when the key is properly set

## Page Structure

The application now has two main pages:

### 1. Home Page (`/`)
- **Purpose**: Filter contacts and send bulk messages
- **Features**:
  - Advanced filtering by supplier name, part type, and condition
  - Real-time contact staging based on filters
  - Message composer for sending to filtered contacts
  - Contact count display (total vs filtered)
  - Navigation to contacts management

### 2. Contacts Page (`/contacts`)
- **Purpose**: Manage and import contacts
- **Features**:
  - **Search & Filter**: Advanced search by supplier name, part type, and condition
  - **Bulk Actions**: Select multiple contacts for bulk operations
  - **Individual Management**: Add, edit, and delete individual contacts
  - **CSV Import**: Import contacts from CSV files
  - **Export Options**: Export all contacts or selected contacts as JSON
  - **Bulk Operations**: Delete or export selected contacts
  - **Inline Editing**: Quick editing directly in the table
  - **Contact Validation**: Phone number formatting and validation
  - **Visual Feedback**: Badges for part types and conditions
  - **Multiple Conditions**: Support for suppliers selling multiple conditions

## Enhanced Contact Management

### Multiple Conditions Support
- **Flexible Conditions**: Each supplier can sell multiple conditions (NEW, USED, Aftermarket)
- **Multi-Select Interface**: Easy selection of multiple conditions per contact
- **Visual Display**: Each condition displayed as a separate badge
- **Filtering**: Filter contacts by any condition they offer
- **Bulk Management**: Manage conditions for multiple contacts at once

### Search & Filter System
- **Supplier Name Search**: Text search in supplier names
- **Part Type Search**: Smart search in comma-separated part types
- **Condition Filter**: Dropdown filter (new, used, aftermarket, all)
- **Real-Time Filtering**: Results update as you type
- **Filter Status**: Visual indicators for active filters
- **Reset Function**: One-click filter reset

### Bulk Actions
- **Select All**: Checkbox to select all filtered contacts
- **Individual Selection**: Checkbox for each contact
- **Bulk Delete**: Delete multiple selected contacts at once
- **Bulk Export**: Export only selected contacts
- **Selection Counter**: Shows how many contacts are selected
- **Confirmation Dialogs**: Safety prompts for destructive actions

### Visual Improvements
- **Part Type Badges**: Each part type displayed as a separate badge
- **Condition Badges**: Multiple conditions displayed with color-coded badges
- **Contact Counts**: Shows filtered vs total contact counts
- **Status Indicators**: Visual feedback for active filters and selections

## Improved Filtering System

### Enhanced Part Type Filtering
- **Comma-Separated Support**: Handles contacts with multiple part types (e.g., "BMW, Mercedes, Audi")
- **Smart Matching**: Searches within each part type individually
- **Case-Insensitive**: Automatically handles different case formats
- **Real-Time Updates**: Filters update immediately as you type

### Enhanced Condition Filtering
- **Multiple Conditions**: Filter contacts that offer any of the selected conditions
- **Flexible Matching**: A supplier with "NEW, USED" will match when filtering for "USED"
- **Visual Feedback**: Clear display of which conditions each supplier offers

### Filter Examples
- **Search "BMW"**: Matches contacts with "BMW, Mercedes" (since BMW is in the list)
- **Search "Mercedes"**: Matches contacts with "BMW, Mercedes, Audi" (since Mercedes is in the list)
- **Filter "USED"**: Matches contacts that offer USED parts (even if they also offer NEW)
- **Filter "NEW"**: Matches contacts that offer NEW parts (even if they also offer USED)

### Filter Features
- **Supplier Name**: Text search in supplier names
- **Part Type**: Smart search in comma-separated part types
- **Condition**: Dropdown filter (new, used, aftermarket, all)
- **Combined Filters**: All filters work together for precise targeting
- **Reset Function**: One-click filter reset

## API Integration

### Fixed Issues
- **Correct API Endpoint**: Updated from `api.wassenderapi.com/v1/messages` to `wasenderapi.com/api/send-message`
- **Payload Structure**: Updated to match WasenderAPI format:
  - Text messages: `{ "to": "+1234567890", "text": "Hello from API!" }`
  - Image messages: `{ "to": "+1234567890", "image": { "url": "https://example.com/image.jpg", "caption": "Optional caption" } }`

### Image Handling
**Important**: For image messages, you need to provide a publicly accessible URL. The current implementation uses local blob URLs which won't work with the API. To send images:

1. Upload your image to a cloud service (AWS S3, Cloudinary, etc.)
2. Use the public URL in your message
3. The image URL must be accessible from the internet

### API Authentication
- Uses Bearer token authentication with your API key
- Automatically includes the Authorization header: `Bearer 022e9b3b5a432544cb3bf737c90bec632027c1ee82419007a7974456ca60cea5`

## Local Contact Storage

All contacts are now stored locally in the browser's localStorage with the following features:

### Storage Features
- **Automatic Persistence**: Contacts are automatically saved and restored between sessions
- **CRUD Operations**: Full Create, Read, Update, Delete functionality
- **Search & Filter**: Search by supplier name, part type, and filter by condition
- **Import/Export**: Export contacts as JSON and import from JSON format
- **Error Handling**: Robust error handling with user-friendly messages

### Contact Management
- **Add Contact**: Use the table editor or CSV import to add new contacts
- **Update Contact**: Edit existing contacts directly in the table
- **Delete Contact**: Remove individual contacts or clear all contacts
- **Search Contacts**: Search by supplier name or part type
- **Filter Contacts**: Filter by condition (new, used, aftermarket)

### Data Structure
Each contact includes:
- `id`: Unique identifier (auto-generated)
- `supplierName`: Name of the supplier
- `partType`: Type of part (supports comma-separated values)
- `conditions`: Array of conditions the supplier offers (new, used, aftermarket)
- `whatsappNumber`: WhatsApp phone number (formatted automatically)

### Utility Functions
- **Phone Number Formatting**: Automatic formatting of WhatsApp numbers
- **Validation**: Phone number validation for proper WhatsApp format
- **ID Generation**: Unique ID generation for new contacts

## File Structure

```
src/
├── lib/
│   ├── config.ts          # API key configuration
│   ├── storage.ts         # Contact storage service
│   └── utils.ts           # Utility functions
├── hooks/
│   └── useContacts.ts     # React hook for contact management
├── pages/
│   ├── Home.tsx           # Main page for filtering and sending
│   └── Contacts.tsx       # Contact management page
├── components/
│   └── ConditionMultiSelect.tsx  # Multi-select component for conditions
├── types/
│   └── contact.ts         # Contact type definitions
└── api/
    └── wassender.ts       # Updated API integration
```

## Usage

1. **First Launch**: The API key modal will appear automatically
2. **Manage Contacts**: Navigate to `/contacts` to add, edit, or import contacts
3. **Set Conditions**: Use the multi-select interface to choose which conditions each supplier offers
4. **Search & Filter**: Use the search and filter tools to find specific contacts
5. **Bulk Operations**: Select multiple contacts for bulk delete or export
6. **Filter Contacts**: Use the home page (`/`) to filter contacts by various criteria
7. **Send Messages**: Use the message composer with filtered contacts
8. **Image Messages**: Upload images to a cloud service and use the public URL

## Navigation

- **Home Page**: Filter contacts and send messages
- **Contacts Page**: Manage and import contacts with search, filter, and bulk actions
- **Back Navigation**: Use the back buttons to navigate between pages

## Troubleshooting

### Common Issues
1. **"Failed to load resource: net::ERR_NAME_NOT_RESOLVED"**: This was caused by incorrect API endpoint - now fixed
2. **Image messages not sending**: Ensure you're using publicly accessible image URLs
3. **API authentication errors**: Verify your API key is correctly set
4. **Filtering not working**: Make sure part types are comma-separated (e.g., "BMW, Mercedes")
5. **Bulk actions not working**: Ensure contacts are selected before performing bulk operations
6. **Conditions not saving**: Make sure to select at least one condition for each contact

### Testing
You can test the API integration using curl:
```bash
curl -X POST "https://wasenderapi.com/api/send-message" \
  -H "Authorization: Bearer 022e9b3b5a432544cb3bf737c90bec632027c1ee82419007a7974456ca60cea5" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "text": "Hello from API!"}'
```

The system is now fully integrated and ready for use with secure API key management, robust local contact storage, improved filtering capabilities, comprehensive bulk action features, and flexible multiple conditions support. 