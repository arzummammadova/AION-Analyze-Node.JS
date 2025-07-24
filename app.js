import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/', (req, res) => {
    res.send(`Hello from AION Analyze API!`);
});

app.post('/analyze', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'Fayl tapılmadı.' });
    }

    const fileBuffer = req.file.buffer;
    const originalname = req.file.originalname;
    const mimetype = req.file.mimetype;
    
    const question = req.body.question; 

    console.log(`Node.js: Fayl qəbul edildi: ${originalname}, Tipi: ${mimetype}`);
    console.log(`Node.js: Sual: ${question || 'Sual yoxdur'}`);

    try {
        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: originalname,
            contentType: mimetype,
        });
        
        if (question) {
            formData.append('question', question);
        }

        const headers = formData.getHeaders();
        console.log('Node.js: FastAPI-yə göndərilən FormData headers:', headers);

        const fastapiResponse = await axios.post(`${FASTAPI_URL}/analyze_document`, formData, {
            headers: headers, 
            maxBodyLength: Infinity, 
            maxContentLength: Infinity, 
        });

        console.log('Node.js: FastAPI-dən cavab alındı:');
        console.log(fastapiResponse.data);

        res.status(fastapiResponse.status).json(fastapiResponse.data);

    } catch (error) {
        console.error('Node.js: FastAPI ilə əlaqə zamanı xəta:', error.message);
        if (error.response) {
            console.error('Node.js: FastAPI cavab xətası (data):', error.response.data);
            console.error('Node.js: FastAPI cavab xətası (status):', error.response.status);
            return res.status(error.response.status).json({ 
                status: 'error', 
                message: error.response.data.detail || 'Fayl analizi zamanı xəta baş verdi (FastAPI tərəfdə).',
                error: error.response.data.detail || error.message
            });
        } else if (error.request) {
            console.error('Node.js: FastAPI-dən cavab alınmadı. Server işləyir?');
            return res.status(500).json({
                status: 'error',
                message: 'AI xidmətinə qoşulmaq mümkün olmadı. Zəhmət olmasa, AI serverinin işlədiyindən əmin olun.',
                error: error.message
            });
        } else {
            return res.status(500).json({ 
                status: 'error', 
                message: 'Daxili server xətası.',
                error: error.message
            });
        }
    }
});

app.listen(port, () => {
    console.log(`Node.js backend ${port} portunda işləyir.`);
});