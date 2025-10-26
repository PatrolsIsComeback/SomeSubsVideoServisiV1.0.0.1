import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.DB_NAME);
  }
  return db;
}

// Upload to Filemoon
async function uploadToFilemoon(fileBuffer, fileName) {
  try {
    const formData = new FormData();
    formData.append('api_key', process.env.FILEMOON_API_KEY);
    formData.append('file', fileBuffer, fileName);

    const response = await axios.post('https://filemoon.sx/api/upload/server', formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000,
    });

    console.log('Filemoon API Response:', JSON.stringify(response.data, null, 2));

    // Filemoon returns: { result: "upload_url", status: 200, msg: "OK" }
    if (response.data && response.data.status === 200 && response.data.result) {
      return {
        success: true,
        file_url: response.data.result,
        service: 'filemoon'
      };
    }
    
    throw new Error('Invalid response from Filemoon');
  } catch (error) {
    console.error('Filemoon upload error:', error.response?.data || error.message);
    return {
      success: false,
      service: 'filemoon',
      error: error.response?.data?.message || error.message
    };
  }
}

// Upload to Voe.sx
async function uploadToVoe(fileBuffer, fileName) {
  try {
    // Step 1: Get upload server URL
    const serverResponse = await axios.get('https://voe.sx/api/upload/server', {
      params: {
        key: process.env.VOE_API_KEY
      },
      timeout: 10000,
    });

    console.log('Voe.sx Server Response:', JSON.stringify(serverResponse.data, null, 2));

    if (!serverResponse.data || !serverResponse.data.result) {
      throw new Error('Failed to get upload server URL from Voe.sx');
    }

    const uploadUrl = serverResponse.data.result;

    // Step 2: Upload file to the server
    const formData = new FormData();
    formData.append('key', process.env.VOE_API_KEY);  // Changed from api_key to key
    formData.append('file', fileBuffer, fileName);

    const uploadResponse = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000,
    });

    console.log('Voe.sx Upload Response:', JSON.stringify(uploadResponse.data, null, 2));

    // Check various response formats
    if (uploadResponse.data && uploadResponse.data.status === 200) {
      const fileUrl = uploadResponse.data.result || uploadResponse.data.file_url || uploadResponse.data.url;
      if (fileUrl) {
        return {
          success: true,
          file_url: fileUrl,
          service: 'voe'
        };
      }
    }
    
    throw new Error('Invalid response from Voe.sx');
  } catch (error) {
    console.error('Voe.sx upload error:', error.response?.data || error.message);
    return {
      success: false,
      service: 'voe',
      error: error.response?.data?.message || error.message
    };
  }
}

// Save upload history to MongoDB
async function saveUploadHistory(data) {
  try {
    const database = await connectDB();
    const collection = database.collection('upload_history');
    
    const uploadRecord = {
      id: uuidv4(),
      fileName: data.fileName,
      fileSize: data.fileSize,
      uploadDate: new Date(),
      services: data.services,
      results: data.results,
    };
    
    await collection.insertOne(uploadRecord);
    return uploadRecord;
  } catch (error) {
    console.error('Error saving upload history:', error);
    throw error;
  }
}

export async function POST(req, { params }) {
  const pathname = params?.path ? '/' + params.path.join('/') : '/';

  try {
    if (pathname === '/upload') {
      const formData = await req.formData();
      const file = formData.get('file');
      const servicesString = formData.get('services');

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const selectedServices = servicesString ? servicesString.split(',').filter(s => s) : [];

      if (selectedServices.length === 0) {
        return NextResponse.json({ error: 'No service selected' }, { status: 400 });
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Upload to selected services in parallel
      const uploadPromises = [];
      
      if (selectedServices.includes('filemoon')) {
        uploadPromises.push(uploadToFilemoon(buffer, file.name));
      }
      
      if (selectedServices.includes('voe')) {
        uploadPromises.push(uploadToVoe(buffer, file.name));
      }

      const results = await Promise.all(uploadPromises);

      // Save to upload history
      const uploadRecord = await saveUploadHistory({
        fileName: file.name,
        fileSize: file.size,
        services: selectedServices,
        results
      });

      return NextResponse.json({
        success: true,
        results,
        uploadRecord
      });
    }

    if (pathname === '/history') {
      const database = await connectDB();
      const collection = database.collection('upload_history');
      
      const history = await collection
        .find({})
        .sort({ uploadDate: -1 })
        .limit(50)
        .toArray();
      
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  const pathname = params?.path ? '/' + params.path.join('/') : '/';

  try {
    if (pathname === '/history') {
      const database = await connectDB();
      const collection = database.collection('upload_history');
      
      const history = await collection
        .find({})
        .sort({ uploadDate: -1 })
        .limit(50)
        .toArray();
      
      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
