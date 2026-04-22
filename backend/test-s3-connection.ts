// Script test S3 connection với Longvan endpoint
// Run: npx ts-node test-s3-connection.ts

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function testS3Connection() {
    const config = {
        region: 'ap-southeast-1',
        credentials: {
            accessKeyId: 'M0PR2NYXN2BH0QM87P0W',
            secretAccessKey: 'YOUR_SECRET_KEY_HERE',
        },
        endpoint: 'https://s3-hcm5-r1.longvan.net',
        forcePathStyle: true,
    };

    console.log('Testing S3 connection with config:', {
        ...config,
        credentials: {
            accessKeyId: config.credentials.accessKeyId.substring(0, 10) + '...',
            secretAccessKey: '***'
        }
    });

    const s3Client = new S3Client(config);

    try {
        const command = new ListObjectsV2Command({
            Bucket: '19429970-documents',
            MaxKeys: 10,
        });

        console.log('Sending ListObjectsV2 command...');
        const response = await s3Client.send(command);

        console.log('✅ Success! S3 Response:', {
            objectCount: response.Contents?.length || 0,
            isTruncated: response.IsTruncated,
            keyCount: response.KeyCount,
        });

        if (response.Contents && response.Contents.length > 0) {
            console.log('\nFirst 5 objects:');
            response.Contents.slice(0, 5).forEach((obj, idx) => {
                console.log(`${idx + 1}. ${obj.Key} (${obj.Size} bytes)`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', {
            message: error.message,
            name: error.name,
            code: error.code,
            statusCode: error.$metadata?.httpStatusCode,
            requestId: error.$metadata?.requestId,
        });
    }
}

testS3Connection();
