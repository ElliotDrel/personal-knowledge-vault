# Sharing Feature Control

## 🎛️ **Feature Status: DISABLED**

The sharing feature is currently **disabled** by default while in development. All sharing code is preserved and can be easily re-enabled.

## 🔧 **How to Enable/Disable Sharing**

### **Method 1: Environment Variable (Recommended)**
```bash
# Enable sharing
VITE_ENABLE_SHARING=true

# Disable sharing (default)
VITE_ENABLE_SHARING=false
```

### **Method 2: Direct Configuration**
Edit `src/config/features.ts`:
```typescript
export const featureFlags: FeatureFlags = {
  enableSharing: true,  // Change to true to enable
  // ... other features
};
```

## 🚀 **What Happens When Enabled**

- ✅ Share button appears on resource detail pages
- ✅ ShareDialog becomes functional
- ✅ Full sharing workflow is available
- ✅ Database operations work normally

## 🔒 **What Happens When Disabled (Current State)**

- ❌ Share button is hidden from UI
- ❌ ShareDialog is not rendered
- ❌ Sharing methods return clear error messages
- ✅ All other features work normally
- ✅ No performance impact from sharing code

## 📁 **Sharing Code Location**

All sharing functionality is preserved in:
- `src/components/sharing/` - UI components
- `src/services/email/` - Email service layer (in development)
- `src/data/storageAdapter.ts` - Sharing methods
- `src/data/supabaseStorage.ts` - Database operations
- `supabase/migrations/` - Database schema

## 🛠️ **Technical Implementation**

The feature flag system:
1. **UI Level**: Conditionally renders sharing components
2. **Service Level**: Validates feature status before operations
3. **Storage Level**: Returns appropriate error messages when disabled
4. **Zero Impact**: No performance penalty when disabled

## 🔄 **Quick Enable for Testing**

```bash
# In .env.local or .env
VITE_ENABLE_SHARING=true

# Restart development server
npm run dev
```

The sharing feature will be immediately available without any code changes.