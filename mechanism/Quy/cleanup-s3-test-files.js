/**
 * Script to clean up test files from S3 Long Vân
 * Usage: node cleanup-s3-test-files.js
 */

const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Read credentials from .env
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'M0PR2NYXN2BH0QM87P0W';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'hZDJi8M9wDOGMOBQB1oMDS0kzGpOXGHuyuivXv7e';
const region = process.env.AWS_REGION || 'hcm5-r1';
const endpoint = process.env.AWS_S3_ENDPOINT || 'https://s3-hcm5-r1.longvan.net';
const bucket = process.env.AWS_S3_BUCKET || '19429970-documents';

if (!accessKeyId || !secretAccessKey) {
  console.error('❌ Missing AWS credentials in .env file!');
  console.error('Required: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
  process.exit(1);
}

const s3Client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

/**
 * Delete a single file from S3
 */
async function deleteFile(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    await s3Client.send(command);
    console.log(`✅ Deleted: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete ${key}:`, error.message);
    return false;
  }
}

/**
 * List all files in a prefix
 */
async function listFiles(prefix) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    
    const response = await s3Client.send(command);
    return response.Contents || [];
  } catch (error) {
    console.error(`❌ Failed to list files with prefix ${prefix}:`, error.message);
    return [];
  }
}

/**
 * Delete all files in templates/ folder
 */
async function cleanupTemplates() {
  console.log('\n📁 Cleaning up templates/...');
  const files = await listFiles('templates/');
  
  if (files.length === 0) {
    console.log('No template files found.');
    return;
  }
  
  console.log(`Found ${files.length} template file(s)`);
  
  let deleted = 0;
  for (const file of files) {
    const success = await deleteFile(file.Key);
    if (success) deleted++;
  }
  
  console.log(`✅ Deleted ${deleted}/${files.length} template files`);
}

/**
 * Delete all files in submissions/ folder
 */
async function cleanupSubmissions() {
  console.log('\n📁 Cleaning up submissions/...');
  const files = await listFiles('submissions/');
  
  if (files.length === 0) {
    console.log('No submission files found.');
    return;
  }
  
  console.log(`Found ${files.length} submission file(s)`);
  
  let deleted = 0;
  for (const file of files) {
    const success = await deleteFile(file.Key);
    if (success) deleted++;
  }
  
  console.log(`✅ Deleted ${deleted}/${files.length} submission files`);
}

/**
 * Delete specific files by URL
 */
async function deleteByUrls(urls) {
  console.log('\n🗑️  Deleting specific files...');
  
  let deleted = 0;
  for (const url of urls) {
    // Extract key from URL
    // URL format: https://s3-hcm5-r1.longvan.net/bucket-name/path/to/file.docx
    const key = url.replace(`https://s3-hcm5-r1.longvan.net/${bucket}/`, '');
    
    const success = await deleteFile(key);
    if (success) deleted++;
  }
  
  console.log(`✅ Deleted ${deleted}/${urls.length} files`);
}

/**
 * Main function
 */
async function main() {
  console.log('🧹 S3 Cleanup Script');
  console.log('=====================');
  console.log(`Bucket: ${bucket}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Region: ${region}`);
  console.log(`Access Key: ${accessKeyId.substring(0, 10)}...`);
  console.log('');
  
  // Option 1: Delete all test files
  const deleteAll = process.argv.includes('--all');
  
  // Option 2: Delete specific URLs from command line
  const urlIndex = process.argv.indexOf('--url');
  const hasUrls = urlIndex !== -1;
  
  if (hasUrls) {
    // Delete specific URLs
    const urls = process.argv.slice(urlIndex + 1);
    await deleteByUrls(urls);
  } else if (deleteAll) {
    // Delete all templates and submissions
    await cleanupTemplates();
    await cleanupSubmissions();
  } else {
    // Show usage
    console.log('\nUsage:');
    console.log('  node cleanup-s3-test-files.js --all                    # Delete all templates & submissions');
    console.log('  node cleanup-s3-test-files.js --url <url1> <url2> ...  # Delete specific files');
    console.log('\nExamples:');
    console.log('  node cleanup-s3-test-files.js --all');
    console.log('  node cleanup-s3-test-files.js --url https://s3-hcm5-r1.longvan.net/19429970-documents/templates/...');
    
    // Preview what would be deleted
    console.log('\n📊 Preview (no files deleted):');
    const templates = await listFiles('templates/');
    const submissions = await listFiles('submissions/');
    
    console.log(`\nTemplates: ${templates.length} file(s)`);
    templates.slice(0, 5).forEach(f => console.log(`  - ${f.Key} (${f.Size} bytes)`));
    if (templates.length > 5) console.log(`  ... and ${templates.length - 5} more`);
    
    console.log(`\nSubmissions: ${submissions.length} file(s)`);
    submissions.slice(0, 5).forEach(f => console.log(`  - ${f.Key} (${f.Size} bytes)`));
    if (submissions.length > 5) console.log(`  ... and ${submissions.length - 5} more`);
    
    console.log('\n💡 Run with --all to delete these files');
  }
  
  console.log('\n✅ Done!');
}

// Run
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
