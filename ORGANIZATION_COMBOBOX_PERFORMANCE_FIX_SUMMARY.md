# Quick Fix: Organization Combobox Performance

## 🎯 **10-Minute Fix for 7-13x Speed Improvement**

Current: **1321ms lag** ❌  
Target: **<100ms** ✅

---

## 📝 Code Changes

### **Step 1: Add Debounce + Limit (Copy-Paste)**

```typescript
// File: frontend/src/features/users/components/OrganizationCombobox.tsx
// Add after line 37 (after const [searchTerm, setSearchTerm] = useState('');)

const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

// Debounce search (300ms delay)
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
```

### **Step 2: Update filteredOrganizations (Replace)**

Find this line (~line 42):
```typescript
const filteredOrganizations = (() => {
```

Replace the ENTIRE `filteredOrganizations` function with:

```typescript
const filteredOrganizations = useMemo(() => {
  const MAX_RESULTS = 50; // Limit to 50 items

  if (!debouncedSearchTerm.trim()) {
    // No search - show first 50
    return organizations.slice(0, MAX_RESULTS);
  }

  const searchLower = debouncedSearchTerm.toLowerCase().trim();
  const searchWords = searchLower.split(/\s+/);

  // Calculate scores
  const scoredOrgs = organizations.map(org => {
    const nameLower = org.name.toLowerCase();
    const parentName = org.parent?.name?.toLowerCase() || '';
    let score = 0;

    // Exact match
    if (nameLower === searchLower) score += 1000;

    // Starts with
    if (nameLower.startsWith(searchLower)) score += 500;

    // Word matching
    const matchedWords = searchWords.filter(word =>
      nameLower.includes(word) || parentName.includes(word)
    );
    const wordMatchRatio = matchedWords.length / searchWords.length;

    if (wordMatchRatio < 0.6) return { org, score: -1 };

    score += wordMatchRatio * 100;

    // Sequence bonus
    if (searchWords.every(word =>
      nameLower.includes(word) || parentName.includes(word)
    )) {
      score += 50;
    }

    // Length penalty
    const lengthDiff = Math.abs(nameLower.length - searchLower.length);
    score -= lengthDiff * 0.5;

    return { org, score };
  });

  // Filter + sort + LIMIT
  return scoredOrgs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS) // 🆕 LIMIT HERE!
    .map(item => item.org);
}, [organizations, debouncedSearchTerm]); // 🆕 Use debounced + useMemo

// Total matches (for hint)
const totalMatches = useMemo(() => {
  if (!debouncedSearchTerm.trim()) return organizations.length;

  const searchLower = debouncedSearchTerm.toLowerCase();
  return organizations.filter(org =>
    org.name.toLowerCase().includes(searchLower) ||
    org.code?.toLowerCase().includes(searchLower)
  ).length;
}, [organizations, debouncedSearchTerm]);
```

### **Step 3: Add "More Results" Hint**

In the dropdown render (after the "None" option, before filteredOrganizations.map):

```typescript
{/* Show hint if results are limited */}
{debouncedSearchTerm && filteredOrganizations.length < totalMatches && (
  <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
    ⚠️ Showing {filteredOrganizations.length} of {totalMatches} results. Type more to narrow down...
  </div>
)}
```

---

## ✅ Expected Results

**Before:**
- Click combobox: 1321ms ❌
- Type search: 702ms per keystroke ❌
- UI feels frozen

**After:**
- Click combobox: 100-150ms ✅ (9-13x faster!)
- Type search: 300ms delay, then 50ms ✅ (feels smooth!)
- UI responsive

---

## 🧪 Test It

1. Save files
2. Refresh browser
3. Open CreateUserModal
4. Click organization combobox
5. Type "Khoa" fast
6. Check Chrome DevTools Performance tab

Should see:
- ✅ Click handler < 150ms
- ✅ Input handler < 50ms
- ✅ Smooth typing (no lag)

---

**Time:** 10 minutes  
**Gain:** 7-13x faster  
**Risk:** Low (only limits visible results)
