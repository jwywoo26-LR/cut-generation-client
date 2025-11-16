# Python vs TypeScript: Key Differences Explained

## Core Workflow Comparison

### Python Script Workflow (Your Original)
```
┌─────────────────┐
│ Local Directory │ (scan filesystem)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Generate CSV   │ (track all files)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload to S3   │ (boto3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mosaic Process  │ (API)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Download Result │ (save to disk)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Update CSV    │ (track results)
└─────────────────┘
```

### TypeScript/Next.js Workflow (Current)
```
┌─────────────────┐
│ Browser Upload  │ (user selects files)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Upload to S3   │ (@aws-sdk/client-s3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mosaic Process  │ (API)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to Airtable│ (instead of CSV)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return JSON     │ (browser display)
└─────────────────┘
```

## Major Differences

### 1. File System Access

| Python | TypeScript/Next.js |
|--------|-------------------|
| ✅ Can scan directories | ❌ No filesystem access (browser security) |
| ✅ Can save files to disk | ❌ Can't write to user's disk |
| `os.listdir()`, `glob.glob()` | User must select via `<input type="file">` |
| Save: `with open(path, 'wb')` | Display: `<img src={url}>` |

**Why:** Web browsers can't access the user's file system for security reasons.

### 2. Data Tracking

| Python | TypeScript/Next.js |
|--------|-------------------|
| **CSV Files** | **Airtable** |
| Stores on local disk | Stores in cloud database |
| `pandas`, `csv` module | REST API calls |
| Easy to edit in Excel | Easy to view in Airtable UI |

**Python CSV structure:**
```csv
index,before_local_path,before_s3_url,after_segmentation,after_s3_url,mask_ratio,status
1,./inputs/img1.jpg,https://s3.../img1.jpg,./outputs/img1_masked.png,s3://.../masked.png,15.5,completed
```

**TypeScript Airtable equivalent:**
```javascript
{
  request_id: "task-123",
  filename: "img1.jpg",
  before_s3_url: "https://s3.../img1.jpg",
  after_s3_url: "s3://.../masked.png",
  mask_ratio: 15.5,
  status: "completed"
}
```

### 3. Image Display

| Python | TypeScript/Next.js |
|--------|-------------------|
| **Not needed** (saves to disk) | **Required** (must display in browser) |
| User opens file locally | Browser shows `<img>` tag |
| - | Needs public URL or data URL |

## Your Question: "Why not just save S3 URL to Airtable?"

### Original Approach (Downloads & Re-uploads)
```typescript
// Step 1: Download from S3
buffer = await downloadImageFromS3(s3Uri)

// Step 2: Upload to Airtable with image data
await uploadToAirtable(buffer, taskId)
  → Returns: "https://dl.airtable.com/xxx" (public CDN URL)

// Step 3: Display in browser
<img src="https://dl.airtable.com/xxx"> ✅ Works!
```

**Pros:**
- ✅ Images display immediately in UI
- ✅ No AWS credentials needed for viewing
- ✅ Public CDN URL works everywhere

**Cons:**
- ❌ Slower (downloads then re-uploads)
- ❌ Uses more bandwidth
- ❌ Duplicates images (stored in both S3 and Airtable)

### New Approach (Just Save S3 URL) - **Now Implemented!**
```typescript
// Step 1: Just save the S3 URL to Airtable
await saveMetadataToAirtable(taskId, beforeS3Url, afterS3Url, maskRatio)

// Step 2: Return S3 URL
afterS3Url = "s3://bucket/result.png"

// Step 3: Can't display directly in browser
<img src="s3://bucket/result.png"> ❌ Doesn't work
```

**Pros:**
- ✅ Much faster (no download/upload)
- ✅ Saves bandwidth
- ✅ No duplication (image stays in S3)
- ✅ Matches Python CSV approach exactly

**Cons:**
- ❌ Can't display in browser UI
- ❌ User must download manually or use AWS console

## Which Approach to Use?

### Use Option 1 (saveMetadataToAirtable) if:
- ✅ You want it to work like Python script
- ✅ You'll access images via AWS Console or download them
- ✅ You want Airtable as a tracking database (like CSV)
- ✅ Speed is important

### Use Option 2 (uploadToAirtable) if:
- ✅ You want images to display in the web UI
- ✅ You want to share results with others (no AWS needed)
- ✅ You want a gallery view

## How to Switch Between Approaches

In [batch-mosaic-process/route.ts](src/app/api/batch-mosaic-process/route.ts):

```typescript
if (s3Uri) {
  try {
    // OPTION 1: Just save metadata (like Python CSV) - CURRENTLY ACTIVE
    console.log('📝 Saving metadata to Airtable...');
    await saveMetadataToAirtable(taskId, beforeS3Url, s3Uri, maskRatio, filename);
    afterS3Url = s3Uri; // Return S3 URL as-is

    // OPTION 2: Download and upload to Airtable CDN (for display)
    // console.log('📤 Uploading to Airtable for public access...');
    // const airtableUrl = await uploadToAirtable(s3Uri, taskId, beforeS3Url);
    // afterS3Url = airtableUrl; // Return public CDN URL

    // OPTION 3: Convert S3 URI to HTTP URL
    // afterS3Url = convertS3UriToHttpUrl(s3Uri);
    // afterS3Url = "https://bucket.s3.region.amazonaws.com/key"
  }
}
```

## Viewing Results

### With Option 1 (Current - Save S3 URL):

**View in Airtable:**
1. Go to https://airtable.com
2. Open base: `appaU43DzeDJsAEMW`
3. Table: `mosic_table`
4. See all records with S3 URLs

**Download image:**
```bash
# Using AWS CLI
aws s3 cp s3://bucket/path/image.png ./local/path.png

# Or use AWS Console
# Go to S3 bucket and download manually
```

**Display in web UI:**
- Won't work automatically
- Need to convert S3 URL to HTTP or download separately

### With Option 2 (Download & Upload):

**View anywhere:**
- Web UI shows images immediately
- Airtable shows images in attachments
- Can share URL with anyone (no AWS needed)

## Summary

| Feature | Python Script | TypeScript (Option 1) | TypeScript (Option 2) |
|---------|--------------|----------------------|----------------------|
| Tracks metadata | CSV file | Airtable | Airtable |
| Stores images | Local disk | S3 only | S3 + Airtable |
| Speed | Fast | Fast | Slower |
| Web display | N/A | ❌ | ✅ |
| Bandwidth | Low | Low | High |
| Similarity to Python | 100% | 95% | 70% |

**Currently implemented: Option 1** (matches your Python workflow)

To switch to Option 2, uncomment the `uploadToAirtable()` lines in the code!
